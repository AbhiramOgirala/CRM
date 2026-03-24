const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { generateToken } = require('../middleware/auth');

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, phone, state_id, district_id, corporation_id, municipality_id, taluka_id, mandal_id, gram_panchayat_id, address, pincode, preferred_language = 'en' } = req.body;
    if (!email || !password || !full_name) return res.status(400).json({ error: 'Email, password and full name are required' });

    const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Email already registered. Please login.' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from('users').insert({
      email: email.toLowerCase().trim(), password_hash: hashedPassword,
      full_name: full_name.trim(), phone: phone || null, role: 'citizen',
      state_id: state_id || null, district_id: district_id || null,
      corporation_id: corporation_id || null, municipality_id: municipality_id || null,
      taluka_id: taluka_id || null, mandal_id: mandal_id || null,
      gram_panchayat_id: gram_panchayat_id || null,
      address: address || null, pincode: pincode || null,
      preferred_language, is_active: true, points: 0, badge_level: 'newcomer'
    }).select('id, email, full_name, role, points, badge_level').single();

    if (error) { console.error('Register error:', error); return res.status(500).json({ error: 'Registration failed. Please try again.' }); }

    // Init leaderboard (ignore errors)
    supabase.from('citizen_leaderboard').insert({ user_id: user.id, points: 0, badge: 'newcomer', total_complaints: 0 }).then(() => {}).catch(() => {});

    const token = generateToken(user.id, user.role);
    return res.status(201).json({ message: 'Registration successful', user, token });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const { data: user, error } = await supabase.from('users')
      .select('id, email, full_name, role, phone, avatar_url, password_hash, is_active, points, badge_level, govt_points, govt_badge, complaints_resolved, department_id, preferred_language, state_id, district_id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) { console.error('Login DB error:', error); return res.status(500).json({ error: 'Login failed. Please try again.' }); }
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated. Contact your administrator.' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    // Fetch department separately (avoids join syntax issues with Supabase)
    let department = null;
    if (user.department_id) {
      const { data: dept } = await supabase.from('departments').select('id, name, code').eq('id', user.department_id).maybeSingle();
      department = dept;
    }

    supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id).then(() => {}).catch(() => {});

    const token = generateToken(user.id, user.role, user.department_id);
    const safeUser = {
      id: user.id, email: user.email, full_name: user.full_name, role: user.role,
      phone: user.phone, avatar_url: user.avatar_url,
      points: user.points || 0, badge_level: user.badge_level || 'newcomer',
      govt_points: user.govt_points || 0, govt_badge: user.govt_badge || 'new_officer',
      complaints_resolved: user.complaints_resolved || 0,
      department_id: user.department_id, departments: department,
      state_id: user.state_id, district_id: user.district_id,
      preferred_language: user.preferred_language || 'en'
    };
    return res.json({ message: 'Login successful', user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { data: user, error } = await supabase.from('users')
      .select('id, email, full_name, phone, role, avatar_url, points, badge_level, govt_points, govt_badge, complaints_resolved, department_id, employee_id, preferred_language, is_verified, created_at, state_id, district_id, address, pincode')
      .eq('id', req.user.id).maybeSingle();
    if (error || !user) return res.status(404).json({ error: 'User not found' });

    let department = null, stateName = null, districtName = null;
    if (user.department_id) { const { data } = await supabase.from('departments').select('name, code').eq('id', user.department_id).maybeSingle(); department = data; }
    if (user.state_id) { const { data } = await supabase.from('states').select('name').eq('id', user.state_id).maybeSingle(); stateName = data?.name; }
    if (user.district_id) { const { data } = await supabase.from('districts').select('name').eq('id', user.district_id).maybeSingle(); districtName = data?.name; }

    return res.json({ user: { ...user, departments: department, state_name: stateName, district_name: districtName } });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone, address, pincode, state_id, district_id, corporation_id, municipality_id, taluka_id, mandal_id, gram_panchayat_id, preferred_language } = req.body;
    const { data: updated, error } = await supabase.from('users')
      .update({ full_name, phone, address, pincode, state_id: state_id || null, district_id: district_id || null, corporation_id, municipality_id, taluka_id, mandal_id, gram_panchayat_id, preferred_language })
      .eq('id', req.user.id)
      .select('id, email, full_name, phone, role, points, badge_level, govt_points, govt_badge, state_id, district_id, preferred_language')
      .single();
    if (error) {
      console.error('updateProfile DB error:', error);
      return res.status(500).json({ error: 'Update failed', detail: error.message });
    }

    // Fetch state/district names for the response
    let stateName = null, districtName = null;
    if (updated.state_id) { const { data } = await supabase.from('states').select('name').eq('id', updated.state_id).maybeSingle(); stateName = data?.name; }
    if (updated.district_id) { const { data } = await supabase.from('districts').select('name').eq('id', updated.district_id).maybeSingle(); districtName = data?.name; }

    return res.json({ message: 'Profile updated', user: { ...updated, state_name: stateName, district_name: districtName } });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Minimum 6 characters required' });
    const { data: user } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash: newHash }).eq('id', req.user.id);
    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

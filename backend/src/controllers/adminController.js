'use strict';
const bcrypt = require('bcryptjs');
const { supabase } = require('../config/supabase');
const { generateToken } = require('../middleware/auth');

// ── Get all users ─────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page=1, limit=20, is_active } = req.query;
    const offset = (parseInt(page)-1)*parseInt(limit);
    let q = supabase.from('users').select(`
      id,email,full_name,phone,role,is_active,is_verified,
      points,badge_level,govt_points,govt_badge,complaints_resolved,
      department_id,employee_id,created_at,last_login,
      departments:department_id(name,code),
      states:state_id(name), districts:district_id(name)
    `,{count:'exact'});
    if (role) q=q.eq('role',role);
    if (is_active!==undefined) q=q.eq('is_active',is_active==='true');
    if (search) q=q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error, count } = await q.order('created_at',{ascending:false}).range(offset,offset+parseInt(limit)-1);
    if (error) return res.status(500).json({ error:'Failed to fetch users' });
    return res.json({ users:data||[], pagination:{ page:parseInt(page), limit:parseInt(limit), total:count||0 } });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Create officer account (by admin) ────────────────────────────────────────
exports.createOfficer = async (req, res) => {
  try {
    const { email, password, full_name, phone, department_id, employee_id, state_id, district_id } = req.body;
    if (!email||!password||!full_name||!department_id) return res.status(400).json({ error:'Email, password, name and department are required' });
    const { data: ex } = await supabase.from('users').select('id').eq('email',email.toLowerCase()).single();
    if (ex) return res.status(409).json({ error:'Email already registered' });
    const hash = await bcrypt.hash(password, 12);
    const { data: officer, error } = await supabase.from('users').insert({
      email:email.toLowerCase(), password_hash:hash, full_name, phone, role:'officer',
      department_id, employee_id:employee_id||null, state_id:state_id||null, district_id:district_id||null,
      is_active:true, is_verified:true
    }).select('id,email,full_name,role,department_id').single();
    if (error) return res.status(500).json({ error:'Failed to create officer account' });
    return res.status(201).json({ message:'Officer account created', officer });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Self-registration for govt officer (with verification code) ──────────────
exports.registerOfficer = async (req, res) => {
  try {
    const { email, password, full_name, phone, department_id, employee_id, state_id, district_id, verification_code } = req.body;
    if (!email||!password||!full_name||!department_id) return res.status(400).json({ error:'All fields required' });

    // Simple verification: check employee_id exists in DB or use a fixed code
    // In production replace with proper govt employee verification
    const GOVT_REG_CODE = process.env.GOVT_REG_CODE || 'GOVT2024';
    if (verification_code !== GOVT_REG_CODE) {
      return res.status(403).json({ error:'Invalid government registration code. Contact your department admin.' });
    }

    const { data: ex } = await supabase.from('users').select('id').eq('email',email.toLowerCase()).single();
    if (ex) return res.status(409).json({ error:'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { data: officer, error } = await supabase.from('users').insert({
      email:email.toLowerCase(), password_hash:hash, full_name, phone, role:'officer',
      department_id, employee_id:employee_id||null, state_id:state_id||null, district_id:district_id||null,
      is_active:false, is_verified:false  // needs admin approval
    }).select('id,email,full_name,role').single();

    if (error) return res.status(500).json({ error:'Registration failed' });

    // Notify admins to approve
    const { data: admins } = await supabase.from('users').select('id').in('role',['admin','super_admin']).eq('is_active',true).limit(5);
    if (admins?.length) {
      await supabase.from('notifications').insert(admins.map(a=>({
        user_id:a.id, type:'info',
        title:'🏛️ New Officer Registration Pending',
        message:`${full_name} from employee ID ${employee_id||'N/A'} has registered. Please review and activate their account.`
      })));
    }

    return res.status(201).json({ message:'Registration submitted. Your account will be activated after admin verification.', officer });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Toggle user active/inactive ──────────────────────────────────────────────
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: u } = await supabase.from('users').select('is_active,full_name').eq('id',id).single();
    if (!u) return res.status(404).json({ error:'User not found' });
    await supabase.from('users').update({ is_active:!u.is_active }).eq('id',id);
    return res.json({ message:`${u.full_name} ${u.is_active?'deactivated':'activated'}`, is_active:!u.is_active });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Assign officer to department ─────────────────────────────────────────────
exports.assignOfficerDept = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_id } = req.body;
    await supabase.from('users').update({ department_id }).eq('id',id).eq('role','officer');
    return res.json({ message:'Department assigned' });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Get departments ──────────────────────────────────────────────────────────
exports.getDepartments = async (_req, res) => {
  try {
    const { data } = await supabase.from('departments').select('*').order('name');
    return res.json({ departments:data||[] });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── System stats ─────────────────────────────────────────────────────────────
exports.getSystemStats = async (_req, res) => {
  try {
    const [citizens,officers,complaints,resolved] = await Promise.all([
      supabase.from('users').select('*',{count:'exact',head:true}).eq('role','citizen'),
      supabase.from('users').select('*',{count:'exact',head:true}).eq('role','officer'),
      supabase.from('complaints').select('*',{count:'exact',head:true}),
      supabase.from('complaints').select('*',{count:'exact',head:true}).eq('status','resolved')
    ]);
    return res.json({ citizens:citizens.count||0, officers:officers.count||0, totalComplaints:complaints.count||0, resolved:resolved.count||0 });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

// ── Get escalated complaints ─────────────────────────────────────────────────
exports.getEscalated = async (_req, res) => {
  try {
    const { data } = await supabase.from('complaints').select(`
      id,ticket_number,title,category,priority,status,escalation_level,escalated_to,escalated_at,sla_deadline,created_at,
      departments:department_id(name,code), districts:district_id(name)
    `).eq('status','escalated').order('escalation_level',{ascending:false}).order('created_at',{ascending:true}).limit(50);
    return res.json({ complaints:data||[] });
  } catch (err) { return res.status(500).json({ error:'Internal server error' }); }
};

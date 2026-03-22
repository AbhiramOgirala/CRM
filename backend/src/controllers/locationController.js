const { supabase } = require('../config/supabase');
const { getCitizenLeaderboard, getDeptLeaderboard, getOfficerLeaderboard } = require('../services/gamificationService');

// ── LOCATION ──────────────────────────────────────────────────────
exports.getStates = async (_req, res) => {
  const { data, error } = await supabase.from('states').select('*').order('name');
  if (error) return res.status(500).json({ error: 'Failed to fetch states' });
  return res.json({ states: data || [] });
};
exports.getDistricts = async (req, res) => {
  const { data } = await supabase.from('districts').select('*').eq('state_id', req.params.state_id).order('name');
  return res.json({ districts: data || [] });
};
exports.getCorporations = async (req, res) => {
  const { data } = await supabase.from('corporations').select('*').eq('district_id', req.params.district_id).order('name');
  return res.json({ corporations: data || [] });
};
exports.getMunicipalities = async (req, res) => {
  const { data } = await supabase.from('municipalities').select('*').eq('district_id', req.params.district_id).order('name');
  return res.json({ municipalities: data || [] });
};
exports.getTalukas = async (req, res) => {
  const { data } = await supabase.from('talukas').select('*').eq('district_id', req.params.district_id).order('name');
  return res.json({ talukas: data || [] });
};
exports.getMandals = async (req, res) => {
  const { data } = await supabase.from('mandals').select('*').eq('taluka_id', req.params.taluka_id).order('name');
  return res.json({ mandals: data || [] });
};
exports.getGramPanchayats = async (req, res) => {
  const { data } = await supabase.from('gram_panchayats').select('*').eq('mandal_id', req.params.mandal_id).order('name');
  return res.json({ gram_panchayats: data || [] });
};

// ── LEADERBOARD ───────────────────────────────────────────────────
exports.getCitizenLeaderboard = async (req, res) => {
  try {
    const data = await getCitizenLeaderboard(parseInt(req.query.limit) || 20);
    return res.json({ leaderboard: data });
  } catch { return res.status(500).json({ error: 'Internal server error' }); }
};
exports.getDeptLeaderboard = async (_req, res) => {
  try {
    const data = await getDeptLeaderboard(20);
    return res.json({ leaderboard: data });
  } catch { return res.status(500).json({ error: 'Internal server error' }); }
};
exports.getOfficerLeaderboard = async (req, res) => {
  try {
    const data = await getOfficerLeaderboard(req.query.department_id, 20);
    return res.json({ leaderboard: data });
  } catch { return res.status(500).json({ error: 'Internal server error' }); }
};

// Area-level leaderboard (Mandal/locality wise)
exports.getAreaLeaderboard = async (req, res) => {
  try {
    const { district_id, state_id } = req.query;
    let query = supabase.from('complaints').select('mandal_id, district_id, status').eq('status', 'resolved').not('mandal_id', 'is', null);
    if (district_id) query = query.eq('district_id', district_id);
    if (state_id) query = query.eq('state_id', state_id);
    const { data: resolved } = await query;
    if (!resolved) return res.json({ leaderboard: [] });

    const mandalIds = [...new Set(resolved.map(r => r.mandal_id))];
    const districtIds = [...new Set(resolved.map(r => r.district_id).filter(Boolean))];

    const mandalMap = {}, districtMap = {};
    if (mandalIds.length) {
      const { data: mandals } = await supabase.from('mandals').select('id, name').in('id', mandalIds);
      mandals?.forEach(m => { mandalMap[m.id] = m.name; });
    }
    if (districtIds.length) {
      const { data: dists } = await supabase.from('districts').select('id, name').in('id', districtIds);
      dists?.forEach(d => { districtMap[d.id] = d.name; });
    }

    const scores = {};
    resolved.forEach(r => {
      if (!scores[r.mandal_id]) {
        scores[r.mandal_id] = { mandal_id: r.mandal_id, name: mandalMap[r.mandal_id] || 'Unknown Area', district: districtMap[r.district_id] || '', resolved: 0, points: 0 };
      }
      scores[r.mandal_id].resolved++;
      scores[r.mandal_id].points += 10;
    });
    const leaderboard = Object.values(scores).sort((a, b) => b.points - a.points).slice(0, 20);
    return res.json({ leaderboard, level: 'area' });
  } catch (err) {
    console.error('getAreaLeaderboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// District-level leaderboard
exports.getDistrictLeaderboard = async (req, res) => {
  try {
    const { state_id } = req.query;
    let query = supabase.from('complaints').select('district_id, status, priority').not('district_id', 'is', null);
    if (state_id) query = query.eq('state_id', state_id);
    const { data: all } = await query;
    if (!all) return res.json({ leaderboard: [] });

    const distIds = [...new Set(all.map(c => c.district_id))];
    const distMap = {};
    if (distIds.length) {
      const { data: dists } = await supabase.from('districts').select('id, name, state_id').in('id', distIds);
      // Get state names
      const stateIds = [...new Set(dists?.map(d => d.state_id).filter(Boolean) || [])];
      const stateMap = {};
      if (stateIds.length) {
        const { data: sts } = await supabase.from('states').select('id, name').in('id', stateIds);
        sts?.forEach(s => { stateMap[s.id] = s.name; });
      }
      dists?.forEach(d => { distMap[d.id] = { name: d.name, state: stateMap[d.state_id] || '' }; });
    }

    const stats = {};
    all.forEach(c => {
      const id = c.district_id;
      if (!stats[id]) stats[id] = { district_id: id, name: distMap[id]?.name || 'Unknown', state: distMap[id]?.state || '', total: 0, resolved: 0, points: 0, critical_resolved: 0 };
      stats[id].total++;
      if (c.status === 'resolved') {
        stats[id].resolved++;
        const pts = { critical: 25, high: 20, medium: 15, low: 10 };
        stats[id].points += pts[c.priority] || 10;
        if (c.priority === 'critical') stats[id].critical_resolved++;
      }
    });

    const leaderboard = Object.values(stats).map(d => ({
      ...d, resolution_rate: d.total > 0 ? parseFloat(((d.resolved / d.total) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.points - a.points).slice(0, 20);

    return res.json({ leaderboard, level: 'district' });
  } catch (err) {
    console.error('getDistrictLeaderboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── NOTIFICATIONS ─────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unread_only } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase.from('notifications').select('*', { count: 'exact' })
      .eq('user_id', req.user.id).order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (unread_only === 'true') query = query.eq('is_read', false);
    const { data, count } = await query;
    const { count: unreadCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('is_read', false);
    return res.json({ notifications: data || [], total: count || 0, unreadCount: unreadCount || 0 });
  } catch { return res.status(500).json({ error: 'Internal server error' }); }
};
exports.markNotificationsRead = async (req, res) => {
  try {
    const { ids, all } = req.body;
    if (all) await supabase.from('notifications').update({ is_read: true }).eq('user_id', req.user.id).eq('is_read', false);
    else if (ids?.length) await supabase.from('notifications').update({ is_read: true }).in('id', ids).eq('user_id', req.user.id);
    return res.json({ message: 'Marked as read' });
  } catch { return res.status(500).json({ error: 'Internal server error' }); }
};
exports.deleteNotification = async (req, res) => {
  try {
    await supabase.from('notifications').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    return res.json({ message: 'Deleted' });
  } catch { return res.status(500).json({ error: 'Internal server error' }); }
};

exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { email_enabled, sms_enabled } = req.body;
    const update = {};
    if (typeof email_enabled === 'boolean') update.notification_email = email_enabled;
    if (typeof sms_enabled === 'boolean') update.notification_sms = sms_enabled;
    if (!Object.keys(update).length) return res.status(400).json({ error: 'No preferences provided' });
    const { error } = await supabase.from('users').update(update).eq('id', req.user.id);
    if (error) {
      // Column may not exist yet — log and return graceful response
      console.warn('[Preferences] Could not save preferences (columns may not exist):', error.message);
      return res.json({ message: 'Preferences noted (not persisted — run migration to add columns)', preferences: update });
    }
    return res.json({ message: 'Notification preferences updated', preferences: update });
  } catch (err) {
    console.error('updateNotificationPreferences:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── COMMENTS ─────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { complaint_id } = req.params;
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
    const { data: complaint } = await supabase.from('complaints').select('citizen_id, title').eq('id', complaint_id).maybeSingle();
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    const isOfficial = ['officer', 'admin', 'super_admin'].includes(req.user.role);
    const { data: comment, error } = await supabase.from('comments')
      .insert({ complaint_id, user_id: req.user.id, content: content.trim(), is_official: isOfficial })
      .select('id, content, is_official, created_at, user_id').single();
    if (error) return res.status(500).json({ error: 'Failed to post comment' });
    const { data: userData } = await supabase.from('users').select('full_name, role, badge_level, govt_badge').eq('id', req.user.id).maybeSingle();
    if (complaint.citizen_id && complaint.citizen_id !== req.user.id) {
      supabase.from('notifications').insert({
        user_id: complaint.citizen_id, type: 'update',
        title: isOfficial ? '📢 Official Response on Your Complaint' : '💬 New Comment',
        message: `${req.user.full_name || 'Someone'}: "${content.trim().substring(0, 80)}"`,
        complaint_id
      }).then(() => {}).catch(() => {});
    }
    return res.status(201).json({ comment: { ...comment, users: userData } });
  } catch (err) {
    console.error('addComment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

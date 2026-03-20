'use strict';
const { supabase } = require('../config/supabase');
const notificationService = require('./notificationService');

const POINTS = { COMPLAINT_FILED:10, COMPLAINT_RESOLVED:5, UPVOTE_RECEIVED:2, DUPLICATE_VERIFIED:3, COMPLAINT_RESOLVED_OFFICER:15 };

const CITIZEN_BADGES = [
  { level:'newcomer',      min:0    },
  { level:'contributor',   min:50   },
  { level:'active_citizen',min:150  },
  { level:'champion',      min:400  },
  { level:'civic_hero',    min:1000 }
];

const GOVT_BADGES = [
  { level:'new_officer',      min:0    },
  { level:'active_officer',   min:100  },
  { level:'efficient_officer',min:300  },
  { level:'star_officer',     min:700  },
  { level:'excellence_award', min:1500 }
];

const getBadge = (pts, list) => {
  let b = list[0];
  for (const item of list) if (pts >= item.min) b = item;
  return b;
};

const PRIORITY_PTS = { critical:25, high:20, medium:15, low:10 };

const addCitizenPoints = async (userId, pts) => {
  try {
    const { data: u } = await supabase.from('users').select('points,badge_level').eq('id',userId).single();
    if (!u) return;
    const newPts = (u.points||0)+pts;
    const badge  = getBadge(newPts, CITIZEN_BADGES);
    await supabase.from('users').update({ points:newPts, badge_level:badge.level }).eq('id',userId);
    await supabase.from('citizen_leaderboard').upsert({ user_id:userId, points:newPts, badge:badge.level, updated_at:new Date().toISOString() },{ onConflict:'user_id' });
    if (badge.level !== u.badge_level) {
      await notificationService.notifyBadgeUnlocked(userId, badge.level, false);
    }
  } catch (err) { console.error('addCitizenPoints:', err.message); }
};

const addOfficerPoints = async (officerId, deptId, priority, withinSLA) => {
  try {
    const { data: u } = await supabase.from('users').select('govt_points,govt_badge,complaints_resolved').eq('id',officerId).single();
    if (!u) return;
    const pts = (PRIORITY_PTS[priority]||10) + (withinSLA?10:0);
    const newPts = (u.govt_points||0)+pts;
    const badge  = getBadge(newPts, GOVT_BADGES);
    await supabase.from('users').update({ govt_points:newPts, govt_badge:badge.level, complaints_resolved:(u.complaints_resolved||0)+1 }).eq('id',officerId);
    // Update dept performance
    const now = new Date();
    await supabase.from('dept_performance').upsert({
      department_id:deptId, period_month:now.getMonth()+1, period_year:now.getFullYear(),
      complaints_resolved: supabase.rpc ? 1 : 1, // simplified upsert
      points_earned: pts
    },{ onConflict:'department_id,period_month,period_year' });
    if (badge.level !== u.govt_badge) {
      await notificationService.notifyBadgeUnlocked(officerId, badge.level, true);
    }
  } catch (err) { console.error('addOfficerPoints:', err.message); }
};

const getCitizenLeaderboard = async (limit=20) => {
  const { data } = await supabase.from('citizen_leaderboard')
    .select('user_id,points,badge,total_complaints,users!user_id(full_name,avatar_url)')
    .order('points',{ascending:false}).limit(limit);
  return data||[];
};

const getDeptLeaderboard = async (limit=20) => {
  const now = new Date();
  const { data } = await supabase.from('dept_performance')
    .select('department_id,points_earned,complaints_resolved,period_month,period_year,departments!department_id(name,code)')
    .eq('period_month',now.getMonth()+1).eq('period_year',now.getFullYear())
    .order('points_earned',{ascending:false}).limit(limit);
  return data||[];
};

const getOfficerLeaderboard = async (deptId, limit=20) => {
  let q = supabase.from('users')
    .select('id,full_name,govt_points,govt_badge,complaints_resolved,department_id,departments!department_id(name)')
    .eq('role','officer').order('govt_points',{ascending:false}).limit(limit);
  if (deptId) q = q.eq('department_id',deptId);
  const { data } = await q;
  return data||[];
};

module.exports = { POINTS, addCitizenPoints, addOfficerPoints, getCitizenLeaderboard, getDeptLeaderboard, getOfficerLeaderboard, CITIZEN_BADGES, GOVT_BADGES };

'use strict';
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

const generateToken = (userId, role, departmentId) =>
  jwt.sign({ userId, role, departmentId: departmentId || null }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('id,email,full_name,role,department_id,is_active,points,badge_level,govt_points,govt_badge,complaints_resolved,state_id,district_id')
      .eq('id', decoded.userId)
      .single();
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });
    req.user = user;
    next();
  } catch (_) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      const { data: user } = await supabase
        .from('users')
        .select('id,email,full_name,role,department_id,is_active,state_id,district_id')
        .eq('id', decoded.userId)
        .single();
      if (user && user.is_active) req.user = user;
    }
  } catch (_) { /* ignore */ }
  next();
};

module.exports = { generateToken, authenticate, authorize, optionalAuth };

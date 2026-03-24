'use strict';
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Simple in-memory user cache to reduce Supabase calls (TTL: 2 minutes)
const userCache = new Map();
const USER_CACHE_TTL = 2 * 60 * 1000;

const getCachedUser = async (userId) => {
  const cached = userCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.user;

  const { data: user, error } = await supabase
    .from('users')
    .select('id,email,full_name,role,department_id,is_active,points,badge_level,govt_points,govt_badge,complaints_resolved,state_id,district_id')
    .eq('id', userId)
    .single();

  if (error || !user) return null;
  userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL });
  return user;
};

// Call this when user data changes (profile update, etc.)
const invalidateUserCache = (userId) => userCache.delete(userId);

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
    const user = await getCachedUser(decoded.userId);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });
    req.user = user;
    next();
  } catch (err) {
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
      const user = await getCachedUser(decoded.userId);
      if (user && user.is_active) req.user = user;
    }
  } catch (_) { /* ignore */ }
  next();
};

module.exports = { generateToken, authenticate, authorize, optionalAuth, invalidateUserCache };

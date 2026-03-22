'use strict';

const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');
const notificationStore = require('../notifications/notificationStore');
const sseHub = require('../notifications/sseHub');

const resolveUserFromToken = async (token) => {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user, error } = await supabase
      .from('users')
      .select('id,email,full_name,role,department_id,is_active')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.is_active) return null;
    return user;
  } catch {
    return null;
  }
};

const sendSseEvent = (res, event, payload) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 50, unread_only } = req.query;
    const payload = await notificationStore.getNotifications(req.user.id, {
      page,
      limit,
      unreadOnly: unread_only === 'true',
    });

    return res.json(payload);
  } catch (err) {
    console.error('[Notifications] getNotifications failed:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const { ids, all } = req.body;
    await notificationStore.markNotificationsRead(req.user.id, { ids, all });

    const unreadCount = await notificationStore.getUnreadCount(req.user.id);
    sseHub.emitToUser(req.user.id, 'unread_count', { unreadCount });

    return res.json({ message: 'Marked as read', unreadCount });
  } catch (err) {
    console.error('[Notifications] markNotificationsRead failed:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await notificationStore.deleteNotification(req.user.id, req.params.id);

    const unreadCount = await notificationStore.getUnreadCount(req.user.id);
    sseHub.emitToUser(req.user.id, 'unread_count', { unreadCount });

    return res.json({ message: 'Deleted', unreadCount });
  } catch (err) {
    console.error('[Notifications] deleteNotification failed:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.clearNotifications = async (req, res) => {
  try {
    await notificationStore.clearNotifications(req.user.id);
    sseHub.emitToUser(req.user.id, 'cleared', { success: true, unreadCount: 0 });
    return res.json({ message: 'All notifications cleared', unreadCount: 0 });
  } catch (err) {
    console.error('[Notifications] clearNotifications failed:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.streamNotifications = async (req, res) => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = req.query.token || bearer;
    const user = await resolveUserFromToken(token);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized SSE connection' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();

    sseHub.addClient(user.id, res);

    const snapshot = await notificationStore.getNotifications(user.id, { page: 1, limit: 100, unreadOnly: false });
    sendSseEvent(res, 'connected', { ok: true, userId: user.id, ts: new Date().toISOString() });
    sendSseEvent(res, 'snapshot', snapshot);

    const keepAlive = setInterval(() => {
      sendSseEvent(res, 'ping', { ts: new Date().toISOString() });
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseHub.removeClient(user.id, res);
      res.end();
    });
  } catch (err) {
    console.error('[Notifications] streamNotifications failed:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

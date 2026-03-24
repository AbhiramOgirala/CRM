'use strict';

const crypto = require('crypto');
const { supabase } = require('../config/supabase');

const normalizeRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    complaint_id: row.complaint_id,
    is_read: !!row.is_read,
    created_at: row.created_at,
  };
};

const initialize = async () => {
  const { error } = await supabase
    .from('notifications')
    .select('id', { head: true, count: 'exact' })
    .limit(1);

  if (error) {
    throw new Error(`Notifications table not available in Supabase: ${error.message}`);
  }
};

const createNotification = async ({ user_id, type, title, message, complaint_id = null }) => {
  const payload = {
    id: crypto.randomUUID(),
    user_id,
    type,
    title,
    message,
    complaint_id,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert(payload)
    .select('id, user_id, type, title, message, complaint_id, is_read, created_at')
    .single();

  if (error) throw error;
  return normalizeRow(data);
};

const createNotificationsBulk = async (userIds, payload) => {
  if (!Array.isArray(userIds) || userIds.length === 0) return [];

  const now = new Date().toISOString();
  const rows = userIds.map((userId) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    complaint_id: payload.complaint_id || null,
    is_read: false,
    created_at: now,
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(rows)
    .select('id, user_id, type, title, message, complaint_id, is_read, created_at');

  if (error) throw error;
  return (data || []).map(normalizeRow);
};

const getUnreadCount = async (userId) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
};

const getNotifications = async (userId, { page = 1, limit = 50, unreadOnly = false } = {}) => {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const offset = (safePage - 1) * safeLimit;

  let query = supabase
    .from('notifications')
    .select('id, user_id, type, title, message, complaint_id, is_read, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (unreadOnly) query = query.eq('is_read', false);

  const { data, count, error } = await query;
  if (error) throw error;

  const unreadCount = await getUnreadCount(userId);

  return {
    notifications: (data || []).map(normalizeRow),
    total: count || 0,
    unreadCount,
  };
};

const markNotificationsRead = async (userId, { all: markAll = false, ids = [] } = {}) => {
  if (markAll) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return;
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .in('id', ids);

    if (error) throw error;
  }
};

const deleteNotification = async (userId, notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId)
    .eq('id', notificationId);

  if (error) throw error;
};

const clearNotifications = async (userId) => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
};

const upsertPushSubscription = async ({ user_id, subscription, user_agent = null }) => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Invalid push subscription payload');
  }

  const now = new Date().toISOString();
  const payload = {
    id: crypto.randomUUID(),
    user_id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    expiration_time: subscription.expirationTime ? String(subscription.expirationTime) : null,
    user_agent,
    updated_at: now,
    created_at: now,
  };

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(payload, { onConflict: 'user_id,endpoint' });

  if (error) throw error;
  return { success: true };
};

const getPushSubscriptionsByUser = async (userId) => {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, expiration_time')
    .eq('user_id', userId);

  if (error) throw error;

  return (data || []).map((row) => ({
    endpoint: row.endpoint,
    expirationTime: row.expiration_time || null,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  }));
};

const deletePushSubscription = async ({ user_id, endpoint }) => {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user_id)
    .eq('endpoint', endpoint);

  if (error) throw error;
};

const deletePushSubscriptionByEndpoint = async (endpoint) => {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) throw error;
};

module.exports = {
  initialize,
  createNotification,
  createNotificationsBulk,
  getNotifications,
  getUnreadCount,
  markNotificationsRead,
  deleteNotification,
  clearNotifications,
  upsertPushSubscription,
  getPushSubscriptionsByUser,
  deletePushSubscription,
  deletePushSubscriptionByEndpoint,
};

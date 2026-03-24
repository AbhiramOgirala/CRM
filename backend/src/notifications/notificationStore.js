'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dbDir = __dirname;
const dbPath = path.join(dbDir, 'notifications.sqlite');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let initPromise = null;

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
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      db = new Database(dbPath);
      
      db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          complaint_id TEXT,
          is_read INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        )
      `);

      db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)');
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });

  return initPromise;
};

const ensureReady = async () => {
  if (!initPromise) await initialize();
  return initPromise;
};

const createNotification = async ({ user_id, type, title, message, complaint_id = null }) => {
  await ensureReady();

  const notification = {
    id: crypto.randomUUID(),
    user_id,
    type,
    title,
    message,
    complaint_id,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const stmt = db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, complaint_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  
  stmt.run(
    notification.id,
    notification.user_id,
    notification.type,
    notification.title,
    notification.message,
    notification.complaint_id,
    0,
    notification.created_at
  );

  return notification;
};

const createNotificationsBulk = async (userIds, payload) => {
  await ensureReady();
  if (!Array.isArray(userIds) || userIds.length === 0) return [];

  const now = new Date().toISOString();
  const created = [];
  
  const stmt = db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, message, complaint_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const userId of userIds) {
    const notification = {
      id: crypto.randomUUID(),
      user_id: userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      complaint_id: payload.complaint_id || null,
      is_read: false,
      created_at: now,
    };

    stmt.run(
      notification.id,
      notification.user_id,
      notification.type,
      notification.title,
      notification.message,
      notification.complaint_id,
      0,
      notification.created_at
    );

    created.push(notification);
  }

  return created;
};

const getUnreadCount = async (userId) => {
  await ensureReady();
  const stmt = db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0');
  const row = stmt.get(userId);
  return row?.count || 0;
};

const getNotifications = async (userId, { page = 1, limit = 50, unreadOnly = false } = {}) => {
  await ensureReady();

  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const offset = (safePage - 1) * safeLimit;

  const whereClause = unreadOnly ? 'WHERE user_id = ? AND is_read = 0' : 'WHERE user_id = ?';

  const stmt = db.prepare(
    `SELECT id, user_id, type, title, message, complaint_id, is_read, created_at
     FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  );
  
  const rows = stmt.all(userId, safeLimit, offset);

  const totalStmt = db.prepare(`SELECT COUNT(*) AS count FROM notifications ${whereClause}`);
  const totalRow = totalStmt.get(userId);

  const unreadCount = await getUnreadCount(userId);

  return {
    notifications: rows.map(normalizeRow),
    total: totalRow?.count || 0,
    unreadCount,
  };
};

const markNotificationsRead = async (userId, { all: markAll = false, ids = [] } = {}) => {
  await ensureReady();

  if (markAll) {
    const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0');
    stmt.run(userId);
    return;
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(', ');
    const stmt = db.prepare(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`);
    stmt.run(userId, ...ids);
  }
};

const deleteNotification = async (userId, notificationId) => {
  await ensureReady();
  const stmt = db.prepare('DELETE FROM notifications WHERE user_id = ? AND id = ?');
  stmt.run(userId, notificationId);
};

const clearNotifications = async (userId) => {
  await ensureReady();
  const stmt = db.prepare('DELETE FROM notifications WHERE user_id = ?');
  stmt.run(userId);
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
};

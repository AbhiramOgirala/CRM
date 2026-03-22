'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3');

sqlite3.verbose();

const dbDir = __dirname;
const dbPath = path.join(dbDir, 'notifications.sqlite');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let initPromise = null;

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) return reject(err);
    return resolve({ changes: this.changes, lastID: this.lastID });
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    return resolve(rows || []);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    return resolve(row || null);
  });
});

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
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) return reject(err);

      try {
        await run(`
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

        await run('CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC)');
        await run('CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read)');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
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

  await run(
    `INSERT INTO notifications (id, user_id, type, title, message, complaint_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notification.id,
      notification.user_id,
      notification.type,
      notification.title,
      notification.message,
      notification.complaint_id,
      0,
      notification.created_at,
    ]
  );

  return notification;
};

const createNotificationsBulk = async (userIds, payload) => {
  await ensureReady();
  if (!Array.isArray(userIds) || userIds.length === 0) return [];

  const now = new Date().toISOString();
  const created = [];

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

    await run(
      `INSERT INTO notifications (id, user_id, type, title, message, complaint_id, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        notification.id,
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.complaint_id,
        0,
        notification.created_at,
      ]
    );

    created.push(notification);
  }

  return created;
};

const getUnreadCount = async (userId) => {
  await ensureReady();
  const row = await get('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return row?.count || 0;
};

const getNotifications = async (userId, { page = 1, limit = 50, unreadOnly = false } = {}) => {
  await ensureReady();

  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const offset = (safePage - 1) * safeLimit;

  const whereClause = unreadOnly ? 'WHERE user_id = ? AND is_read = 0' : 'WHERE user_id = ?';

  const rows = await all(
    `SELECT id, user_id, type, title, message, complaint_id, is_read, created_at
     FROM notifications
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, safeLimit, offset]
  );

  const totalRow = await get(
    `SELECT COUNT(*) AS count FROM notifications ${whereClause}`,
    [userId]
  );

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
    await run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0', [userId]);
    return;
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(', ');
    await run(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id IN (${placeholders})`,
      [userId, ...ids]
    );
  }
};

const deleteNotification = async (userId, notificationId) => {
  await ensureReady();
  await run('DELETE FROM notifications WHERE user_id = ? AND id = ?', [userId, notificationId]);
};

const clearNotifications = async (userId) => {
  await ensureReady();
  await run('DELETE FROM notifications WHERE user_id = ?', [userId]);
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

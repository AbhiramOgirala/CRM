'use strict';

const webpush = require('web-push');
const notificationStore = require('../notifications/notificationStore');

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contactEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@jansamadhan.delhi.gov.in';

const PUSH_ENABLED = Boolean(publicKey && privateKey);

if (PUSH_ENABLED) {
  webpush.setVapidDetails(contactEmail, publicKey, privateKey);
} else {
  console.warn('[Push] VAPID keys missing. Web push is disabled.');
}

const isEnabled = () => PUSH_ENABLED;

const getPublicKey = () => {
  if (!PUSH_ENABLED) return null;
  return publicKey;
};

const saveSubscription = async (userId, subscription, userAgent = null) => {
  if (!PUSH_ENABLED) return { enabled: false };
  await notificationStore.upsertPushSubscription({
    user_id: userId,
    subscription,
    user_agent: userAgent,
  });
  return { enabled: true };
};

const removeSubscription = async (userId, endpoint) => {
  if (!endpoint) return;
  await notificationStore.deletePushSubscription({ user_id: userId, endpoint });
};

const sendToUser = async (userId, payload) => {
  if (!PUSH_ENABLED) return;

  const subscriptions = await notificationStore.getPushSubscriptionsByUser(userId);
  if (!subscriptions.length) return;

  const message = JSON.stringify(payload || {});

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, message, {
        TTL: 60,
        urgency: 'normal',
      });
    } catch (err) {
      const statusCode = err?.statusCode;
      const isExpired = statusCode === 404 || statusCode === 410;
      if (isExpired && subscription?.endpoint) {
        await notificationStore.deletePushSubscriptionByEndpoint(subscription.endpoint);
      }
      if (!isExpired) {
        console.warn('[Push] Failed to send push:', err?.message || err);
      }
    }
  }));
};

module.exports = {
  isEnabled,
  getPublicKey,
  saveSubscription,
  removeSubscription,
  sendToUser,
};

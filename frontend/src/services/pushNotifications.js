import { notificationsAPI } from './api';

const base64UrlToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = () => {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
};

export const getPushSubscriptionStatus = async () => {
  if (!isPushSupported()) return { supported: false, permission: 'unsupported', subscribed: false };
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription),
    endpoint: subscription?.endpoint || null,
  };
};

export const syncExistingPushSubscription = async () => {
  if (!isPushSupported()) return { enabled: false, reason: 'unsupported' };
  if (Notification.permission !== 'granted') return { enabled: false, reason: 'permission_not_granted' };

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (!existing) return { enabled: false, reason: 'no_existing_subscription' };

  await notificationsAPI.subscribePush(existing.toJSON());
  return { enabled: true, reused: true };
};

export const subscribeToPushNotifications = async () => {
  if (!isPushSupported()) return { enabled: false, reason: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { enabled: false, reason: 'permission_denied' };

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await notificationsAPI.subscribePush(existing.toJSON());
    return { enabled: true, reused: true };
  }

  const keyRes = await notificationsAPI.getPushPublicKey();
  if (!keyRes?.publicKey) return { enabled: false, reason: 'missing_public_key' };

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(keyRes.publicKey),
  });

  await notificationsAPI.subscribePush(subscription.toJSON());
  return { enabled: true, reused: false };
};

export const unsubscribeFromPushNotifications = async () => {
  if (!isPushSupported()) return { enabled: false, reason: 'unsupported' };
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return { enabled: true, alreadyUnsubscribed: true };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  if (endpoint) {
    await notificationsAPI.unsubscribePush(endpoint);
  }

  return { enabled: true, unsubscribed: true };
};

'use strict';
const twilio = require('twilio');

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

const STATUS_MESSAGES = {
  assigned:    (ticket) => `📋 Your complaint *${ticket}* has been assigned to a department and is under review.`,
  in_progress: (ticket) => `🔧 Work has started on your complaint *${ticket}*. Our team is actively working on it.`,
  resolved:    (ticket) => `✅ Great news! Your complaint *${ticket}* has been resolved. Thank you for reporting it.`,
  rejected:    (ticket, reason) => `❌ Your complaint *${ticket}* was rejected.\nReason: ${reason || 'Not specified'}`,
  escalated:   (ticket) => `🔺 Your complaint *${ticket}* has been escalated to higher authorities for priority attention.`,
};

/**
 * Send a WhatsApp message to a phone number
 * @param {string} phone - 10-digit Indian phone number
 * @param {string} message - Message body
 */
const sendWhatsApp = async (phone, message) => {
  if (!client) {
    console.warn('[WhatsApp] Twilio not configured — skipping notification');
    return;
  }
  if (!phone) return;

  // Normalize to E.164 format for India
  const normalized = phone.replace(/\D/g, '');
  const e164 = normalized.startsWith('91') ? `+${normalized}` : `+91${normalized}`;
  const to = `whatsapp:${e164}`;

  try {
    const msg = await client.messages.create({ from: FROM, to, body: message });
    console.log(`[WhatsApp] Sent to ${e164} — SID: ${msg.sid}`);
  } catch (err) {
    // Don't crash the app if WhatsApp fails
    console.error(`[WhatsApp] Failed to send to ${e164}:`, err.message);
  }
};

/**
 * Notify citizen about complaint status change
 * @param {string} phone - citizen's phone number
 * @param {string} ticketNumber - complaint ticket number
 * @param {string} status - new status
 * @param {string} reason - rejection reason (optional)
 */
const notifyStatusChange = async (phone, ticketNumber, status, reason = '') => {
  const msgFn = STATUS_MESSAGES[status];
  if (!msgFn) return; // no message defined for this status
  const body = `🏛️ *JanSamadhan Update*\n\n${msgFn(ticketNumber, reason)}\n\nTrack your complaint at jansamadhan.gov.in`;
  await sendWhatsApp(phone, body);
};

module.exports = { sendWhatsApp, notifyStatusChange };

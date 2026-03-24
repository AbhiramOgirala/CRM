'use strict';
const { supabase } = require('../config/supabase');
const notificationStore = require('../notifications/notificationStore');
const sseHub = require('../notifications/sseHub');
const pushNotificationService = require('./pushNotificationService');

// ── Lazy-init clients (only created if env vars present) ──────────────────────
let _resend = null;
let _twilio = null;

const getResend = () => {
  if (!_resend && process.env.RESEND_API_KEY) {
    const { Resend } = require('resend');
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
};

const getTwilio = () => {
  if (!_twilio && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    _twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _twilio;
};

const EMAIL_ENABLED = () => process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false';
const SMS_ENABLED   = () => process.env.ENABLE_SMS_NOTIFICATIONS   !== 'false';

// ── Email HTML template ────────────────────────────────────────────────────────
const buildEmailHtml = ({ heading, body, ticketNumber, ctaLabel, ctaUrl }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JanSamadhan Notification</title>
</head>
<body style="margin:0;padding:0;background:#F5F6FA;font-family:'Arial',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6FA;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
        <!-- Header -->
        <tr>
          <td style="background:#1A237E;padding:24px 32px;text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
              <span style="background:#FF9933;display:inline-block;width:6px;height:36px;border-radius:3px;"></span>
              <span style="background:#FFFFFF;display:inline-block;width:6px;height:36px;border-radius:3px;"></span>
              <span style="background:#138808;display:inline-block;width:6px;height:36px;border-radius:3px;"></span>
            </div>
            <h1 style="color:#FFD54F;font-size:22px;margin:12px 0 4px;letter-spacing:-0.5px;">JanSamadhan</h1>
            <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:2px;">Government of NCT of Delhi — Grievance Portal</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#1A1A2E;font-size:18px;margin:0 0 16px;">${heading}</h2>
            ${ticketNumber ? `<p style="background:#E8EAF6;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:13px;font-weight:700;color:#1A237E;margin:0 0 16px;">Ticket: ${ticketNumber}</p>` : ''}
            <div style="color:#5C6080;font-size:14px;line-height:1.7;">${body}</div>
            ${ctaLabel && ctaUrl ? `
            <div style="margin:28px 0 0;text-align:center;">
              <a href="${ctaUrl}" style="background:#E65100;color:#FFFFFF;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">
                ${ctaLabel}
              </a>
            </div>` : ''}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F5F6FA;padding:20px 32px;border-top:1px solid #E0E3EF;text-align:center;">
            <p style="color:#9EA3B8;font-size:11px;margin:0;line-height:1.6;">
              This is an automated notification from <strong>JanSamadhan</strong> — Delhi Government Grievance Portal.<br/>
              Do not reply to this email. For support, visit <a href="https://jansamadhan.delhi.gov.in" style="color:#E65100;">jansamadhan.delhi.gov.in</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ── Core: In-App ───────────────────────────────────────────────────────────────
const sendInApp = async (userId, { type, title, message, complaint_id }) => {
  try {
    const notification = await notificationStore.createNotification({
      user_id: userId, type, title, message,
      complaint_id: complaint_id || null
    });
    const unreadCount = await notificationStore.getUnreadCount(userId);
    sseHub.emitToUser(userId, 'notification', { notification, unreadCount });

    await pushNotificationService.sendToUser(userId, {
      title,
      body: message,
      icon: '/logo192.png',
      badge: '/logo192.png',
      url: complaint_id ? `/complaint/${complaint_id}` : '/dashboard',
      notificationId: notification.id,
      type,
      complaint_id: complaint_id || null,
      ts: notification.created_at,
    });
  } catch (err) {
    console.error('[Notification] In-app insert failed:', err.message);
  }
};

const sendInAppBulk = async (userIds, payload) => {
  if (!userIds?.length) return;
  try {
    const notifications = await notificationStore.createNotificationsBulk(userIds, payload);
    for (const notification of notifications) {
      const unreadCount = await notificationStore.getUnreadCount(notification.user_id);
      sseHub.emitToUser(notification.user_id, 'notification', { notification, unreadCount });

      await pushNotificationService.sendToUser(notification.user_id, {
        title: notification.title,
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        url: notification.complaint_id ? `/complaint/${notification.complaint_id}` : '/dashboard',
        notificationId: notification.id,
        type: notification.type,
        complaint_id: notification.complaint_id || null,
        ts: notification.created_at,
      });
    }
  } catch (err) {
    console.error('[Notification] Bulk in-app insert failed:', err.message);
  }
};

// ── Core: Email ────────────────────────────────────────────────────────────────
const sendEmail = async (to, { subject, html, text }) => {
  if (!EMAIL_ENABLED()) return;
  const resend = getResend();
  if (!resend) {
    console.warn('[Notification] Email skipped — RESEND_API_KEY not configured');
    return;
  }
  try {
    await resend.emails.send({
      from: `${process.env.NOTIFICATIONS_FROM_NAME || 'JanSamadhan Delhi'} <${process.env.NOTIFICATIONS_FROM_EMAIL || 'noreply@jansamadhan.delhi.gov.in'}>`,
      to: [to],
      subject,
      html: html || `<p>${text}</p>`,
      text: text || subject,
    });
  } catch (err) {
    console.error('[Notification] Email failed (non-blocking):', err.message);
  }
};

// ── Core: SMS ─────────────────────────────────────────────────────────────────
const sendSMS = async (phone, message) => {
  if (!SMS_ENABLED()) return;
  if (!phone) return;
  const twilio = getTwilio();
  if (!twilio) {
    console.warn('[Notification] SMS skipped — Twilio not configured');
    return;
  }
  try {
    // Normalize Indian phone numbers
    const normalized = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: normalized,
    });
  } catch (err) {
    console.error('[Notification] SMS failed (non-blocking):', err.message);
  }
};

// ── High-level: Complaint Filed ───────────────────────────────────────────────
// citizen: in-app + email + SMS
// officers: in-app + email
const notifyComplaintFiled = async (complaint, citizen, _department, officers) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const complaintUrl = `${baseUrl}/complaint/${complaint.id}`;

  // 1. Citizen — in-app
  await sendInApp(citizen.id, {
    type: 'info',
    title: 'Complaint Filed Successfully',
    message: `Your complaint "${complaint.title}" (${complaint.ticket_number}) has been submitted and routed to the concerned department.`,
    complaint_id: complaint.id,
  });

  // 2. Citizen — email
  if (citizen.email) {
    await sendEmail(citizen.email, {
      subject: `Complaint Filed — ${complaint.ticket_number} | JanSamadhan`,
      html: buildEmailHtml({
        heading: 'Your complaint has been filed successfully.',
        ticketNumber: complaint.ticket_number,
        body: `
          <p>Dear <strong>${citizen.full_name || 'Citizen'}</strong>,</p>
          <p>Your complaint <strong>"${complaint.title}"</strong> has been received and routed to the concerned department.</p>
          <ul style="padding-left:20px;">
            <li><strong>Category:</strong> ${complaint.category?.replace(/_/g, ' ')}</li>
            <li><strong>Priority:</strong> ${complaint.priority?.toUpperCase()}</li>
          </ul>
          <p>Our team will review and act on it within the prescribed SLA period. You can track status updates using the link below.</p>
        `,
        ctaLabel: 'Track Your Complaint',
        ctaUrl: complaintUrl,
      }),
    });
  }

  // 3. Citizen — SMS
  if (citizen.phone) {
    await sendSMS(citizen.phone,
      `Complaint filed: "${complaint.title.substring(0, 50)}" (${complaint.ticket_number}). Track at jansamadhan.delhi.gov.in - JanSamadhan Delhi`
    );
  }

  // 4. Officers — in-app
  if (officers?.length) {
    await sendInAppBulk(officers.map(o => o.id), {
      type: 'assignment',
      title: `New ${complaint.priority?.toUpperCase()} Complaint`,
      message: `${complaint.category?.replace(/_/g, ' ')}: "${complaint.title}"`,
      complaint_id: complaint.id,
    });
  }

  // 5. Officers — email (fetch officer emails)
  if (officers?.length) {
    const officerEmails = officers.filter(o => o.email).map(o => o.email);
    for (const email of officerEmails) {
      await sendEmail(email, {
        subject: `[${complaint.priority?.toUpperCase()}] New Complaint — ${complaint.ticket_number}`,
        html: buildEmailHtml({
          heading: `New ${complaint.priority?.toUpperCase()} complaint in your department`,
          ticketNumber: complaint.ticket_number,
          body: `
            <p>A new complaint has been filed and routed to your department.</p>
            <ul style="padding-left:20px;">
              <li><strong>Title:</strong> ${complaint.title}</li>
              <li><strong>Category:</strong> ${complaint.category?.replace(/_/g, ' ')}</li>
              <li><strong>Priority:</strong> ${complaint.priority?.toUpperCase()}</li>
            </ul>
            <p>Please review and take appropriate action within the SLA period.</p>
          `,
          ctaLabel: 'View Complaint',
          ctaUrl: complaintUrl,
        }),
      });
    }
  }
};

// ── High-level: Status Update ─────────────────────────────────────────────────
// assigned/in_progress → in-app only
// resolved → in-app + email + SMS
// rejected → in-app + email
// escalated → in-app + SMS
const notifyStatusUpdate = async (complaint, citizen, newStatus, notes) => {
  if (!citizen) return;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const complaintUrl = `${baseUrl}/complaint/${complaint.id}`;

  const msgs = {
    assigned:    'has been assigned to a department and is under review.',
    in_progress: 'is now being actively worked on by our officers.',
    rejected:    `has been rejected. ${notes ? `Reason: ${notes}` : ''}`,
    escalated:   'has been escalated for priority attention.',
  };

  // In-app for all statuses except resolved (handled separately in controller)
  if (msgs[newStatus]) {
    await sendInApp(citizen.id, {
      type: newStatus === 'escalated' ? 'escalation' : 'update',
      title: 'Complaint Status Updated',
      message: `Your complaint "${complaint.title}" ${msgs[newStatus]}`,
      complaint_id: complaint.id,
    });
  }

  if (newStatus === 'resolved') {
    await sendInApp(citizen.id, {
      type: 'resolution',
      title: 'Complaint Resolved',
      message: `Your complaint "${complaint.title}" (${complaint.ticket_number}) has been resolved. ${notes ? `Notes: ${notes}` : ''}`,
      complaint_id: complaint.id,
    });
    if (citizen.email) {
      await sendEmail(citizen.email, {
        subject: `Complaint Resolved — ${complaint.ticket_number} | JanSamadhan`,
        html: buildEmailHtml({
          heading: 'Your complaint has been resolved.',
          ticketNumber: complaint.ticket_number,
          body: `
            <p>Dear <strong>${citizen.full_name || 'Citizen'}</strong>,</p>
            <p>We are pleased to inform you that your complaint <strong>"${complaint.title}"</strong> has been resolved.</p>
            ${notes ? `<p><strong>Resolution Notes:</strong> ${notes}</p>` : ''}
            <p>Thank you for using JanSamadhan. Your feedback helps us improve civic services in Delhi.</p>
          `,
          ctaLabel: 'View Resolution Details',
          ctaUrl: complaintUrl,
        }),
      });
    }
    if (citizen.phone) {
      await sendSMS(citizen.phone,
        `Your complaint ${complaint.ticket_number} has been RESOLVED. View details at jansamadhan.delhi.gov.in - JanSamadhan Delhi`
      );
    }
  }

  if (newStatus === 'rejected' && citizen.email) {
    await sendEmail(citizen.email, {
      subject: `Complaint Status Update — ${complaint.ticket_number} | JanSamadhan`,
      html: buildEmailHtml({
        heading: 'Update on your complaint',
        ticketNumber: complaint.ticket_number,
        body: `
          <p>Dear <strong>${citizen.full_name || 'Citizen'}</strong>,</p>
          <p>Your complaint <strong>"${complaint.title}"</strong> has been reviewed. Unfortunately, it could not be processed at this time.</p>
          ${notes ? `<p><strong>Reason:</strong> ${notes}</p>` : ''}
          <p>You may file a new complaint if you believe this decision was incorrect.</p>
        `,
        ctaLabel: 'View Complaint',
        ctaUrl: complaintUrl,
      }),
    });
  }

  if (newStatus === 'escalated' && citizen.phone) {
    await sendSMS(citizen.phone,
      `Your complaint ${complaint.ticket_number} has been escalated to senior authority for priority attention. - JanSamadhan Delhi`
    );
  }
};

// ── High-level: Duplicate Detected ───────────────────────────────────────────
const notifyDuplicateDetected = async (newComplaint, parentComplaint, duplicateCount) => {
  // Notify the citizen who filed the duplicate
  await sendInApp(newComplaint.citizen_id, {
    type: 'duplicate',
    title: 'Similar complaint already exists',
    message: `Your complaint is similar to an existing report. It has been linked and will be resolved together.`,
    complaint_id: parentComplaint.id,
  });

  // Notify parent complaint citizen at milestones
  if ([3, 5, 10].includes(duplicateCount) && parentComplaint.citizen_id) {
    await sendInApp(parentComplaint.citizen_id, {
      type: 'update',
      title: `${duplicateCount} people reported the same issue`,
      message: `Your complaint "${parentComplaint.title}" now has ${duplicateCount} similar reports. This increases its resolution priority.`,
      complaint_id: parentComplaint.id,
    });
  }
};

// ── High-level: Escalation ────────────────────────────────────────────────────
const notifyEscalation = async (complaint, level, admins) => {
  const ESCALATION_TO = { 1: 'Department Head', 2: 'District Officer', 3: 'Commissioner' };
  const escalatedTo = ESCALATION_TO[level] || `Level ${level}`;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const complaintUrl = `${baseUrl}/complaint/${complaint.id}`;

  // Citizen — in-app
  if (complaint.citizen_id) {
    await sendInApp(complaint.citizen_id, {
      type: 'escalation',
      title: 'Complaint Escalated',
      message: `Your complaint "${complaint.title}" (${complaint.ticket_number}) has been escalated to ${escalatedTo}.`,
      complaint_id: complaint.id,
    });
    // Citizen — SMS
    if (complaint.citizen_phone) {
      await sendSMS(complaint.citizen_phone,
        `Your complaint ${complaint.ticket_number} has been escalated to ${escalatedTo} for priority attention. - JanSamadhan Delhi`
      );
    }
  }

  // Admins — in-app + email (level >= 2)
  if (level >= 2 && admins?.length) {
    await sendInAppBulk(admins.map(a => a.id), {
      type: 'escalation',
      title: `Level ${level} Escalation — ${complaint.ticket_number}`,
      message: `"${complaint.title}" escalated to ${escalatedTo}. Priority: ${complaint.priority?.toUpperCase()}.`,
      complaint_id: complaint.id,
    });

    const adminEmails = admins.filter(a => a.email).map(a => a.email);
    for (const email of adminEmails) {
      await sendEmail(email, {
        subject: `[ESCALATION L${level}] ${complaint.ticket_number} — JanSamadhan`,
        html: buildEmailHtml({
          heading: `Level ${level} Escalation Alert`,
          ticketNumber: complaint.ticket_number,
          body: `
            <p>A complaint has been auto-escalated due to SLA breach and requires your attention.</p>
            <ul style="padding-left:20px;">
              <li><strong>Title:</strong> ${complaint.title}</li>
              <li><strong>Escalated To:</strong> ${escalatedTo}</li>
              <li><strong>Priority:</strong> ${complaint.priority?.toUpperCase()}</li>
              <li><strong>Status:</strong> Escalated</li>
            </ul>
          `,
          ctaLabel: 'Review Complaint',
          ctaUrl: complaintUrl,
        }),
      });
    }
  }
};

// ── High-level: Badge Unlocked ────────────────────────────────────────────────
const notifyBadgeUnlocked = async (userId, badgeLabel, isOfficer = false) => {
  await sendInApp(userId, {
    type: 'badge',
    title: isOfficer ? 'Achievement Unlocked' : 'New Badge Unlocked',
    message: `You have earned the "${badgeLabel.replace(/_/g, ' ')}" ${isOfficer ? 'officer badge' : 'badge'}! Keep contributing to improve Delhi.`,
    complaint_id: null,
  });
};

// ── High-level: Officer direct assignment ─────────────────────────────────────
const notifyOfficerAssignment = async (complaint, officer) => {
  await sendInApp(officer.id, {
    type: 'assignment',
    title: 'Complaint Assigned to You',
    message: `"${complaint.title}" (${complaint.ticket_number}) has been directly assigned to you.`,
    complaint_id: complaint.id,
  });
};

module.exports = {
  sendInApp,
  sendInAppBulk,
  sendEmail,
  sendSMS,
  notifyComplaintFiled,
  notifyStatusUpdate,
  notifyDuplicateDetected,
  notifyEscalation,
  notifyBadgeUnlocked,
  notifyOfficerAssignment,
};

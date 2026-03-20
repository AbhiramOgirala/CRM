'use strict';
const { supabase } = require('../config/supabase');
const nlp = require('./nlpService');
const { sendWhatsApp } = require('./whatsappService');

// ── In-memory conversation state ──────────────────────────────────
// Structure: { [phone]: { step, data, userId, expiresAt } }
const sessions = new Map();
const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

const getSession = (phone) => {
  const s = sessions.get(phone);
  if (s && Date.now() > s.expiresAt) { sessions.delete(phone); return null; }
  return s || null;
};

const setSession = (phone, data) => {
  sessions.set(phone, { ...data, expiresAt: Date.now() + SESSION_TTL });
};

const clearSession = (phone) => sessions.delete(phone);

// ── Ticket generator ──────────────────────────────────────────────
const genTicket = async () => {
  const { count } = await supabase.from('complaints').select('*', { count: 'exact', head: true });
  return `CMP-${((count || 0) + 1000).toString().padStart(6, '0')}`;
};

// ── Main webhook handler ──────────────────────────────────────────
const handleIncoming = async (req, res) => {
  // Twilio sends form-encoded body
  const from = req.body?.From || '';          // e.g. "whatsapp:+919876543210"
  const body = (req.body?.Body || '').trim();

  // Extract plain phone number
  const phone = from.replace('whatsapp:', '').replace('+91', '').replace('+', '');

  // Always respond 200 to Twilio immediately (TwiML empty response)
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  if (!phone || !body) return;

  console.log(`[WhatsApp Webhook] From: ${phone} | Message: "${body}"`);

  // ── Look up user by phone ─────────────────────────────────────
  const { data: user } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('phone', phone)
    .eq('role', 'citizen')
    .single();

  if (!user) {
    await sendWhatsApp(phone,
      `🏛️ *JanSamadhan*\n\nHi! We couldn't find an account linked to this number.\n\nPlease register first at:\n👉 http://localhost:3000/register\n\nOnce registered, text us again to file a complaint.`
    );
    return;
  }

  const session = getSession(phone);
  const msg = body.toLowerCase();

  // ── Handle active session steps ───────────────────────────────
  if (session) {
    if (session.step === 'awaiting_confirmation') {
      if (msg === 'yes' || msg === 'y' || msg === 'haan' || msg === 'ha') {
        await confirmAndFile(phone, user, session.data);
      } else if (msg === 'no' || msg === 'n' || msg === 'nahi' || msg === 'nope') {
        clearSession(phone);
        await sendWhatsApp(phone, `❌ Complaint cancelled. Text us anytime to file a new one.`);
      } else {
        await sendWhatsApp(phone, `Please reply *YES* to confirm or *NO* to cancel.`);
      }
      return;
    }
  }

  // ── Commands ──────────────────────────────────────────────────
  if (msg === 'status' || msg === 'my complaints' || msg === 'check') {
    await sendStatusSummary(phone, user);
    return;
  }

  if (msg === 'help' || msg === 'hi' || msg === 'hello' || msg === 'start') {
    await sendWhatsApp(phone,
      `🏛️ *JanSamadhan — WhatsApp Bot*\n\nHello ${user.full_name}! 👋\n\nYou can:\n• *Describe your problem* — I'll file a complaint\n• Type *STATUS* — to check your complaints\n• Type *HELP* — to see this menu\n\nJust type your complaint in plain language!`
    );
    return;
  }

  // ── Treat message as a complaint description ──────────────────
  if (body.length < 10) {
    await sendWhatsApp(phone, `Please describe your problem in a bit more detail so I can file it correctly. 🙏`);
    return;
  }

  await processComplaintText(phone, user, body);
};

// ── Step 1: Classify and ask for confirmation ─────────────────────
const processComplaintText = async (phone, user, text) => {
  const result = nlp.classify(text);

  // Get dept name from DB
  const { data: dept } = await supabase
    .from('departments')
    .select('id, name')
    .eq('code', result.deptCode)
    .single();

  const deptName = dept?.name || result.deptName;
  const priorityEmoji = { critical: '🚨', high: '🔴', medium: '🟡', low: '🟢' }[result.priority] || '🟡';

  setSession(phone, {
    step: 'awaiting_confirmation',
    data: { text, result, deptId: dept?.id || null, deptName }
  });

  await sendWhatsApp(phone,
    `🏛️ *JanSamadhan — Complaint Preview*\n\n` +
    `📋 *Category:* ${result.category.replace(/_/g, ' ')}\n` +
    `🏢 *Department:* ${deptName}\n` +
    `${priorityEmoji} *Priority:* ${result.priority}\n` +
    `⏱️ *SLA:* ${result.slaHours} hours\n\n` +
    `Reply *YES* to file this complaint\nReply *NO* to cancel`
  );
};

// ── Step 2: File the complaint ────────────────────────────────────
const confirmAndFile = async (phone, user, data) => {
  clearSession(phone);
  const { text, result, deptId, deptName } = data;

  try {
    const ticket = await genTicket();
    const title = nlp.generateTitle(text, result.category);
    const slaDeadline = new Date(Date.now() + result.slaHours * 3600000);

    const { data: complaint, error } = await supabase.from('complaints').insert({
      ticket_number: ticket,
      citizen_id: user.id,
      title,
      description: text,
      category: result.category,
      sub_category: result.subCategory || null,
      nlp_category: result.category,
      nlp_confidence: result.confidence,
      nlp_keywords: result.keywords,
      sentiment: result.sentiment,
      priority: result.priority,
      status: 'pending',
      department_id: deptId || null,
      sla_deadline: slaDeadline.toISOString(),
      sla_hours_allotted: result.slaHours,
      is_public: true,
      is_anonymous: false,
      images: [],
      escalation_level: 0,
      view_count: 0
    }).select().single();

    if (error) throw error;

    // Timeline entry
    await supabase.from('complaint_timeline').insert({
      complaint_id: complaint.id,
      actor_id: user.id,
      actor_role: 'citizen',
      action: 'created',
      new_value: 'pending',
      notes: `Filed via WhatsApp. Auto-classified: ${result.category}. Routed to ${deptName}.`
    });

    await sendWhatsApp(phone,
      `✅ *Complaint Filed Successfully!*\n\n` +
      `🎫 *Ticket:* ${ticket}\n` +
      `🏢 *Assigned to:* ${deptName}\n` +
      `⏱️ *Expected resolution:* ${result.slaHours}h\n\n` +
      `You'll get updates here on WhatsApp as the status changes.\n\n` +
      `Track online: http://localhost:3000`
    );

    console.log(`[WhatsApp Bot] Complaint filed: ${ticket} for user ${user.id}`);
  } catch (err) {
    console.error('[WhatsApp Bot] Failed to file complaint:', err.message);
    await sendWhatsApp(phone, `❌ Something went wrong filing your complaint. Please try again or visit the portal directly.`);
  }
};

// ── Status summary ────────────────────────────────────────────────
const sendStatusSummary = async (phone, user) => {
  const { data: complaints } = await supabase
    .from('complaints')
    .select('ticket_number, title, status, created_at')
    .eq('citizen_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!complaints?.length) {
    await sendWhatsApp(phone, `You haven't filed any complaints yet.\n\nJust describe your problem and I'll file one for you! 🙏`);
    return;
  }

  const statusEmoji = { pending: '⏳', assigned: '📌', in_progress: '🔧', resolved: '✅', rejected: '❌', escalated: '🔺' };
  const lines = complaints.map(c =>
    `${statusEmoji[c.status] || '📋'} *${c.ticket_number}* — ${c.status.replace(/_/g, ' ')}\n   ${c.title.substring(0, 50)}`
  ).join('\n\n');

  await sendWhatsApp(phone, `🏛️ *Your Recent Complaints*\n\n${lines}\n\nFor full details visit: http://localhost:3000`);
};

module.exports = { handleIncoming };

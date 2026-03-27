'use strict';
const { supabase } = require('../config/supabase');
const nlp = require('./nlpService');
const { sendWhatsApp } = require('./whatsappService');
const geocodingService = require('./geocodingService');

// ── Supported states ──────────────────────────────────────────────
const SUPPORTED_STATES = [
  { num: '1', name: 'Delhi',       id: 'd1aebdaf-e535-4ad5-81bf-c39f753681eb' },
  { num: '2', name: 'Telangana',   id: '8261b780-f104-48bb-8877-74fb73d8d4b1' },
  { num: '3', name: 'Maharashtra', id: '0b6000f8-90a2-4ce7-a4ca-84c7fbb5d369' },
  { num: '4', name: 'Karnataka',   id: '14c66249-f10c-4f33-820f-5c19581084cc' },
  { num: '5', name: 'West Bengal', id: '7de38ae7-e651-4387-b1e1-9f4014355b79' },
];

// City-aware dept routing (same as complaintsController)
const CITY_DEPT_MAP = {
  'Telangana':    { roads:'GHMC', infrastructure:'GHMC', waste_management:'GHMC', parks:'GHMC', public_services:'GHMC', street_lights:'GHMC', water_supply:'HMWSSB', drainage:'HMWSSB', electricity:'TSSPDCL', law_enforcement:'HYDPOL', noise_pollution:'HYDPOL', health:'TSHFW', education:'TSEDU', other:'GHMC' },
  'Maharashtra':  { roads:'BMC',  infrastructure:'BMC',  waste_management:'BMC',  parks:'BMC',  public_services:'BMC',  street_lights:'BMC',  water_supply:'MWRRA',  drainage:'MWRRA',  electricity:'MSEDCL', law_enforcement:'MUMPOL', noise_pollution:'MUMPOL', health:'MHFW', education:'MHEDU', other:'BMC' },
  'West Bengal':  { roads:'KMC',  infrastructure:'KMC',  waste_management:'KMC',  parks:'KMC',  public_services:'KMC',  street_lights:'KMC',  water_supply:'WBPHED', drainage:'WBPHED', electricity:'CESC',   law_enforcement:'KOLPOL', noise_pollution:'KOLPOL', health:'WBHFW', education:'WBEDU', other:'KMC' },
  'Karnataka':    { roads:'BBMP', infrastructure:'BBMP', waste_management:'BBMP', parks:'BBMP', public_services:'BBMP', street_lights:'BBMP', water_supply:'BWSSB',  drainage:'BWSSB',  electricity:'BESCOM', law_enforcement:'BLRPOL', noise_pollution:'BLRPOL', health:'KARHFW', education:'KAREDU', other:'BBMP' },
};

// ── In-memory session store ───────────────────────────────────────
// { [phone]: { step, data, expiresAt } }
const sessions = new Map();
const SESSION_TTL = 15 * 60 * 1000; // 15 minutes

const getSession = (phone) => {
  const s = sessions.get(phone);
  if (s && Date.now() > s.expiresAt) { sessions.delete(phone); return null; }
  return s || null;
};
const setSession = (phone, data) => sessions.set(phone, { ...data, expiresAt: Date.now() + SESSION_TTL });
const clearSession = (phone) => sessions.delete(phone);

// ── Ticket generator ──────────────────────────────────────────────
const genTicket = async () => {
  const p1 = Math.random().toString(16).substring(2);
  const p2 = Math.random().toString(16).substring(2);
  return `CMP-${(p1 + p2).substring(0, 16)}`;
};

// ── Main webhook handler ──────────────────────────────────────────
const handleIncoming = async (req, res) => {
  const from = req.body?.From || '';
  const body = (req.body?.Body || '').trim();

  // Twilio sends Latitude/Longitude when user shares WhatsApp location
  const latitude  = req.body?.Latitude  ? parseFloat(req.body.Latitude)  : null;
  const longitude = req.body?.Longitude ? parseFloat(req.body.Longitude) : null;
  const isLocationShare = latitude !== null && longitude !== null;

  // Strip to 10-digit phone
  const rawPhone = from.replace('whatsapp:', '').replace(/^\+91/, '').replace(/^\+/, '');
  const phone = rawPhone.replace(/^0+/, '');

  // Always respond 200 to Twilio immediately
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  if (!phone || (!body && !isLocationShare)) return;

  console.log(`[WhatsApp Webhook] From: ${phone} | Message: "${body}"`);

  // ── Look up user ──────────────────────────────────────────────
  const { data: users } = await supabase
    .from('users').select('id, full_name, role').eq('phone', phone).eq('role', 'citizen').limit(1);
  const user = users?.[0] || null;

  if (!user) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    await sendWhatsApp(phone,
      `🏛️ *JanSamadhan*\n\nHi! We couldn't find an account linked to this number.\n\nPlease register first at:\n👉 ${frontendUrl}/register\n\nOnce registered, text us again to file a complaint.`
    );
    return;
  }

  const session = getSession(phone);
  const msg = body.toLowerCase().trim();

  // ── Global commands (work at any step) ───────────────────────
  if (msg === 'cancel' || msg === 'quit' || msg === 'exit') {
    clearSession(phone);
    await sendWhatsApp(phone, `❌ Cancelled. Type *HELP* to start again.`);
    return;
  }

  if (msg === 'status' || msg === 'my complaints' || msg === 'check') {
    await sendStatusSummary(phone, user);
    return;
  }

  if (!session && (msg === 'help' || msg === 'hi' || msg === 'hello' || msg === 'start' || msg === 'menu')) {
    await sendWhatsApp(phone,
      `🏛️ *JanSamadhan — WhatsApp Bot*\n\nHello ${user.full_name}! 👋\n\nWhat would you like to do?\n\n` +
      `• Type your *complaint* in plain language to file one\n` +
      `• Type *STATUS* to check your complaints\n` +
      `• Type *CANCEL* anytime to stop\n\n` +
      `Just describe your problem and I'll guide you through it!`
    );
    return;
  }

  // ── Handle active session steps ───────────────────────────────
  if (session) {
    switch (session.step) {
      case 'awaiting_location_choice':
        return await handleLocationChoice(phone, user, session, body);
      case 'awaiting_state':
        // If user shared GPS location while we're waiting for state
        if (isLocationShare) return await handleGpsLocation(phone, user, session, latitude, longitude);
        return await handleStateSelection(phone, user, session, body);
      case 'awaiting_district':
        return await handleDistrictSelection(phone, user, session, body);
      case 'awaiting_location_share':
        if (isLocationShare) return await handleGpsLocation(phone, user, session, latitude, longitude);
        // User typed something instead of sharing location — let them fall back to number selection
        if (body.trim() === '1') {
          setSession(phone, { ...session, step: 'awaiting_state' });
          const stateList = SUPPORTED_STATES.map(s => `*${s.num}.* ${s.name}`).join('\n');
          await sendWhatsApp(phone, `Which *state* is this complaint from?\n\n${stateList}\n\nReply with the *number*.\nType *CANCEL* to stop.`);
          return;
        }
        await sendWhatsApp(phone, `Please share your location using WhatsApp's 📎 attachment → Location, or reply *1* to select manually.`);
        return;
      case 'awaiting_confirmation':
        return await handleConfirmation(phone, user, session, msg);
    }
  }

  // ── New complaint — start with description ────────────────────
  if (body.length < 10) {
    await sendWhatsApp(phone, `Please describe your problem in a bit more detail so I can file it correctly. 🙏`);
    return;
  }

  await startComplaintFlow(phone, user, body);
};

// ── STEP 1: Classify text, ask for state ─────────────────────────
const startComplaintFlow = async (phone, user, text) => {
  const result = nlp.classify(text);

  setSession(phone, {
    step: 'awaiting_location_choice',
    data: { text, result }
  });

  await sendWhatsApp(phone,
    `🏛️ *JanSamadhan*\n\nGot it! I've understood your complaint.\n\n` +
    `📋 *Category detected:* ${result.category.replace(/_/g, ' ')}\n` +
    `${({ critical:'🚨', high:'🔴', medium:'🟡', low:'🟢' })[result.priority] || '🟡'} *Priority:* ${result.priority}\n\n` +
    `📍 *How would you like to provide your location?*\n\n` +
    `*1.* Select state & district manually\n` +
    `*2.* Share my current location 📍\n\n` +
    `Reply *1* or *2*\nType *CANCEL* to stop.`
  );
};

// ── STEP 2: State selected, ask for district ──────────────────────
const handleLocationChoice = async (phone, user, session, body) => {
  const choice = body.trim();

  if (choice === '1') {
    const stateList = SUPPORTED_STATES.map(s => `*${s.num}.* ${s.name}`).join('\n');
    setSession(phone, { step: 'awaiting_state', data: session.data });
    await sendWhatsApp(phone,
      `Which *state* is this complaint from?\n\n${stateList}\n\nReply with the *number*.\nType *CANCEL* to stop.`
    );
    return;
  }

  if (choice === '2') {
    setSession(phone, { step: 'awaiting_location_share', data: session.data });
    await sendWhatsApp(phone,
      `📍 Please share your current location:\n\n` +
      `Tap the *📎 attachment* icon → *Location* → *Send Current Location*\n\n` +
      `Or reply *1* to go back to manual selection.\nType *CANCEL* to stop.`
    );
    return;
  }

  await sendWhatsApp(phone, `Please reply with *1* (manual) or *2* (share location 📍).`);
};

const handleGpsLocation = async (phone, user, session, latitude, longitude) => {
  await sendWhatsApp(phone, `📍 Got your location! Looking it up...`);

  const geo = await geocodingService.reverseGeocode(latitude, longitude);
  console.log(`[WhatsApp GPS] lat=${latitude} lon=${longitude} geo=`, JSON.stringify(geo));

  if (!geo?.state) {
    await sendWhatsApp(phone,
      `😕 Couldn't detect your state from that location. Please select manually.\n\n` +
      SUPPORTED_STATES.map(s => `*${s.num}.* ${s.name}`).join('\n') +
      `\n\nReply with the *number*.\nType *CANCEL* to stop.`
    );
    setSession(phone, { step: 'awaiting_state', data: session.data });
    return;
  }

  // Normalize state name — handle variations like "Telangana State", "State of Telangana" etc.
  const rawState = geo.state.replace(/\s*(state|pradesh)\s*$/i, '').trim();

  // Try to match to a supported state
  const matchedState = SUPPORTED_STATES.find(s =>
    rawState.toLowerCase().includes(s.name.toLowerCase()) ||
    s.name.toLowerCase().includes(rawState.toLowerCase())
  );

  if (!matchedState) {
    await sendWhatsApp(phone,
      `😕 Your location (${geo.state}) isn't in our supported states yet.\n\n` +
      `Please select from the list:\n\n` +
      SUPPORTED_STATES.map(s => `*${s.num}.* ${s.name}`).join('\n') +
      `\n\nReply with the *number*.\nType *CANCEL* to stop.`
    );
    setSession(phone, { step: 'awaiting_state', data: session.data });
    return;
  }

  // Try to match district
  const { data: districts } = await supabase
    .from('districts').select('id, name').eq('state_id', matchedState.id).order('name').limit(20);

  let matchedDistrict = null;
  if (districts?.length && geo.district) {
    matchedDistrict = districts.find(d =>
      d.name.toLowerCase().includes(geo.district.toLowerCase()) ||
      geo.district.toLowerCase().includes(d.name.toLowerCase())
    ) || null;
  }

  await proceedToConfirmation(phone, user, session.data, matchedState, matchedDistrict, districts);
};

const handleStateSelection = async (phone, user, session, body) => {
  const choice = body.trim();
  const state = SUPPORTED_STATES.find(s => s.num === choice || s.name.toLowerCase() === choice.toLowerCase());

  if (!state) {
    const stateList = SUPPORTED_STATES.map(s => `*${s.num}.* ${s.name}`).join('\n');
    await sendWhatsApp(phone, `Please reply with a valid number:\n\n${stateList}`);
    return;
  }

  // Fetch districts for this state
  const { data: districts } = await supabase
    .from('districts').select('id, name').eq('state_id', state.id).order('name').limit(20);

  if (!districts?.length) {
    // No districts found, skip to confirmation
    await proceedToConfirmation(phone, user, session.data, state, null, null);
    return;
  }

  const districtList = districts.map((d, i) => `*${i + 1}.* ${d.name}`).join('\n');

  setSession(phone, {
    step: 'awaiting_district',
    data: { ...session.data, state, districts }
  });

  await sendWhatsApp(phone,
    `📍 *Select your district in ${state.name}:*\n\n${districtList}\n\n` +
    `Reply with the *number* of your district.\nType *CANCEL* to stop.`
  );
};

// ── STEP 3: District selected, show preview & confirm ────────────
const handleDistrictSelection = async (phone, user, session, body) => {
  const { state, districts, text, result } = session.data;
  const idx = parseInt(body.trim()) - 1;

  if (isNaN(idx) || idx < 0 || idx >= districts.length) {
    const districtList = districts.map((d, i) => `*${i + 1}.* ${d.name}`).join('\n');
    await sendWhatsApp(phone, `Please reply with a valid number:\n\n${districtList}`);
    return;
  }

  const district = districts[idx];
  await proceedToConfirmation(phone, user, { text, result }, state, district, districts);
};

// ── Build confirmation message ────────────────────────────────────
const proceedToConfirmation = async (phone, user, data, state, district, districts) => {
  const { text, result } = data;

  // Resolve city-aware dept code
  const cityMap = CITY_DEPT_MAP[state.name];
  const deptCode = cityMap
    ? (cityMap[result.category] || cityMap.other)
    : result.deptCode;

  const { data: deptRow } = await supabase
    .from('departments').select('id, name').eq('code', deptCode).maybeSingle();

  const deptName = deptRow?.name || result.deptName;
  const priorityEmoji = { critical:'🚨', high:'🔴', medium:'🟡', low:'🟢' }[result.priority] || '🟡';

  setSession(phone, {
    step: 'awaiting_confirmation',
    data: { text, result, state, district, deptId: deptRow?.id || null, deptName, deptCode }
  });

  await sendWhatsApp(phone,
    `🏛️ *Complaint Preview*\n\n` +
    `📋 *Category:* ${result.category.replace(/_/g, ' ')}\n` +
    `🏢 *Department:* ${deptName}\n` +
    `${priorityEmoji} *Priority:* ${result.priority}\n` +
    `📍 *Location:* ${district ? district.name + ', ' : ''}${state.name}\n` +
    `⏱️ *SLA:* ${result.slaHours} hours\n\n` +
    `Reply *YES* to file this complaint\nReply *NO* to cancel`
  );
};

// ── STEP 4: Confirm and file ──────────────────────────────────────
const handleConfirmation = async (phone, user, session, msg) => {
  if (msg === 'yes' || msg === 'y' || msg === 'haan' || msg === 'ha') {
    await fileComplaint(phone, user, session.data);
  } else if (msg === 'no' || msg === 'n' || msg === 'nahi' || msg === 'nope') {
    clearSession(phone);
    await sendWhatsApp(phone, `❌ Complaint cancelled. Text us anytime to file a new one.`);
  } else {
    await sendWhatsApp(phone, `Please reply *YES* to confirm or *NO* to cancel.`);
  }
};

// ── File the complaint in DB ──────────────────────────────────────
const fileComplaint = async (phone, user, data) => {
  clearSession(phone);
  const { text, result, state, district, deptId, deptName } = data;

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
      sentiment: result.sentiment || 'neutral',
      priority: result.priority,
      status: 'pending',
      department_id: deptId || null,
      state_id: state?.id || null,
      district_id: district?.id || null,
      sla_deadline: slaDeadline.toISOString(),
      sla_hours_allotted: result.slaHours,
      is_public: true,
      is_anonymous: false,
      images: [],
      escalation_level: 0,
      view_count: 0
    }).select().single();

    if (error) throw error;

    // Timeline
    await supabase.from('complaint_timeline').insert({
      complaint_id: complaint.id,
      actor_id: user.id,
      actor_role: 'citizen',
      action: 'created',
      new_value: 'pending',
      notes: `Filed via WhatsApp. Category: ${result.category}. Routed to ${deptName}. Location: ${district?.name || ''}, ${state?.name || ''}.`
    });

    // Auto-assign officer by dept + district
    if (deptId) {
      let officerQuery = supabase.from('users').select('id').eq('role', 'officer').eq('department_id', deptId).eq('is_active', true);
      if (district?.id) {
        const { data: areaOfficer } = await officerQuery.eq('district_id', district.id).limit(1).single();
        if (areaOfficer) {
          await supabase.from('complaints').update({ assigned_officer_id: areaOfficer.id, assigned_at: new Date().toISOString(), status: 'assigned' }).eq('id', complaint.id);
        }
      }
    }

    await sendWhatsApp(phone,
      `✅ *Complaint Filed Successfully!*\n\n` +
      `🎫 *Ticket:* ${ticket}\n` +
      `📝 *Issue:* ${title}\n` +
      `🏢 *Assigned to:* ${deptName}\n` +
      `📍 *Location:* ${district ? district.name + ', ' : ''}${state?.name || ''}\n` +
      `⏱️ *Expected resolution:* ${result.slaHours}h\n\n` +
      `You'll receive WhatsApp updates as the status changes.\n\n` +
      `Track online: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`
    );

    console.log(`[WhatsApp Bot] Complaint filed: ${ticket} | User: ${user.id} | State: ${state?.name} | District: ${district?.name} | Dept: ${deptName}`);
  } catch (err) {
    console.error('[WhatsApp Bot] Failed to file complaint:', err.message);
    await sendWhatsApp(phone, `❌ Something went wrong. Please try again or visit the portal directly.`);
  }
};

// ── Status summary ────────────────────────────────────────────────
const sendStatusSummary = async (phone, user) => {
  const { data: complaints } = await supabase
    .from('complaints').select('ticket_number, title, status, created_at')
    .eq('citizen_id', user.id).order('created_at', { ascending: false }).limit(5);

  if (!complaints?.length) {
    await sendWhatsApp(phone, `You haven't filed any complaints yet.\n\nJust describe your problem and I'll file one for you! 🙏`);
    return;
  }

  const statusEmoji = { pending:'⏳', assigned:'📌', in_progress:'🔧', resolved:'✅', rejected:'❌', escalated:'🔺' };
  const lines = complaints.map(c =>
    `${statusEmoji[c.status] || '📋'} *${c.ticket_number}* — ${c.status.replace(/_/g, ' ')}\n   ${c.title.substring(0, 50)}`
  ).join('\n\n');

  await sendWhatsApp(phone, `🏛️ *Your Recent Complaints*\n\n${lines}\n\nFor full details: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
};

module.exports = { handleIncoming };

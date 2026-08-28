'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('./config/supabase');

// ══════════════════════════════════════════════════════════════════════════════
//  JanSamadhan — Telangana Seed Data
//  Run:  node src/seed.js
// ══════════════════════════════════════════════════════════════════════════════

const TELANGANA_STATE = { name: 'Telangana' };

const TELANGANA_DISTRICTS = [
  'Hyderabad', 'Rangareddy', 'Medchal-Malkajgiri'
];

// ── Telangana-specific Departments ────────────────────────────────────────────
const DEPARTMENTS = [
  { code: 'GHMC',    name: 'Greater Hyderabad Municipal Corporation (GHMC)', sla_hours: 24, contact_email: 'ghmc@telangana.gov.in' },
  { code: 'HMWSSB',  name: 'Hyderabad Metro Water Supply & Sewerage Board',  sla_hours: 24, contact_email: 'hmwssb@telangana.gov.in' },
  { code: 'TSSPDCL', name: 'TS Southern Power Distribution Company',         sla_hours: 12, contact_email: 'tsspdcl@telangana.gov.in' },
  { code: 'HYDPOL',  name: 'Hyderabad City Police',                          sla_hours: 12, contact_email: 'police@hyderabad.gov.in' },
  { code: 'TSRTC',   name: 'Telangana State Road Transport Corporation',     sla_hours: 48, contact_email: 'tsrtc@telangana.gov.in' },
  { code: 'HMDA',    name: 'Hyderabad Metropolitan Development Authority',   sla_hours: 72, contact_email: 'hmda@telangana.gov.in' },
  { code: 'TSHFW',   name: 'Health & Family Welfare — Telangana',            sla_hours: 24, contact_email: 'health@telangana.gov.in' },
  { code: 'TSEDU',   name: 'School Education Department — Telangana',        sla_hours: 96, contact_email: 'education@telangana.gov.in' },
  { code: 'TSPCC',   name: 'Telangana Pollution Control Board',              sla_hours: 48, contact_email: 'tspcb@telangana.gov.in' },
  { code: 'TSFNS',   name: 'Food & Civil Supplies — Telangana',              sla_hours: 72, contact_email: 'food@telangana.gov.in' },
];

// ── 15 Diverse Telangana Citizens ─────────────────────────────────────────────
const CITIZENS = [
  { email: 'ramesh.reddy45@gmail.com',       full_name: 'Ramesh Reddy',         phone: '9848012301', address: 'H.No 3-6-120, Kukatpally', pincode: '500072' },
  { email: 'priya.sharma.hyd@gmail.com',     full_name: 'Priya Sharma',         phone: '9949023402', address: '8-2-293, Banjara Hills', pincode: '500034' },
  { email: 'mohd.arif.hyd@yahoo.com',        full_name: 'Mohammad Arif Khan',   phone: '9550034503', address: '14-5-88, Charminar', pincode: '500002' },
  { email: 'sunita.devi.lb@gmail.com',       full_name: 'Sunita Devi',          phone: '9866045604', address: '1-8-22, LB Nagar', pincode: '500074' },
  { email: 'vikram.naidu.sec@gmail.com',     full_name: 'Vikram Naidu',         phone: '9705056705', address: '10-3-18, Secunderabad', pincode: '500003' },
  { email: 'anjali.gupta.madh@outlook.com',  full_name: 'Anjali Gupta',         phone: '9640067806', address: 'Ayyappa Society, Madhapur', pincode: '500081' },
  { email: 'ravi.kumar.comp@gmail.com',      full_name: 'Ravi Kumar',           phone: '9573078907', address: '5-4-30, Kompally', pincode: '500014' },
  { email: 'neha.rao.gachi@gmail.com',       full_name: 'Neha Rao',             phone: '9848089008', address: 'Gachibowli Enclave', pincode: '500032' },
  { email: 'amit.jha.dilsukh@outlook.com',   full_name: 'Amit Jha',             phone: '9912090109', address: 'Dilsukhnagar Main Rd', pincode: '500060' },
  { email: 'pooja.mishra.jub@gmail.com',     full_name: 'Pooja Mishra',         phone: '9866001210', address: 'Jubilee Hills Road No. 5', pincode: '500033' },
  { email: 'suresh.goud.uppal@gmail.com',    full_name: 'Suresh Goud',          phone: '9949012311', address: '1-1-45, Uppal', pincode: '500039' },
  { email: 'meena.rawat.alwal@gmail.com',    full_name: 'Meena Rawat',          phone: '9550023412', address: 'Alwal Colony', pincode: '500010' },
  { email: 'deepak.tiwari.amer@gmail.com',   full_name: 'Deepak Tiwari',        phone: '9705034513', address: 'Ameerpet Main Road', pincode: '500016' },
  { email: 'fatima.begum.old@gmail.com',     full_name: 'Fatima Begum',         phone: '9640045614', address: '22-6-81, Old City', pincode: '500002' },
  { email: 'harpreet.kaur.hyd@gmail.com',    full_name: 'Harpreet Kaur',        phone: '9573056715', address: 'Kondapur Crossroads', pincode: '500084' },
];

// ── Officers per department ───────────────────────────────────────────────────
const OFFICERS = [
  { email: 'ae.hmwssb.hyd@telangana.gov.in',  full_name: 'Suresh Reddy (AE)',    dept: 'HMWSSB',  employee_id: 'HMWSSB-AE-1001' },
  { email: 'je.ghmc.hyd@telangana.gov.in',    full_name: 'Ramana Rao (JE)',      dept: 'GHMC',    employee_id: 'GHMC-JE-2001' },
  { email: 'ae.tsspdcl.hyd@telangana.gov.in', full_name: 'Venkat Naidu (AE)',    dept: 'TSSPDCL', employee_id: 'TSSPDCL-AE-3001' },
  { email: 'si.hydpol.hyd@telangana.gov.in',  full_name: 'Insp. Kishore Kumar',  dept: 'HYDPOL',  employee_id: 'HYDPOL-SI-4001' },
  { email: 'mo.tshfw.hyd@telangana.gov.in',   full_name: 'Dr. Padmavathi (MO)', dept: 'TSHFW',   employee_id: 'TSHFW-MO-5001' },
  { email: 'insp.tsedu.hyd@telangana.gov.in', full_name: 'Laxmi Prasad (DEO)',  dept: 'TSEDU',   employee_id: 'TSEDU-IN-6001' },
  { email: 'ae.hmwssb.rr@telangana.gov.in',   full_name: 'Srinivas Goud (AE)',   dept: 'HMWSSB',  employee_id: 'HMWSSB-AE-1002' },
  { email: 'je.ghmc.rr@telangana.gov.in',     full_name: 'Mahesh Babu (JE)',     dept: 'GHMC',    employee_id: 'GHMC-JE-2002' },
  { email: 'ae.tsspdcl.rr@telangana.gov.in',  full_name: 'Ravi Shankar (AE)',    dept: 'TSSPDCL', employee_id: 'TSSPDCL-AE-3002' },
  { email: 'si.hydpol.rr@telangana.gov.in',   full_name: 'Insp. Nagarjuna Rao',  dept: 'HYDPOL',  employee_id: 'HYDPOL-SI-4002' },
];

// ── Helper: random date in last N days ────────────────────────────────────────
const randDate = (daysBack = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 6, Math.floor(Math.random() * 60));
  return d.toISOString();
};
const randEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
const genTicket = (i) => `TS-${Date.now().toString().slice(-5)}${(i).toString().padStart(3, '0')}`;

// ── Realistic Hyderabad / Telangana Complaints ───────────────────────────────
const COMPLAINTS = [
  // ─── ROADS (GHMC) ─────────────────────────────────────────────────
  { citizenIdx: 0, cat: 'roads', sub: 'pothole', priority: 'critical', dept: 'GHMC', district: 'Hyderabad',
    title: 'Massive potholes on KPHB Colony to Kukatpally main road', lat: 17.4947, lng: 78.3996,
    desc: 'Road caved in due to improper earth filling after HMWSSB sewer work near KPHB Phase 6. Huge potholes causing traffic jams and accidents. Multiple two-wheelers have fallen. GHMC please repair urgently.', addr: 'KPHB Colony Main Road, Kukatpally', pin: '500072' },
  { citizenIdx: 6, cat: 'roads', sub: 'road_damage', priority: 'high', dept: 'GHMC', district: 'Medchal-Malkajgiri',
    title: 'Broken road near Kompally — Medchal highway stretch', lat: 17.5340, lng: 78.4860,
    desc: 'Road from Kompally to Medchal highway junction is extremely damaged. Deep potholes and broken surface. Commuters especially bikes and autos are struggling daily. Serious risk of accidents after recent rains.', addr: 'Kompally-Medchal Highway', pin: '500014' },
  { citizenIdx: 4, cat: 'roads', sub: 'pothole', priority: 'high', dept: 'GHMC', district: 'Hyderabad',
    title: 'Multiple large potholes in Secunderabad Clock Tower Road', lat: 17.4399, lng: 78.4983,
    desc: 'Large potholes on the road near Clock Tower have made it dilapidated and hazardous for vehicles and pedestrians. Despite repeated complaints to GHMC, no action taken for 3 weeks.', addr: 'Clock Tower Road, Secunderabad', pin: '500003' },
  { citizenIdx: 7, cat: 'roads', sub: null, priority: 'medium', dept: 'GHMC', district: 'Hyderabad',
    title: 'Broken road and damaged footpath near Gachibowli IT Hub', lat: 17.4401, lng: 78.3489,
    desc: 'Broken road stretches and uneven footpaths near Gachibowli IT hub area. IT employees walking to offices from bus stops forced to walk on the road. The area gets waterlogged during rain making it dangerous.', addr: 'Gachibowli, near DLF Cybercity', pin: '500032' },

  // ─── WATER SUPPLY (HMWSSB) ─────────────────────────────────────────
  { citizenIdx: 9, cat: 'water_supply', sub: 'contamination', priority: 'critical', dept: 'HMWSSB', district: 'Hyderabad',
    title: 'Sewage-contaminated water supply in Jubilee Hills Road No. 36', lat: 17.4315, lng: 78.4104,
    desc: 'For the last 2 weeks, drinking water coming from HMWSSB taps is contaminated with sewage smell. Lab tests by RWA confirmed contamination. Entire colony of 200 families is buying mineral water. Children falling sick. Urgent fixing needed.', addr: 'Road No. 36, Jubilee Hills', pin: '500033' },
  { citizenIdx: 2, cat: 'water_supply', sub: 'no_supply', priority: 'critical', dept: 'HMWSSB', district: 'Hyderabad',
    title: 'No water supply for 2 months in Falaknuma old city', lat: 17.3358, lng: 78.4536,
    desc: 'There has been zero water supply from HMWSSB for the past 2 months in Falaknuma area. We have filed multiple complaints on consumer forums and 040 helpline. Nobody responds. We are buying tanker water at Rs 1000 per trip.', addr: 'Falaknuma, near Puranapul', pin: '500002' },
  { citizenIdx: 5, cat: 'water_supply', sub: 'contamination', priority: 'critical', dept: 'HMWSSB', district: 'Medchal-Malkajgiri',
    title: 'Dirty yellowish water supply in Uppal Colony', lat: 17.4032, lng: 78.5594,
    desc: 'Extremely dirty yellowish water from HMWSSB supply in Uppal residential colony. Not safe for drinking, cooking, or even bathing. Children have developed skin rashes. HMWSSB must act now.', addr: 'Uppal Colony', pin: '500039' },
  { citizenIdx: 12, cat: 'water_supply', sub: 'leakage', priority: 'medium', dept: 'HMWSSB', district: 'Rangareddy',
    title: 'Major pipeline leakage wasting water near Attapur Ring Road', lat: 17.3733, lng: 78.4234,
    desc: 'Massive water leakage from HMWSSB pipeline near Attapur Ring Road junction. Drinking water being wasted for weeks. No one has come to repair despite multiple complaints filed. Road is becoming slippery from the water flow.', addr: 'Attapur, Ring Road junction', pin: '500048' },

  // ─── ELECTRICITY (TSSPDCL) ──────────────────────────────────────
  { citizenIdx: 4, cat: 'electricity', sub: 'power_outage', priority: 'high', dept: 'TSSPDCL', district: 'Hyderabad',
    title: 'Prolonged 6-hour daily power cuts in Maredpally', lat: 17.4516, lng: 78.5020,
    desc: 'TSSPDCL Maredpally Division has been facing daily outages from 11 AM to 5 PM. These 6-hour daily shutdowns are disrupting daily life, work-from-home setups, and student exam preparation. Unacceptable for a metro city.', addr: 'Maredpally, Secunderabad', pin: '500026' },
  { citizenIdx: 1, cat: 'electricity', sub: 'power_outage', priority: 'high', dept: 'TSSPDCL', district: 'Hyderabad',
    title: 'Repeated power cuts in Ameerpet and SR Nagar area', lat: 17.4375, lng: 78.4483,
    desc: 'Multiple overlapping shutdowns in the same week affecting Ameerpet from 10 AM to 2 PM. Small shopkeepers and coaching center students losing productive hours daily.', addr: 'Ameerpet / SR Nagar', pin: '500016' },
  { citizenIdx: 11, cat: 'electricity', sub: 'street_light', priority: 'medium', dept: 'TSSPDCL', district: 'Medchal-Malkajgiri',
    title: 'All street lights off on Alwal main road for 2 weeks', lat: 17.5010, lng: 78.5210,
    desc: 'All street lights on the main road from Alwal to Bolaram have been off for the past 2 weeks. The road is pitch dark after 7 PM. Women and elderly people afraid to walk. Accident risk is very high.', addr: 'Alwal Main Road', pin: '500010' },

  // ─── WASTE MANAGEMENT / SANITATION (GHMC) ────────────────────────
  { citizenIdx: 3, cat: 'waste_management', sub: null, priority: 'critical', dept: 'GHMC', district: 'Hyderabad',
    title: 'Open sewage flow and garbage piling in Chandrayangutta', lat: 17.3496, lng: 78.4725,
    desc: 'Open drains with sewage flowing directly onto streets mixed with piled-up garbage. Major health and hygiene risk. GHMC has completely ignored Chandrayangutta area. We demand immediate cleanup.', addr: 'Chandrayangutta residential lanes', pin: '500005' },
  { citizenIdx: 10, cat: 'waste_management', sub: null, priority: 'high', dept: 'GHMC', district: 'Medchal-Malkajgiri',
    title: 'Overflowing garbage bins in Uppal X Roads commercial area', lat: 17.4050, lng: 78.5600,
    desc: 'Severe cleanliness issues in Uppal X Roads area. Overflowing garbage bins, littered streets, and unbearable stench. Creating unhygienic environment and health risk.', addr: 'Uppal X Roads, commercial area', pin: '500039' },
  { citizenIdx: 0, cat: 'waste_management', sub: null, priority: 'high', dept: 'GHMC', district: 'Hyderabad',
    title: 'Garbage not collected for weeks in Bachupally residential colony', lat: 17.5415, lng: 78.3912,
    desc: 'Garbage not collected for weeks, leading to overflowing dumpsters and large accumulations on roadsides. Piles of mixed waste and plastic smell. Potential fire risks. GHMC Kukatpally zone please respond.', addr: 'Bachupally Colony', pin: '500090' },

  // ─── DRAINAGE (HMWSSB) ─────────────────────────────────────────────
  { citizenIdx: 13, cat: 'drainage', sub: 'blockage', priority: 'critical', dept: 'HMWSSB', district: 'Hyderabad',
    title: 'Sewage overflow near Hussain Sagar — Tank Bund road', lat: 17.4239, lng: 78.4738,
    desc: 'Overflow of dirty water mixed with silt from drains near Tank Bund road. Road is completely damaged and unsafe for pedestrians and commuters near Hussain Sagar lake.', addr: 'Tank Bund Road, near Hussain Sagar', pin: '500004' },
  { citizenIdx: 8, cat: 'drainage', sub: 'flooding', priority: 'critical', dept: 'GHMC', district: 'Rangareddy',
    title: 'Severe waterlogging in Rajendranagar during every rain', lat: 17.3245, lng: 78.4030,
    desc: 'Every time it rains, Rajendranagar streets get completely waterlogged. Water enters ground floor homes and shops. The drainage system installed 2 years ago is already non-functional. Infrastructure failure. GHMC must fix this before monsoon.', addr: 'Rajendranagar Main Road', pin: '500030' },

  // ─── LAW ENFORCEMENT (HYDPOL) ──────────────────────────────────
  { citizenIdx: 4, cat: 'law_enforcement', sub: null, priority: 'critical', dept: 'HYDPOL', district: 'Hyderabad',
    title: 'Bike-borne snatching spree near Hitech City Metro station', lat: 17.4435, lng: 78.3772,
    desc: 'Multiple snatching incidents by bike-borne thieves near Hitech City Metro station during evening hours. IT employees targeted for phones and gold chains. CCTV footage available. Hyderabad Police must increase patrolling.', addr: 'Hitech City Metro Station area', pin: '500081' },
  { citizenIdx: 8, cat: 'law_enforcement', sub: null, priority: 'high', dept: 'HYDPOL', district: 'Hyderabad',
    title: 'Eve-teasing near Dilsukhnagar bus stand during peak hours', lat: 17.3688, lng: 78.5266,
    desc: 'Groups of men harassing women at Dilsukhnagar bus stand during evening peak hours. Multiple women have complained but police presence is minimal. Need regular patrolling and CCTV monitoring.', addr: 'Dilsukhnagar Bus Stand', pin: '500060' },

  // ─── HEALTH (TSHFW) ──────────────────────────────────────────────
  { citizenIdx: 10, cat: 'health', sub: null, priority: 'critical', dept: 'TSHFW', district: 'Hyderabad',
    title: 'Dengue outbreak spreading in LB Nagar due to stagnant water', lat: 17.3498, lng: 78.5503,
    desc: '15 cases of dengue confirmed in LB Nagar area in last 2 weeks. Stagnant water in empty plots and blocked drains breeding mosquitoes. GHMC fumigation team came once and never returned. Health department needs to organize camp.', addr: 'LB Nagar / Saroornagar area', pin: '500074' },

  // ─── EDUCATION (TSEDU) ────────────────────────────────────────────
  { citizenIdx: 11, cat: 'education', sub: null, priority: 'medium', dept: 'TSEDU', district: 'Medchal-Malkajgiri',
    title: 'Teacher absent for 2 months in Alwal government school', lat: 17.5020, lng: 78.5180,
    desc: 'The science teacher in Zilla Parishad High School, Alwal has been absent for 2 months. Class 10 students have board exams approaching and no one is teaching physics and chemistry.', addr: 'ZPHS, Alwal', pin: '500010' },

  // ─── NOISE POLLUTION (HYDPOL) ──────────────────────────────────
  { citizenIdx: 1, cat: 'noise_pollution', sub: null, priority: 'medium', dept: 'HYDPOL', district: 'Hyderabad',
    title: 'Daily loud DJ music from function hall near Banjara Hills till 2 AM', lat: 17.4310, lng: 78.4230,
    desc: 'A wedding/function hall near Banjara Hills Road No. 12 plays extremely loud DJ music almost every night till 2 AM. Despite Supreme Court orders banning loudspeakers after 10 PM. Residents with elderly members and students affected.', addr: 'Near Banjara Hills Road No. 12', pin: '500034' },

  // ─── PARKS (GHMC) ──────────────────────────────────────────────
  { citizenIdx: 5, cat: 'parks', sub: null, priority: 'medium', dept: 'GHMC', district: 'Hyderabad',
    title: 'Overgrown trees and broken swings in KBR National Park perimeter', lat: 17.4233, lng: 78.4267,
    desc: 'The walking track area around KBR Park perimeter has become neglected. Overgrown trees blocking pathways, broken benches, and litter everywhere. Morning walkers and joggers affected.', addr: 'KBR National Park perimeter, Jubilee Hills', pin: '500033' },

  // ─── DUPLICATE COMPLAINT (same issue, different person)
  { citizenIdx: 14, cat: 'water_supply', sub: 'contamination', priority: 'critical', dept: 'HMWSSB', district: 'Hyderabad',
    title: 'Contaminated sewer-mixed water in Jubilee Hills — kids falling sick', lat: 17.4320, lng: 78.4110,
    desc: 'The tap water in Jubilee Hills Road No. 36 is coming mixed with sewage. My 7-year-old daughter had diarrhea and fever for 3 days from drinking this water. HMWSSB must immediately fix the pipeline cross-contamination.', addr: 'Road No. 36, Jubilee Hills', pin: '500033' },
];

// ══════════════════════════════════════════════════════════════════════════════
//  SEED EXECUTION
// ══════════════════════════════════════════════════════════════════════════════
async function seed() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  🌱  JanSamadhan — Telangana Seed Script        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // ── 1. Upsert State ────────────────────────────────────────────
  console.log('▸ Seeding Telangana state...');
  let { data: state } = await supabase.from('states').select('id').eq('name', TELANGANA_STATE.name).maybeSingle();
  if (!state) {
    const { data: s, error } = await supabase.from('states').insert(TELANGANA_STATE).select('id').single();
    if (error) { console.error('  ✗ State insert failed:', error.message); return; }
    state = s;
  }
  console.log(`  ✓ State: ${TELANGANA_STATE.name} (${state.id})`);

  // ── 2. Upsert Districts ────────────────────────────────────────
  console.log('▸ Seeding districts...');
  const districtMap = {};
  for (const dName of TELANGANA_DISTRICTS) {
    let { data: d } = await supabase.from('districts').select('id').eq('name', dName).eq('state_id', state.id).maybeSingle();
    if (!d) {
      const { data: ins } = await supabase.from('districts').insert({ name: dName, state_id: state.id }).select('id').single();
      d = ins;
    }
    if (d) districtMap[dName] = d.id;
  }
  console.log(`  ✓ ${Object.keys(districtMap).length} districts ready`);

  // ── 3. Upsert Departments ──────────────────────────────────────
  console.log('▸ Seeding departments...');
  const deptMap = {};
  for (const dept of DEPARTMENTS) {
    let { data: d } = await supabase.from('departments').select('id').eq('code', dept.code).maybeSingle();
    if (!d) {
      const { data: ins } = await supabase.from('departments').insert(dept).select('id').single();
      d = ins;
    } else {
      await supabase.from('departments').update({ name: dept.name, sla_hours: dept.sla_hours, contact_email: dept.contact_email }).eq('id', d.id);
    }
    if (d) deptMap[dept.code] = d.id;
  }
  console.log(`  ✓ ${Object.keys(deptMap).length} departments ready`);

  // ── 4. Create Citizens ─────────────────────────────────────────
  console.log('▸ Seeding 15 citizens...');
  const passwordHash = await bcrypt.hash('Telangana@123', 12);
  const citizenIds = [];
  for (const c of CITIZENS) {
    let { data: u } = await supabase.from('users').select('id').eq('email', c.email).maybeSingle();
    if (!u) {
      const { data: ins } = await supabase.from('users').insert({
        email: c.email, password_hash: passwordHash, full_name: c.full_name,
        phone: c.phone, role: 'citizen', address: c.address, pincode: c.pincode,
        state_id: state.id, is_active: true, points: Math.floor(Math.random() * 200), badge_level: 'newcomer'
      }).select('id').single();
      u = ins;
    }
    if (u) citizenIds.push(u.id);
  }
  console.log(`  ✓ ${citizenIds.length} citizens ready (password: Telangana@123)`);

  // ── 5. Create Officers ─────────────────────────────────────────
  console.log('▸ Seeding officers...');
  const officerHash = await bcrypt.hash('Officer@123', 12);
  for (const o of OFFICERS) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', o.email).maybeSingle();
    if (!existing && deptMap[o.dept]) {
      await supabase.from('users').insert({
        email: o.email, password_hash: officerHash, full_name: o.full_name,
        role: 'officer', department_id: deptMap[o.dept], employee_id: o.employee_id,
        state_id: state.id, is_active: true, is_verified: true, govt_badge: 'field_officer'
      });
    }
  }
  console.log(`  ✓ Officers ready (password: Officer@123)`);

  // ── 6. Create Admin ────────────────────────────────────────────
  console.log('▸ Ensuring admin account...');
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const { data: adminExists } = await supabase.from('users').select('id').eq('email', 'admin@jansamadhan.telangana.gov.in').maybeSingle();
  if (!adminExists) {
    await supabase.from('users').insert({
      email: 'admin@jansamadhan.telangana.gov.in', password_hash: adminHash,
      full_name: 'System Administrator — Telangana', role: 'super_admin',
      state_id: state.id, is_active: true, is_verified: true
    });
  }
  console.log('  ✓ Admin ready (admin@jansamadhan.telangana.gov.in / Admin@123)');

  // ── 7. Insert Complaints ───────────────────────────────────────
  console.log('▸ Seeding complaints...');
  const statuses = ['pending', 'pending', 'pending', 'assigned', 'in_progress', 'in_progress', 'resolved', 'escalated'];
  let inserted = 0;

  for (let i = 0; i < COMPLAINTS.length; i++) {
    const c = COMPLAINTS[i];
    const citizenId = citizenIds[c.citizenIdx % citizenIds.length];
    if (!citizenId) continue;

    const deptId = deptMap[c.dept];
    const distId = districtMap[c.district];
    const ticket = genTicket(i + 1);
    const status = randEl(statuses);
    const createdAt = randDate(28);
    const slaHours = DEPARTMENTS.find(d => d.code === c.dept)?.sla_hours || 48;
    const slaDeadline = new Date(new Date(createdAt).getTime() + slaHours * 3600000).toISOString();
    const slaBreach = status === 'resolved' ? Math.random() > 0.7 : (new Date() > new Date(slaDeadline));

    const payload = {
      ticket_number: ticket, citizen_id: citizenId,
      title: c.title, description: c.desc, category: c.cat,
      sub_category: c.sub || null, nlp_category: c.cat,
      nlp_confidence: parseFloat((0.75 + Math.random() * 0.24).toFixed(4)),
      nlp_keywords: c.title.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 6),
      sentiment: randEl(['negative', 'very_negative', 'neutral']),
      priority: c.priority, status,
      latitude: c.lat, longitude: c.lng,
      address: c.addr, pincode: c.pin,
      state_id: state.id, district_id: distId || null,
      department_id: deptId || null,
      sla_deadline: slaDeadline, sla_hours_allotted: slaHours, sla_breached: slaBreach,
      is_public: true, is_anonymous: Math.random() > 0.9,
      escalation_level: status === 'escalated' ? Math.floor(Math.random() * 3) + 1 : 0,
      view_count: Math.floor(Math.random() * 200),
      upvote_count: Math.floor(Math.random() * 30),
      duplicate_count: 0, images: [],
      created_at: createdAt
    };

    if (status === 'resolved') {
      payload.resolved_at = new Date(new Date(createdAt).getTime() + (Math.random() * slaHours * 0.8) * 3600000).toISOString();
      payload.resolution_notes = 'Issue inspected and resolved by field team. Work completed on site.';
    }

    const { data: comp, error } = await supabase.from('complaints').insert(payload).select('id').single();
    if (error) { console.error(`  ✗ Complaint ${i}: ${error.message}`); continue; }

    // Timeline entry
    await supabase.from('complaint_timeline').insert({
      complaint_id: comp.id, actor_id: citizenId, actor_role: 'citizen',
      action: 'created', new_value: 'pending',
      notes: `Auto-classified: ${c.cat}. Routed to ${c.dept}. SLA: ${slaHours}h`,
      created_at: createdAt
    });

    if (status !== 'pending') {
      await supabase.from('complaint_timeline').insert({
        complaint_id: comp.id, actor_id: citizenId, actor_role: 'system',
        action: 'status_changed', old_value: 'pending', new_value: status,
        notes: `Status updated to ${status}`,
        created_at: new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString()
      });
    }

    inserted++;
  }

  console.log(`  ✓ ${inserted} complaints seeded\n`);

  // ── Summary ────────────────────────────────────────────────────
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  ✅  Seed Complete!                              ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  State:       Telangana                         ║`);
  console.log(`║  Districts:   ${String(Object.keys(districtMap).length).padEnd(30)}║`);
  console.log(`║  Departments: ${String(Object.keys(deptMap).length).padEnd(30)}║`);
  console.log(`║  Citizens:    ${String(citizenIds.length).padEnd(30)}║`);
  console.log(`║  Officers:    ${String(OFFICERS.length).padEnd(30)}║`);
  console.log(`║  Complaints:  ${String(inserted).padEnd(30)}║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Login Credentials:                              ║');
  console.log('║  Citizens:  [email] / Telangana@123              ║');
  console.log('║  Officers:  [email] / Officer@123                ║');
  console.log('║  Admin:     admin@jansamadhan.telangana.gov.in   ║');
  console.log('║            / Admin@123                            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

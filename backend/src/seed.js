'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { supabase } = require('./config/supabase');

// ══════════════════════════════════════════════════════════════════════════════
//  JanSamadhan — Delhi NCR Seed Data
//  Run:  node src/seed.js
// ══════════════════════════════════════════════════════════════════════════════

const DELHI_STATE = { name: 'Delhi' };

const DELHI_DISTRICTS = [
  'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi',
  'Central Delhi', 'North East Delhi', 'North West Delhi',
  'South East Delhi', 'South West Delhi', 'Shahdara', 'New Delhi'
];

// ── Delhi-specific Departments ────────────────────────────────────────────────
const DEPARTMENTS = [
  { code: 'PWD',    name: 'Public Works Department (PWD Delhi)',       sla_hours: 48, contact_email: 'pwd@delhi.gov.in' },
  { code: 'DJB',    name: 'Delhi Jal Board (DJB)',                     sla_hours: 24, contact_email: 'djb@delhi.gov.in' },
  { code: 'BSES',   name: 'BSES / TPDDL — Electricity Distribution',  sla_hours: 12, contact_email: 'bses@delhi.gov.in' },
  { code: 'MCD',    name: 'Municipal Corporation of Delhi (MCD)',      sla_hours: 24, contact_email: 'mcd@delhi.gov.in' },
  { code: 'DPOL',   name: 'Delhi Police',                              sla_hours: 12, contact_email: 'police@delhi.gov.in' },
  { code: 'DFS',    name: 'Delhi Fire Services',                       sla_hours: 4,  contact_email: 'fire@delhi.gov.in' },
  { code: 'DUSIB',  name: 'Delhi Urban Shelter Improvement Board',     sla_hours: 72, contact_email: 'dusib@delhi.gov.in' },
  { code: 'DPCC',   name: 'Delhi Pollution Control Committee',         sla_hours: 48, contact_email: 'dpcc@delhi.gov.in' },
  { code: 'DTC',    name: 'Delhi Transport Corporation (DTC)',         sla_hours: 48, contact_email: 'dtc@delhi.gov.in' },
  { code: 'NDMC',   name: 'New Delhi Municipal Council (NDMC)',        sla_hours: 24, contact_email: 'ndmc@delhi.gov.in' },
  { code: 'HFW',    name: 'Health & Family Welfare — Delhi',           sla_hours: 24, contact_email: 'health@delhi.gov.in' },
  { code: 'EDU',    name: 'Directorate of Education — Delhi',          sla_hours: 96, contact_email: 'education@delhi.gov.in' },
  { code: 'PRD',    name: 'Parks & Garden Society — Delhi',            sla_hours: 72, contact_email: 'parks@delhi.gov.in' },
  { code: 'FNS',    name: 'Food & Supply Department — Delhi',          sla_hours: 72, contact_email: 'food@delhi.gov.in' },
  { code: 'REV',    name: 'Revenue Department — Delhi',                sla_hours: 120, contact_email: 'revenue@delhi.gov.in' },
];

// ── 15 Diverse Delhi Citizens ─────────────────────────────────────────────────
const CITIZENS = [
  { email: 'ramesh.kumar45@gmail.com',     full_name: 'Ramesh Kumar',       phone: '9811234501', address: 'B-12, Dwarka Sector 22', pincode: '110077' },
  { email: 'priya.sharma.delhi@gmail.com', full_name: 'Priya Sharma',       phone: '9899012302', address: '45, Lajpat Nagar II', pincode: '110024' },
  { email: 'mohd.arif.khan@yahoo.com',     full_name: 'Mohammad Arif Khan', phone: '9810345603', address: 'H-23, Seelampur', pincode: '110053' },
  { email: 'sunita.devi.nagar@gmail.com',  full_name: 'Sunita Devi',        phone: '9871456704', address: 'G-90, Sangam Vihar', pincode: '110062' },
  { email: 'vikram.singh.rohini@gmail.com',full_name: 'Vikram Singh',       phone: '9953567805', address: 'D-14, Rohini Sector 16', pincode: '110089' },
  { email: 'anjali.gupta.cr@outlook.com',  full_name: 'Anjali Gupta',       phone: '9818678906', address: 'CR Park, Block C-II', pincode: '110019' },
  { email: 'ravi.verma.burari@gmail.com',  full_name: 'Ravi Verma',         phone: '9873789007', address: 'Burari Main Road', pincode: '110084' },
  { email: 'neha.agarwal.saket@gmail.com', full_name: 'Neha Agarwal',       phone: '9910890108', address: '23, Saket G-Block', pincode: '110017' },
  { email: 'amit.jha.pahari@outlook.com',  full_name: 'Amit Jha',           phone: '9811901209', address: 'Paharganj, Main Bazaar', pincode: '110055' },
  { email: 'pooja.mishra.janakpuri@gmail.com', full_name: 'Pooja Mishra',   phone: '9868012310', address: 'C-5D Block, Janakpuri', pincode: '110058' },
  { email: 'suresh.yadav.mandawali@gmail.com', full_name: 'Suresh Yadav',   phone: '9999123411', address: 'Sewa Sadan Block, Mandawali', pincode: '110092' },
  { email: 'meena.rawat.uttamnagar@gmail.com', full_name: 'Meena Rawat',    phone: '9871234512', address: 'Vikas Nagar Extn, Uttam Nagar', pincode: '110059' },
  { email: 'deepak.tiwari.karolbagh@gmail.com',full_name: 'Deepak Tiwari',  phone: '9810345613', address: 'Karol Bagh, 16/7', pincode: '110005' },
  { email: 'fatima.begum.okhla@gmail.com', full_name: 'Fatima Begum',       phone: '9953456714', address: 'Okhla Phase-II', pincode: '110020' },
  { email: 'harpreet.kaur.tilak@gmail.com',full_name: 'Harpreet Kaur',      phone: '9818567815', address: 'Tilak Nagar, Block-D', pincode: '110018' },
];

// ── Officers per department ───────────────────────────────────────────────────
const OFFICERS = [
  { email: 'je.pwd.south@delhi.gov.in',     full_name: 'Rakesh Mehra (JE)',     dept: 'PWD',  employee_id: 'PWD-JE-4421' },
  { email: 'ae.djb.east@delhi.gov.in',      full_name: 'Manish Chandra (AE)',   dept: 'DJB',  employee_id: 'DJB-AE-1102' },
  { email: 'si.bses.nw@delhi.gov.in',       full_name: 'Kavita Rao (SI)',       dept: 'BSES', employee_id: 'BSES-SI-3301' },
  { email: 'so.mcd.south@delhi.gov.in',     full_name: 'Anil Saxena (SO)',      dept: 'MCD',  employee_id: 'MCD-SO-5500' },
  { email: 'si.delhipolice@delhi.gov.in',   full_name: 'Insp. Rajendra Pal',    dept: 'DPOL', employee_id: 'DP-SI-7890' },
  { email: 'je.ndmc.central@delhi.gov.in',  full_name: 'Sunil Bhatt (JE)',       dept: 'NDMC', employee_id: 'NDMC-JE-2210' },
  { email: 'mo.health.ne@delhi.gov.in',     full_name: 'Dr. Seema Kapoor (MO)', dept: 'HFW',  employee_id: 'HFW-MO-6601' },
  { email: 'insp.edu.west@delhi.gov.in',    full_name: 'Dinesh Chauhan (Insp)', dept: 'EDU',  employee_id: 'EDU-IN-8801' },
  { email: 'so.parks.south@delhi.gov.in',   full_name: 'Geeta Nair (SO)',        dept: 'PRD',  employee_id: 'PRD-SO-4401' },
  { email: 'insp.dpcc.env@delhi.gov.in',    full_name: 'Sanjay Malik (EI)',      dept: 'DPCC', employee_id: 'DPCC-EI-9901' },
];

// ── Helper: random date in last N days ────────────────────────────────────────
const randDate = (daysBack = 30) => {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 6, Math.floor(Math.random() * 60));
  return d.toISOString();
};
const randEl = (arr) => arr[Math.floor(Math.random() * arr.length)];
const genTicket = (i) => `DEL-${Date.now().toString().slice(-5)}${(i).toString().padStart(3, '0')}`;

// ── 55 Realistic Delhi Complaints ─────────────────────────────────────────────
// Each complaint is filed by a DIFFERENT citizen (round-robin + random)
const COMPLAINTS = [
  // ─── ROADS (PWD) ─────────────────────────────────────────────────
  { citizenIdx: 0, cat: 'roads', sub: 'pothole', priority: 'critical', dept: 'PWD', district: 'South West Delhi',
    title: 'Massive potholes on Dwarka Sector 23 — Goyla Dairy Road', lat: 28.5720, lng: 77.0520,
    desc: 'Road caved in due to improper earth filling after DJB sewer work near Possangipur Park. Huge potholes causing traffic restrictions and accidents. Multiple two-wheelers have fallen. PWD please repair urgently.', addr: 'Goyla Dairy Road, Dwarka Sec 23', pin: '110077' },
  { citizenIdx: 6, cat: 'roads', sub: 'road_damage', priority: 'high', dept: 'PWD', district: 'North Delhi',
    title: 'Deep potholes on Burari — Jharoda Metro Station road', lat: 28.7580, lng: 77.2100,
    desc: 'Road from Jharoda Metro Station to Baba Colony is extremely damaged. Deep potholes and broken surface. Commuters especially bikes and autos are struggling daily. Serious risk of accidents.', addr: 'Pushta Road, Burari', pin: '110084' },
  { citizenIdx: 4, cat: 'roads', sub: 'pothole', priority: 'high', dept: 'PWD', district: 'North West Delhi',
    title: 'Multiple large potholes in Prashant Vihar D-Block', lat: 28.7050, lng: 77.1360,
    desc: 'Large potholes on the road have made it dilapidated and hazardous for vehicles and pedestrians, especially children walking to school. Despite repeated complaints to PWD, no action taken for 3 weeks.', addr: 'D-Block, Prashant Vihar, Rohini', pin: '110085' },
  { citizenIdx: 7, cat: 'roads', sub: null, priority: 'medium', dept: 'PWD', district: 'South Delhi',
    title: 'Broken road and damaged footpath near Saket G-Block market', lat: 28.5230, lng: 77.2070,
    desc: 'Broken road stretches and uneven footpaths near G-Block market area. Pedestrians forced to walk on the road. The area gets waterlogged during rain making it dangerous.', addr: 'Saket G-Block, near market', pin: '110017' },
  { citizenIdx: 1, cat: 'roads', sub: 'road_damage', priority: 'critical', dept: 'PWD', district: 'South Delhi',
    title: 'Fatal pothole cluster on Mehrauli-Badarpur Road', lat: 28.5180, lng: 77.2280,
    desc: 'Severe pothole cluster near Press Enclave junction on Mehrauli-Badarpur Road. A biker was seriously injured last week after hitting a water-filled pothole. Despite PWD inspection, recurring damage persists.', addr: 'Mehrauli-Badarpur Road, near Press Enclave', pin: '110030' },

  // ─── WATER SUPPLY (DJB) ─────────────────────────────────────────
  { citizenIdx: 9, cat: 'water_supply', sub: 'contamination', priority: 'critical', dept: 'DJB', district: 'West Delhi',
    title: 'Sewage-contaminated water supply in Janakpuri A-1 Block', lat: 28.6210, lng: 77.0810,
    desc: 'For the last 2 weeks, drinking water coming from DJB taps is contaminated with sewage. Lab tests by RWA confirmed E. coli and coliform. Entire block of 200 families is buying mineral water. Children falling sick. Urgent fixing needed.', addr: 'A-1 Block, Janakpuri', pin: '110058' },
  { citizenIdx: 2, cat: 'water_supply', sub: 'no_supply', priority: 'critical', dept: 'DJB', district: 'North East Delhi',
    title: 'Severe pipeline leakage wasting water near Welcome', lat: 28.6830, lng: 77.2720,
    desc: 'Major water leakage from DJB pipeline at C-53 Welcome near CNG Station, Pushp Bhawan. Drinking water being wasted for months now. No one has come to repair despite complaint on 1916 helpline.', addr: 'Welcome C-53, near CNG Station', pin: '110053' },
  { citizenIdx: 3, cat: 'water_supply', sub: 'no_supply', priority: 'high', dept: 'DJB', district: 'South Delhi',
    title: 'No water supply for 3 months in Rajpur Extension', lat: 28.5050, lng: 77.1600,
    desc: 'There has been zero water supply from DJB for the past 3 months in Rajpur Extension near Chattarpur. We have filed multiple complaints on consumer forums and 1916 helpline. Nobody responds. We are buying tanker water at Rs 1500 per trip.', addr: 'Rajpur Extension, near Chattarpur', pin: '110068' },
  { citizenIdx: 5, cat: 'water_supply', sub: 'contamination', priority: 'critical', dept: 'DJB', district: 'East Delhi',
    title: 'Dirty yellowish water supply in East Vinod Nagar R-Block', lat: 28.6170, lng: 77.2960,
    desc: 'Extremely dirty yellowish water from DJB supply in R-Block, East Vinod Nagar. Not safe for drinking, cooking, or even bathing. Recent lab tests showed coliform and E. coli. Children have developed skin rashes. Delhi government must act now.', addr: 'R-Block, East Vinod Nagar', pin: '110091' },
  { citizenIdx: 12, cat: 'water_supply', sub: 'leakage', priority: 'medium', dept: 'DJB', district: 'North West Delhi',
    title: 'Water supply only 2 hours per week in Chander Vihar Nilothi', lat: 28.6820, lng: 77.0490,
    desc: 'DJB water supply comes only for 2 hours on Wednesday and Saturday evenings in Chander Vihar Nilothi Extension. This has been going on for 10 years. We request regular daily supply like other areas.', addr: 'Chander Vihar, Nilothi Extension', pin: '110041' },

  // ─── ELECTRICITY (BSES/TPDDL) ──────────────────────────────────
  { citizenIdx: 4, cat: 'electricity', sub: 'power_outage', priority: 'high', dept: 'BSES', district: 'North East Delhi',
    title: 'Prolonged 6-hour daily power cuts in Yamuna Vihar (BYPL)', lat: 28.6990, lng: 77.2710,
    desc: 'BYPL Yamuna Vihar Division has been facing scheduled outages from 11 AM to 5 PM on multiple days in March. These 6-hour daily shutdowns are disrupting daily life, work-from-home setups, and student exam preparation. This is unacceptable in the capital city.', addr: 'Yamuna Vihar', pin: '110053' },
  { citizenIdx: 1, cat: 'electricity', sub: 'power_outage', priority: 'high', dept: 'BSES', district: 'East Delhi',
    title: 'Repeated power cuts in Krishna Nagar and Laxmi Nagar', lat: 28.6530, lng: 77.2770,
    desc: 'Multiple overlapping shutdowns in the same week affecting Krishna Nagar from 10 AM to 12 PM, 11:30 AM to 2:30 PM, and 2:30 PM to 4:30 PM. Effectively leaving parts of the area without power for most of the working day. Small shopkeepers losing business daily.', addr: 'Krishna Nagar / Laxmi Nagar', pin: '110051' },
  { citizenIdx: 6, cat: 'electricity', sub: 'transformer', priority: 'critical', dept: 'BSES', district: 'North Delhi',
    title: 'Political row over widespread outages in Burari — Jagatpur Extension', lat: 28.7530, lng: 77.2060,
    desc: 'Continuous power outages in Burari and Jagatpur Extension area for the last 10 days. Local transformer keeps tripping. No electricity for 8-10 hours daily. Families with elderly and infants are suffering. Even our inverters can\'t handle this.', addr: 'Burari / Jagatpur Extension', pin: '110084' },
  { citizenIdx: 11, cat: 'electricity', sub: 'power_outage', priority: 'critical', dept: 'BSES', district: 'West Delhi',
    title: 'Four-hour power outage in Sainik Enclave, Mohan Garden', lat: 28.6130, lng: 77.0250,
    desc: 'On 9th March there was a 4-hour power outage in Sainik Enclave, Mohan Garden. This is happening regularly. People are forced to buy inverters. Uttam Nagar, Vikas Puri also affected. BSES helpline just gives ticket numbers but no action.', addr: 'Sainik Enclave, Mohan Garden, Uttam Nagar', pin: '110059' },
  { citizenIdx: 14, cat: 'electricity', sub: 'street_light', priority: 'medium', dept: 'BSES', district: 'South West Delhi',
    title: 'All street lights off on Tilak Nagar main road for 2 weeks', lat: 28.6370, lng: 77.0940,
    desc: 'All street lights on the main road from Tilak Nagar Metro to Subhash Nagar have been off for the past 2 weeks. The road is pitch dark after 7 PM. Women and elderly people afraid to walk. Accident risk is very high.', addr: 'Main Road, Tilak Nagar', pin: '110018' },

  // ─── WASTE MANAGEMENT / SANITATION (MCD) ────────────────────────
  { citizenIdx: 3, cat: 'waste_management', sub: null, priority: 'critical', dept: 'MCD', district: 'South Delhi',
    title: 'Open sewage flow and garbage piling in Sangam Vihar', lat: 28.5110, lng: 77.2350,
    desc: 'Open drains with sewage flowing directly onto streets mixed with piled-up garbage. We are forced to walk through filth daily. Major health and hygiene risk. This is the capital of India. MCD has completely ignored Sangam Vihar.', addr: 'Sangam Vihar, residential lanes', pin: '110062' },
  { citizenIdx: 10, cat: 'waste_management', sub: null, priority: 'high', dept: 'MCD', district: 'East Delhi',
    title: 'Overflowing garbage bins in Mandawali Sewa Sadan Block', lat: 28.6290, lng: 77.2920,
    desc: 'Severe cleanliness issues in Mandawali, Sewa Sadan Block. Overflowing garbage bins, littered streets, and unbearable stench. The situation has worsened over the past 2 months. Creating unhygienic environment and health risk for all 5000+ residents.', addr: 'Sewa Sadan Block, Mandawali', pin: '110092' },
  { citizenIdx: 0, cat: 'waste_management', sub: null, priority: 'high', dept: 'MCD', district: 'South West Delhi',
    title: 'Garbage not collected for weeks in Dwarka Sector 10 & 22', lat: 28.5830, lng: 77.0560,
    desc: 'Garbage not collected for weeks, leading to overflowing dumpsters and large accumulations on roadsides opposite Supriya Apartment. Piles of mixed waste, plastic smell, and potential fire risks. Photos attached. MCD Dwarka zone please respond.', addr: 'Dwarka Sector 10, opp. Supriya Apartment', pin: '110075' },
  { citizenIdx: 11, cat: 'waste_management', sub: null, priority: 'high', dept: 'MCD', district: 'West Delhi',
    title: 'Garbage spread everywhere on Uttam Nagar to Janak Cinema road', lat: 28.6200, lng: 77.0520,
    desc: 'The road from Uttam Nagar to Janak Cinema is extremely bad because garbage is spread everywhere along the road. In Mohan Garden, waste pickers are refusing to take garbage and behaving rudely with residents. SWM rules being completely violated.', addr: 'Road from Uttam Nagar to Janak Cinema', pin: '110059' },
  { citizenIdx: 13, cat: 'waste_management', sub: null, priority: 'medium', dept: 'MCD', district: 'South East Delhi',
    title: 'Persistent garbage dump at Badarpur Border not cleaned', lat: 28.5020, lng: 77.3020,
    desc: 'Long-standing garbage dump at Badarpur Border that was complained about via MCD 311 app but closed without actual cleanup. They used old photo as proof of cleaning. Garbage is still piled up. This is fraud by MCD officials.', addr: 'Badarpur Border', pin: '110044' },

  // ─── DRAINAGE (DJB) ─────────────────────────────────────────────
  { citizenIdx: 13, cat: 'drainage', sub: 'blockage', priority: 'critical', dept: 'DJB', district: 'South East Delhi',
    title: 'Sewage overflow from Okhla landfill drains onto Ma Anandmayee Marg', lat: 28.5350, lng: 77.2700,
    desc: 'Overflow of dirty water mixed with silt from drains at Okhla sanitary landfill is repeatedly spilling onto Ma Anandmayee Marg. Road is completely damaged and unsafe for commuters. Heavy MCD garbage trucks and poor landfill-side drainage causing this.', addr: 'Ma Anandmayee Marg, near Okhla landfill', pin: '110025' },
  { citizenIdx: 3, cat: 'drainage', sub: 'flooding', priority: 'critical', dept: 'DJB', district: 'South West Delhi',
    title: 'Overflowing newly laid drainage line at Sultanpur Tile Market', lat: 28.5010, lng: 77.0800,
    desc: 'Newly laid drainage line at Sultanpur Tile Market (312, off Mandi Road, opposite CDOT) is already overflowing. Waterlogging and sewage backup in the commercial area. Infrastructure failure within weeks of installation. Complete waste of taxpayer money.', addr: '312, Sultanpur Tile Market, off Mandi Road', pin: '110030' },
  { citizenIdx: 8, cat: 'drainage', sub: 'blockage', priority: 'high', dept: 'MCD', district: 'West Delhi',
    title: 'Sewage overflow from industrial waste in Vishnu Garden NW Block', lat: 28.6490, lng: 77.0820,
    desc: 'Industrial waste from a jeans dyeing unit is being dumped into colony drains in NW Block Vishnu Garden, blocking drains and sewage lines. Sewage overflows on roads daily. Drinking water is also contaminated. NHRC has taken notice. MCD and DJB must act.', addr: 'NW Block, Vishnu Garden', pin: '110018' },

  // ─── LAW ENFORCEMENT / CRIME (POLICE) ──────────────────────────
  { citizenIdx: 4, cat: 'law_enforcement', sub: null, priority: 'critical', dept: 'DPOL', district: 'North West Delhi',
    title: 'Bike-borne snatching & robbery spree in Rohini Sector 20-23', lat: 28.7150, lng: 77.1180,
    desc: 'A woman was attacked with knife by bike-borne robbers while dropping her child at school near Central Park, Sector 20 Rohini. Video went viral. Another person stabbed during mobile robbery in Sector-23. Serial snatcher with 40+ cases was active here. Delhi Police must increase patrolling immediately.', addr: 'Rohini Sector 20-23, near Central Park', pin: '110086' },
  { citizenIdx: 8, cat: 'law_enforcement', sub: null, priority: 'critical', dept: 'DPOL', district: 'West Delhi',
    title: 'Crypto-linked armed robbery near Paschim Vihar East Metro', lat: 28.6710, lng: 77.0960,
    desc: 'A B.Tech student was robbed at gunpoint near Paschim Vihar East Metro station after being lured via Instagram crypto ad. 5-6 armed men surrounded his car and stole Rs 1.83 lakh. Same gang linked to robberies in Netaji Subhash Place and Budh Vihar. This area is becoming very unsafe.', addr: 'Near Paschim Vihar East Metro Station', pin: '110063' },
  { citizenIdx: 5, cat: 'law_enforcement', sub: null, priority: 'high', dept: 'DPOL', district: 'South Delhi',
    title: 'Sexual harassment on Delhi Metro — Saket to INA stretch', lat: 28.5280, lng: 77.2130,
    desc: 'Incidents of molestation and harassment on Delhi Metro between Saket and INA station continue despite CCTV surveillance and women-only coaches. My daughter faced obscene behavior by a man in general coach last week. FIR filed but need more security personnel.', addr: 'Delhi Metro, Saket-INA corridor', pin: '110016' },
  { citizenIdx: 2, cat: 'law_enforcement', sub: null, priority: 'high', dept: 'DPOL', district: 'North East Delhi',
    title: 'Organised car battery thefts in Vivek Vihar residential parking', lat: 28.6780, lng: 77.3120,
    desc: 'Multiple reports of organised gangs stealing car batteries from parked vehicles in Vivek Vihar residential areas. My battery was stolen on 19th March night. Neighbours also affected. CCTV shows same 3 people operating repeatedly. Police complaint filed but no arrests yet.', addr: 'Vivek Vihar, residential parking', pin: '110095' },
  { citizenIdx: 14, cat: 'law_enforcement', sub: null, priority: 'high', dept: 'DPOL', district: 'Central Delhi',
    title: 'Pickpocketing and eve-teasing rampant in Sadar Bazar market', lat: 28.6570, lng: 77.2090,
    desc: 'Hundreds of pickpocketing incidents daily in Sadar Bazar market as per local shopkeepers. Eve-teasing of women shoppers is also a serious problem. Footpaths encroached by vendors making escape easy for thieves. Need CCTV cameras and regular police patrolling.', addr: 'Sadar Bazar Market', pin: '110006' },
  { citizenIdx: 12, cat: 'law_enforcement', sub: null, priority: 'critical', dept: 'DPOL', district: 'North East Delhi',
    title: 'Repeated snatching incidents targeting women in Karawal Nagar', lat: 28.7230, lng: 77.2610,
    desc: 'Multiple snatching cases in Karawal Nagar. My mother was injured when someone snatched her gold earrings while she was walking home. She fell and fractured her wrist. Another woman was robbed of her phone last week. Delhi Police arrested some but incidents continue.', addr: 'Karawal Nagar, residential streets', pin: '110094' },
  { citizenIdx: 4, cat: 'law_enforcement', sub: null, priority: 'high', dept: 'DPOL', district: 'North West Delhi',
    title: 'Unsafe park — Drunk individuals harassing families in Rohini Sec 16', lat: 28.7120, lng: 77.1270,
    desc: 'Drunk men entering District Park in Rohini Sector 16, consuming alcohol openly, abusing visitors and fighting. This creates an extremely unsafe environment for women, children, and evening walkers. We need regular Delhi Police patrolling in the park.', addr: 'District Park, Rohini Sector 16', pin: '110089' },
  { citizenIdx: 7, cat: 'law_enforcement', sub: null, priority: 'medium', dept: 'DPOL', district: 'Shahdara',
    title: 'Traffic violations and signal jumping rampant near Anand Vihar', lat: 28.6460, lng: 77.3150,
    desc: 'Rampant traffic violations near Anand Vihar ISBT. Vehicles jumping red lights, wrong side driving, and illegal parking causing daily jams. Delhi Traffic Police presence is minimal. Need AI-powered CCTV cameras and regular challaning at this intersection.', addr: 'Near Anand Vihar ISBT intersection', pin: '110092' },
  { citizenIdx: 9, cat: 'law_enforcement', sub: null, priority: 'high', dept: 'DPOL', district: 'South East Delhi',
    title: 'Sonia Vihar — Dark streets and night safety crisis', lat: 28.7010, lng: 77.2560,
    desc: 'Sonia Vihar has no streetlights on most lanes, no police patrolling at night. Multiple incidents of chain snatching and mobile theft reported. Walking after 8 PM is extremely risky. Women and elderly cannot step out. We demand immediate police attention.', addr: 'Sonia Vihar main road and lanes', pin: '110094' },

  // ─── STREET LIGHTS (BSES/MCD) ──────────────────────────────────
  { citizenIdx: 2, cat: 'street_lights', sub: null, priority: 'high', dept: 'BSES', district: 'North East Delhi',
    title: 'No street lights working in Seelampur for over a month', lat: 28.6770, lng: 77.2680,
    desc: 'All street lights in Seelampur near Metro station surroundings have been off for over a month. The area is poorly lit with overcrowded narrow lanes. Petty crime has increased. Multiple people robbed in dark lanes. BSES/MCD must replace the bulbs immediately.', addr: 'Seelampur, near Metro station', pin: '110053' },

  // ─── HEALTH (HFW) ──────────────────────────────────────────────
  { citizenIdx: 10, cat: 'health', sub: null, priority: 'critical', dept: 'HFW', district: 'East Delhi',
    title: 'Dengue outbreak spreading in Mandawali due to stagnant water', lat: 28.6280, lng: 77.2900,
    desc: '12 cases of dengue confirmed in Mandawali/Patparganj area in last 2 weeks. Stagnant water in empty plots and blocked drains breeding mosquitoes. MCD fumigation team came once and never returned. Health department needs to organize camp and regular spraying.', addr: 'Mandawali/Patparganj area', pin: '110092' },
  { citizenIdx: 8, cat: 'health', sub: null, priority: 'high', dept: 'HFW', district: 'Central Delhi',
    title: 'No doctors in Moti Nagar government dispensary', lat: 28.6620, lng: 77.1480,
    desc: 'The government dispensary in Moti Nagar has had no doctor for the past 3 weeks. Only a pharmacist sits there who refuses to see patients. Hundreds of poor families depend on this dispensary for affordable healthcare. Health department must deploy doctors immediately.', addr: 'Govt Dispensary, Moti Nagar', pin: '110015' },

  // ─── PARKS & RECREATION (PRD) ──────────────────────────────────
  { citizenIdx: 5, cat: 'parks', sub: null, priority: 'medium', dept: 'PRD', district: 'South Delhi',
    title: 'Overgrown trees and broken swings in CR Park garden', lat: 28.5360, lng: 77.2470,
    desc: 'The main garden in CR Park has become neglected. Trees are overgrown blocking sunlight, fallen branches not cleared, swings and slides are broken and rusted. Children got hurt playing on broken equipment last week. Parks department please maintain this regularly.', addr: 'CR Park, main garden area', pin: '110019' },
  { citizenIdx: 6, cat: 'parks', sub: null, priority: 'low', dept: 'PRD', district: 'North Delhi',
    title: 'Fallen tree blocking park pathway in Kamla Nagar', lat: 28.6870, lng: 77.2080,
    desc: 'A large tree has fallen across the walking path in Kamla Nagar park after the recent storm. It has been lying there for 5 days. Morning walkers have to take an alternate muddy route. Park maintenance should clear it and trim other dangerous branches.', addr: 'Park near Kamla Nagar market', pin: '110007' },

  // ─── INFRASTRUCTURE (PWD) ──────────────────────────────────────
  { citizenIdx: 7, cat: 'infrastructure', sub: null, priority: 'critical', dept: 'PWD', district: 'South West Delhi',
    title: 'Damaged footpaths blocking pedestrians in Dwarka Sector 22', lat: 28.5710, lng: 77.0490,
    desc: 'Encroachments and severe damage on footpaths in CSC-I Sector-22 Dwarka. Pedestrians are forced to walk on the main road alongside heavy traffic. Court orders to keep footpaths clear are being violated. Urgent PWD action needed to restore footpaths and remove encroachments.', addr: 'CSC-I, Dwarka Sector 22', pin: '110077' },
  { citizenIdx: 13, cat: 'infrastructure', sub: null, priority: 'high', dept: 'MCD', district: 'East Delhi',
    title: 'Open unsafe drain causing injuries in West Vinod Nagar', lat: 28.6200, lng: 77.2900,
    desc: 'Open drain and pits left exposed for over 10 days during repair work in West Vinod Nagar. A 75-year-old woman fell into the drain and was hospitalized with hip injury. Tree branches used as makeshift cover cannot protect people. Drain must be properly covered to restore safe access.', addr: 'West Vinod Nagar (Mandawali side)', pin: '110092' },

  // ─── EDUCATION (EDU) ────────────────────────────────────────────
  { citizenIdx: 11, cat: 'education', sub: null, priority: 'medium', dept: 'EDU', district: 'West Delhi',
    title: 'Teacher absent for 2 months in Uttam Nagar government school', lat: 28.6200, lng: 77.0480,
    desc: 'The science teacher in Sarvodaya Vidyalaya, Uttam Nagar has been absent for 2 months. Class 10 students have board exams approaching and no one is teaching physics and chemistry. Principal says they have requested a substitute but Education Dept has not responded.', addr: 'Sarvodaya Vidyalaya, Uttam Nagar', pin: '110059' },
  { citizenIdx: 3, cat: 'education', sub: null, priority: 'high', dept: 'EDU', district: 'South Delhi',
    title: 'Midday meal quality deteriorated in Sangam Vihar school', lat: 28.5100, lng: 77.2370,
    desc: 'Children in government primary school, Sangam Vihar are getting very poor quality midday meals. Yesterday 8 children fell sick with vomiting and diarrhea after eating the dal-rice. Parents are furious. Education and Health department must investigate the meal contractor.', addr: 'Govt Primary School, Sangam Vihar', pin: '110062' },

  // ─── PUBLIC SERVICES (NDMC/MCD) ─────────────────────────────────
  { citizenIdx: 8, cat: 'public_services', sub: null, priority: 'medium', dept: 'NDMC', district: 'New Delhi',
    title: 'Ration shop not opening for 3 weeks in Paharganj', lat: 28.6430, lng: 77.2130,
    desc: 'The Fair Price Shop (ration shop) in Paharganj near Main Bazaar has not opened for 3 weeks. About 400 families who depend on subsidized ration are suffering. The shopkeeper is apparently diverting rations. Food & Supply department must investigate and ensure regular opening.', addr: 'Near Main Bazaar, Paharganj', pin: '110055' },
  { citizenIdx: 12, cat: 'public_services', sub: null, priority: 'low', dept: 'REV', district: 'Central Delhi',
    title: 'Caste certificate pending for 6 months — Karol Bagh SDM office', lat: 28.6510, lng: 77.1900,
    desc: 'I applied for SC caste certificate at Karol Bagh SDM office 6 months ago. Despite submitting all documents and completing verification, the certificate has not been issued. I need it urgently for my daughter\'s college admission. Multiple visits to the office yielded no result.', addr: 'SDM Office, Karol Bagh', pin: '110005' },

  // ─── NOISE POLLUTION (DPCC/POLICE) ──────────────────────────────
  { citizenIdx: 1, cat: 'noise_pollution', sub: null, priority: 'medium', dept: 'DPOL', district: 'South Delhi',
    title: 'Daily loud DJ music from wedding hall near Lajpat Nagar till 2 AM', lat: 28.5700, lng: 77.2360,
    desc: 'A wedding/banquet hall near Lajpat Nagar II plays extremely loud DJ music almost every night till 2 AM. Despite Supreme Court orders banning loudspeakers after 10 PM, this continues. Residents with elderly members and students preparing for exams are severely affected. Police should enforce noise rules.', addr: 'Near Lajpat Nagar II, banquet hall road', pin: '110024' },
  { citizenIdx: 14, cat: 'noise_pollution', sub: null, priority: 'low', dept: 'DPOL', district: 'South West Delhi',
    title: 'Construction noise during early morning hours in Tilak Nagar', lat: 28.6380, lng: 77.0960,
    desc: 'A commercial building under construction in D-Block Tilak Nagar starts work at 5:30 AM with heavy machinery noise including drilling and concrete mixer. This disturbs sleep of residents in adjacent buildings. Construction should follow norms and start only after 7 AM.', addr: 'D-Block, Tilak Nagar', pin: '110018' },

  // ─── FIRE SAFETY / ELECTRICITY (DFS) ────────────────────────────
  { citizenIdx: 13, cat: 'electricity', sub: 'live_wire', priority: 'critical', dept: 'BSES', district: 'South West Delhi',
    title: 'Fire and electrical safety hazard from faulty wiring in Palam', lat: 28.5810, lng: 77.0880,
    desc: 'Exposed and dangling electric wires in the narrow lanes of Palam village area. After the recent devastating fire that killed 9 family members in a Palam building on March 18, residents are terrified. These wires could cause short circuit anytime. BSES / Delhi Fire Services must inspect and fix all wiring immediately.', addr: 'Palam Village lanes', pin: '110045' },

  // ─── DUPLICATE COMPLAINT (intentional — by different person on same issue)
  { citizenIdx: 14, cat: 'water_supply', sub: 'contamination', priority: 'critical', dept: 'DJB', district: 'West Delhi',
    title: 'Contaminated sewer-mixed water in Janakpuri — kids falling sick', lat: 28.6220, lng: 77.0830,
    desc: 'The tap water in Janakpuri A-1 Block is coming mixed with sewage. My 7-year-old daughter had diarrhea and fever for 3 days from drinking this water. All families buying Bisleri now. DJB must immediately fix the pipeline cross-contamination. We cannot keep spending Rs 500/day on bottled water.', addr: 'A-1 Block, Janakpuri', pin: '110058' },
  { citizenIdx: 10, cat: 'roads', sub: 'pothole', priority: 'high', dept: 'PWD', district: 'South West Delhi',
    title: 'Potholes outside Dwarka Sector 14 Metro Gate No. 1', lat: 28.5760, lng: 77.0450,
    desc: 'Right outside Dwarka Sector 14 Metro station Gate No. 1, commuters step out to broken and uneven roads full of potholes. During peak hours hundreds of passengers face this daily hazard. E-rickshaw drivers report vehicle damage and tipping risks due to craters. Fix the roads PWD!', addr: 'Dwarka Sector 14, Metro Gate No. 1', pin: '110078' },
];

// ══════════════════════════════════════════════════════════════════════════════
//  SEED EXECUTION
// ══════════════════════════════════════════════════════════════════════════════
async function seed() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  🌱  JanSamadhan — Delhi Seed Script         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── 1. Upsert State ────────────────────────────────────────────
  console.log('▸ Seeding Delhi state...');
  let { data: state } = await supabase.from('states').select('id').eq('name', DELHI_STATE.name).maybeSingle();
  if (!state) {
    const { data: s, error } = await supabase.from('states').insert(DELHI_STATE).select('id').single();
    if (error) { console.error('  ✗ State insert failed:', error.message); return; }
    state = s;
  }
  console.log(`  ✓ State: ${DELHI_STATE.name} (${state.id})`);

  // ── 2. Upsert Districts ────────────────────────────────────────
  console.log('▸ Seeding districts...');
  const districtMap = {};
  for (const dName of DELHI_DISTRICTS) {
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
  const passwordHash = await bcrypt.hash('Delhi@123', 12);
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
  console.log(`  ✓ ${citizenIds.length} citizens ready (password: Delhi@123)`);

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
  const { data: adminExists } = await supabase.from('users').select('id').eq('email', 'admin@jansamadhan.delhi.gov.in').maybeSingle();
  if (!adminExists) {
    await supabase.from('users').insert({
      email: 'admin@jansamadhan.delhi.gov.in', password_hash: adminHash,
      full_name: 'System Administrator', role: 'super_admin',
      state_id: state.id, is_active: true, is_verified: true
    });
  }
  console.log('  ✓ Admin ready (admin@jansamadhan.delhi.gov.in / Admin@123)');

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
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  ✅  Seed Complete!                          ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  State:       Delhi                         ║`);
  console.log(`║  Districts:   ${String(Object.keys(districtMap).length).padEnd(30)}║`);
  console.log(`║  Departments: ${String(Object.keys(deptMap).length).padEnd(30)}║`);
  console.log(`║  Citizens:    ${String(citizenIds.length).padEnd(30)}║`);
  console.log(`║  Officers:    ${String(OFFICERS.length).padEnd(30)}║`);
  console.log(`║  Complaints:  ${String(inserted).padEnd(30)}║`);
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Login Credentials:                         ║');
  console.log('║  Citizens:  [email] / Delhi@123             ║');
  console.log('║  Officers:  [email] / Officer@123           ║');
  console.log('║  Admin:     admin@jansamadhan.delhi.gov.in  ║');
  console.log('║            / Admin@123                      ║');
  console.log('╚══════════════════════════════════════════════╝\n');
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

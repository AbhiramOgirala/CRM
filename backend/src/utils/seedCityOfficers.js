'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ══════════════════════════════════════════════════════════════════════════════
//  JanSamadhan — City Officers Seed (Hyderabad, Mumbai, Kolkata, Bengaluru)
//  Run: node src/utils/seedCityOfficers.js
//  Each officer is assigned: department_id + district_id (area-based routing)
// ══════════════════════════════════════════════════════════════════════════════

const CITY_DATA = [
  // ── HYDERABAD (Telangana) ─────────────────────────────────────────────────
  {
    state: 'Telangana',
    departments: [
      { code: 'GHMC',    name: 'Greater Hyderabad Municipal Corporation',  sla_hours: 24, contact_email: 'ghmc@telangana.gov.in' },
      { code: 'HMWSSB', name: 'Hyderabad Metro Water Supply & Sewerage',   sla_hours: 24, contact_email: 'hmwssb@telangana.gov.in' },
      { code: 'TSSPDCL',name: 'TS Southern Power Distribution Company',    sla_hours: 12, contact_email: 'tsspdcl@telangana.gov.in' },
      { code: 'TSRTC',  name: 'Telangana State Road Transport Corporation', sla_hours: 48, contact_email: 'tsrtc@telangana.gov.in' },
      { code: 'HYDPOL', name: 'Hyderabad City Police',                     sla_hours: 12, contact_email: 'police@hyderabad.gov.in' },
      { code: 'HMDA',   name: 'Hyderabad Metropolitan Development Authority', sla_hours: 72, contact_email: 'hmda@telangana.gov.in' },
      { code: 'TSHFW',  name: 'Health & Family Welfare — Telangana',       sla_hours: 24, contact_email: 'health@telangana.gov.in' },
      { code: 'TSEDU',  name: 'School Education Department — Telangana',   sla_hours: 96, contact_email: 'education@telangana.gov.in' },
    ],
    officers: [
      // Hyderabad district officers
      { email: 'ae.hmwssb.hyd@telangana.gov.in',    full_name: 'Suresh Reddy (AE)',       dept: 'HMWSSB',  district: 'Hyderabad',           employee_id: 'HMWSSB-AE-1001' },
      { email: 'je.ghmc.hyd@telangana.gov.in',      full_name: 'Ramana Rao (JE)',         dept: 'GHMC',    district: 'Hyderabad',           employee_id: 'GHMC-JE-2001' },
      { email: 'ae.tsspdcl.hyd@telangana.gov.in',   full_name: 'Venkat Naidu (AE)',       dept: 'TSSPDCL', district: 'Hyderabad',           employee_id: 'TSSPDCL-AE-3001' },
      { email: 'si.hydpol.hyd@telangana.gov.in',    full_name: 'Insp. Kishore Kumar',     dept: 'HYDPOL',  district: 'Hyderabad',           employee_id: 'HYDPOL-SI-4001' },
      { email: 'mo.tshfw.hyd@telangana.gov.in',     full_name: 'Dr. Padmavathi (MO)',     dept: 'TSHFW',   district: 'Hyderabad',           employee_id: 'TSHFW-MO-5001' },
      { email: 'insp.tsedu.hyd@telangana.gov.in',   full_name: 'Laxmi Prasad (DEO)',      dept: 'TSEDU',   district: 'Hyderabad',           employee_id: 'TSEDU-IN-6001' },
      // Rangareddy district officers
      { email: 'ae.hmwssb.rr@telangana.gov.in',     full_name: 'Srinivas Goud (AE)',      dept: 'HMWSSB',  district: 'Rangareddy',          employee_id: 'HMWSSB-AE-1002' },
      { email: 'je.ghmc.rr@telangana.gov.in',       full_name: 'Mahesh Babu (JE)',        dept: 'GHMC',    district: 'Rangareddy',          employee_id: 'GHMC-JE-2002' },
      { email: 'ae.tsspdcl.rr@telangana.gov.in',    full_name: 'Ravi Shankar (AE)',       dept: 'TSSPDCL', district: 'Rangareddy',          employee_id: 'TSSPDCL-AE-3002' },
      { email: 'si.hydpol.rr@telangana.gov.in',     full_name: 'Insp. Nagarjuna Rao',     dept: 'HYDPOL',  district: 'Rangareddy',          employee_id: 'HYDPOL-SI-4002' },
      // Medchal-Malkajgiri district officers
      { email: 'ae.hmwssb.med@telangana.gov.in',    full_name: 'Prasad Varma (AE)',       dept: 'HMWSSB',  district: 'Medchal-Malkajgiri',  employee_id: 'HMWSSB-AE-1003' },
      { email: 'je.ghmc.med@telangana.gov.in',      full_name: 'Chandra Sekhar (JE)',     dept: 'GHMC',    district: 'Medchal-Malkajgiri',  employee_id: 'GHMC-JE-2003' },
      { email: 'ae.tsspdcl.med@telangana.gov.in',   full_name: 'Satish Kumar (AE)',       dept: 'TSSPDCL', district: 'Medchal-Malkajgiri',  employee_id: 'TSSPDCL-AE-3003' },
    ],
  },

  // ── MUMBAI (Maharashtra) ──────────────────────────────────────────────────
  {
    state: 'Maharashtra',
    departments: [
      { code: 'BMC',    name: 'Brihanmumbai Municipal Corporation (BMC)',   sla_hours: 24, contact_email: 'bmc@maharashtra.gov.in' },
      { code: 'MSEDCL', name: 'Maharashtra State Electricity Distribution', sla_hours: 12, contact_email: 'msedcl@maharashtra.gov.in' },
      { code: 'MWRRA', name: 'Maharashtra Water Resources Regulatory Auth', sla_hours: 24, contact_email: 'mwrra@maharashtra.gov.in' },
      { code: 'MUMPOL', name: 'Mumbai Police',                              sla_hours: 12, contact_email: 'police@mumbai.gov.in' },
      { code: 'MMRDA', name: 'Mumbai Metropolitan Region Dev Authority',    sla_hours: 72, contact_email: 'mmrda@maharashtra.gov.in' },
      { code: 'MHFW',  name: 'Health & Family Welfare — Maharashtra',       sla_hours: 24, contact_email: 'health@maharashtra.gov.in' },
      { code: 'MHEDU', name: 'School Education Department — Maharashtra',   sla_hours: 96, contact_email: 'education@maharashtra.gov.in' },
    ],
    officers: [
      // Mumbai City district
      { email: 'ae.bmc.mumbai@maharashtra.gov.in',    full_name: 'Rajesh Patil (AE)',       dept: 'BMC',     district: 'Mumbai City',     employee_id: 'BMC-AE-1001' },
      { email: 'ae.msedcl.mumbai@maharashtra.gov.in', full_name: 'Sunil Desai (AE)',        dept: 'MSEDCL',  district: 'Mumbai City',     employee_id: 'MSEDCL-AE-2001' },
      { email: 'ae.mwrra.mumbai@maharashtra.gov.in',  full_name: 'Priya Joshi (AE)',        dept: 'MWRRA',   district: 'Mumbai City',     employee_id: 'MWRRA-AE-3001' },
      { email: 'si.mumpol.mumbai@maharashtra.gov.in', full_name: 'Insp. Anil Sawant',       dept: 'MUMPOL',  district: 'Mumbai City',     employee_id: 'MUMPOL-SI-4001' },
      { email: 'mo.mhfw.mumbai@maharashtra.gov.in',   full_name: 'Dr. Sneha Kulkarni (MO)', dept: 'MHFW',    district: 'Mumbai City',     employee_id: 'MHFW-MO-5001' },
      // Mumbai Suburban district
      { email: 'ae.bmc.suburban@maharashtra.gov.in',    full_name: 'Ganesh Naik (AE)',      dept: 'BMC',     district: 'Mumbai Suburban', employee_id: 'BMC-AE-1002' },
      { email: 'ae.msedcl.suburban@maharashtra.gov.in', full_name: 'Vikram More (AE)',      dept: 'MSEDCL',  district: 'Mumbai Suburban', employee_id: 'MSEDCL-AE-2002' },
      { email: 'ae.mwrra.suburban@maharashtra.gov.in',  full_name: 'Kavita Shah (AE)',      dept: 'MWRRA',   district: 'Mumbai Suburban', employee_id: 'MWRRA-AE-3002' },
      { email: 'si.mumpol.suburban@maharashtra.gov.in', full_name: 'Insp. Deepak Rane',    dept: 'MUMPOL',  district: 'Mumbai Suburban', employee_id: 'MUMPOL-SI-4002' },
      // Thane district
      { email: 'ae.bmc.thane@maharashtra.gov.in',    full_name: 'Santosh Pawar (AE)',       dept: 'BMC',     district: 'Thane',           employee_id: 'BMC-AE-1003' },
      { email: 'ae.msedcl.thane@maharashtra.gov.in', full_name: 'Nilesh Shinde (AE)',       dept: 'MSEDCL',  district: 'Thane',           employee_id: 'MSEDCL-AE-2003' },
      { email: 'si.mumpol.thane@maharashtra.gov.in', full_name: 'Insp. Rahul Bhosale',      dept: 'MUMPOL',  district: 'Thane',           employee_id: 'MUMPOL-SI-4003' },
    ],
  },

  // ── KOLKATA (West Bengal) ─────────────────────────────────────────────────
  {
    state: 'West Bengal',
    departments: [
      { code: 'KMC',    name: 'Kolkata Municipal Corporation (KMC)',        sla_hours: 24, contact_email: 'kmc@wb.gov.in' },
      { code: 'CESC',   name: 'Calcutta Electric Supply Corporation',       sla_hours: 12, contact_email: 'cesc@wb.gov.in' },
      { code: 'KMDA',   name: 'Kolkata Metropolitan Development Authority', sla_hours: 72, contact_email: 'kmda@wb.gov.in' },
      { code: 'KOLPOL', name: 'Kolkata Police',                             sla_hours: 12, contact_email: 'police@kolkata.gov.in' },
      { code: 'WBPHED', name: 'WB Public Health Engineering Department',    sla_hours: 24, contact_email: 'phed@wb.gov.in' },
      { code: 'WBHFW',  name: 'Health & Family Welfare — West Bengal',      sla_hours: 24, contact_email: 'health@wb.gov.in' },
      { code: 'WBEDU',  name: 'School Education Department — West Bengal',  sla_hours: 96, contact_email: 'education@wb.gov.in' },
    ],
    officers: [
      // Kolkata district
      { email: 'ae.kmc.kol@wb.gov.in',      full_name: 'Subhash Ghosh (AE)',       dept: 'KMC',    district: 'Kolkata',           employee_id: 'KMC-AE-1001' },
      { email: 'ae.cesc.kol@wb.gov.in',     full_name: 'Tapas Chatterjee (AE)',    dept: 'CESC',   district: 'Kolkata',           employee_id: 'CESC-AE-2001' },
      { email: 'ae.phed.kol@wb.gov.in',     full_name: 'Arnab Bose (AE)',          dept: 'WBPHED', district: 'Kolkata',           employee_id: 'PHED-AE-3001' },
      { email: 'si.kolpol.kol@wb.gov.in',   full_name: 'Insp. Sourav Banerjee',    dept: 'KOLPOL', district: 'Kolkata',           employee_id: 'KOLPOL-SI-4001' },
      { email: 'mo.wbhfw.kol@wb.gov.in',    full_name: 'Dr. Mitali Sen (MO)',      dept: 'WBHFW',  district: 'Kolkata',           employee_id: 'WBHFW-MO-5001' },
      { email: 'insp.wbedu.kol@wb.gov.in',  full_name: 'Partha Sarkar (DEO)',      dept: 'WBEDU',  district: 'Kolkata',           employee_id: 'WBEDU-IN-6001' },
      // North 24 Parganas district
      { email: 'ae.kmc.n24@wb.gov.in',      full_name: 'Debashis Roy (AE)',        dept: 'KMC',    district: 'North 24 Parganas', employee_id: 'KMC-AE-1002' },
      { email: 'ae.cesc.n24@wb.gov.in',     full_name: 'Sanjib Das (AE)',          dept: 'CESC',   district: 'North 24 Parganas', employee_id: 'CESC-AE-2002' },
      { email: 'ae.phed.n24@wb.gov.in',     full_name: 'Ratan Mondal (AE)',        dept: 'WBPHED', district: 'North 24 Parganas', employee_id: 'PHED-AE-3002' },
      { email: 'si.kolpol.n24@wb.gov.in',   full_name: 'Insp. Biplab Mukherjee',   dept: 'KOLPOL', district: 'North 24 Parganas', employee_id: 'KOLPOL-SI-4002' },
    ],
  },

  // ── BENGALURU (Karnataka) ─────────────────────────────────────────────────
  {
    state: 'Karnataka',
    departments: [
      { code: 'BBMP',   name: 'Bruhat Bengaluru Mahanagara Palike (BBMP)', sla_hours: 24, contact_email: 'bbmp@karnataka.gov.in' },
      { code: 'BESCOM', name: 'Bangalore Electricity Supply Company',       sla_hours: 12, contact_email: 'bescom@karnataka.gov.in' },
      { code: 'BWSSB',  name: 'Bangalore Water Supply & Sewerage Board',   sla_hours: 24, contact_email: 'bwssb@karnataka.gov.in' },
      { code: 'BLRPOL', name: 'Bengaluru City Police',                      sla_hours: 12, contact_email: 'police@bengaluru.gov.in' },
      { code: 'BDA',    name: 'Bangalore Development Authority',            sla_hours: 72, contact_email: 'bda@karnataka.gov.in' },
      { code: 'KARHFW', name: 'Health & Family Welfare — Karnataka',        sla_hours: 24, contact_email: 'health@karnataka.gov.in' },
      { code: 'KAREDU', name: 'School Education Department — Karnataka',    sla_hours: 96, contact_email: 'education@karnataka.gov.in' },
    ],
    officers: [
      // Bengaluru Urban district
      { email: 'ae.bbmp.blru@karnataka.gov.in',   full_name: 'Ravi Kumar (AE)',          dept: 'BBMP',   district: 'Bengaluru Urban', employee_id: 'BBMP-AE-1001' },
      { email: 'ae.bescom.blru@karnataka.gov.in', full_name: 'Suresh Gowda (AE)',        dept: 'BESCOM', district: 'Bengaluru Urban', employee_id: 'BESCOM-AE-2001' },
      { email: 'ae.bwssb.blru@karnataka.gov.in',  full_name: 'Manjunath Rao (AE)',       dept: 'BWSSB',  district: 'Bengaluru Urban', employee_id: 'BWSSB-AE-3001' },
      { email: 'si.blrpol.blru@karnataka.gov.in', full_name: 'Insp. Nagesh Murthy',      dept: 'BLRPOL', district: 'Bengaluru Urban', employee_id: 'BLRPOL-SI-4001' },
      { email: 'mo.karhfw.blru@karnataka.gov.in', full_name: 'Dr. Shobha Nair (MO)',     dept: 'KARHFW', district: 'Bengaluru Urban', employee_id: 'KARHFW-MO-5001' },
      { email: 'insp.karedu.blru@karnataka.gov.in',full_name: 'Prakash Hegde (DEO)',     dept: 'KAREDU', district: 'Bengaluru Urban', employee_id: 'KAREDU-IN-6001' },
      // Bengaluru Rural district
      { email: 'ae.bbmp.blrr@karnataka.gov.in',   full_name: 'Anand Swamy (AE)',         dept: 'BBMP',   district: 'Bengaluru Rural', employee_id: 'BBMP-AE-1002' },
      { email: 'ae.bescom.blrr@karnataka.gov.in', full_name: 'Girish Naik (AE)',         dept: 'BESCOM', district: 'Bengaluru Rural', employee_id: 'BESCOM-AE-2002' },
      { email: 'ae.bwssb.blrr@karnataka.gov.in',  full_name: 'Venkatesh Reddy (AE)',     dept: 'BWSSB',  district: 'Bengaluru Rural', employee_id: 'BWSSB-AE-3002' },
      { email: 'si.blrpol.blrr@karnataka.gov.in', full_name: 'Insp. Ramesh Patil',       dept: 'BLRPOL', district: 'Bengaluru Rural', employee_id: 'BLRPOL-SI-4002' },
    ],
  },
];

async function seedCityOfficers() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  🌱  JanSamadhan — City Officers Seed            ║');
  console.log('║  Hyderabad | Mumbai | Kolkata | Bengaluru        ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const officerHash = await bcrypt.hash('Officer@123', 12);
  const summary = [];

  for (const cityData of CITY_DATA) {
    const { state: stateName, departments, officers } = cityData;
    console.log(`\n▸ Processing ${stateName}...`);

    // Get state
    const { data: stateRow } = await supabase.from('states').select('id').eq('name', stateName).maybeSingle();
    if (!stateRow) { console.log(`  ✗ State not found: ${stateName} — run seedCityLocations.js first`); continue; }

    // Upsert departments
    const deptMap = {};
    for (const dept of departments) {
      let { data: d } = await supabase.from('departments').select('id').eq('code', dept.code).maybeSingle();
      if (!d) {
        const { data: ins, error } = await supabase.from('departments').insert(dept).select('id').single();
        if (error) { console.error(`  ✗ Dept ${dept.code}:`, error.message); continue; }
        d = ins;
      } else {
        await supabase.from('departments').update({ name: dept.name, sla_hours: dept.sla_hours, contact_email: dept.contact_email }).eq('id', d.id);
      }
      deptMap[dept.code] = d.id;
    }
    console.log(`  ✓ ${Object.keys(deptMap).length} departments ready`);

    // Seed officers with district_id
    let officerCount = 0;
    for (const o of officers) {
      const deptId = deptMap[o.dept];
      if (!deptId) { console.warn(`  ✗ Dept not found for officer ${o.email}: ${o.dept}`); continue; }

      // Get district_id
      const { data: distRow } = await supabase.from('districts')
        .select('id')
        .eq('name', o.district)
        .eq('state_id', stateRow.id)
        .maybeSingle();

      if (!distRow) { console.warn(`  ✗ District not found: ${o.district} — run seedCityLocations.js first`); continue; }

      const { data: existing } = await supabase.from('users').select('id').eq('email', o.email).maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('users').insert({
          email: o.email,
          password_hash: officerHash,
          full_name: o.full_name,
          role: 'officer',
          department_id: deptId,
          district_id: distRow.id,
          employee_id: o.employee_id,
          state_id: stateRow.id,
          is_active: true,
          is_verified: true,
          govt_badge: 'field_officer'
        });
        if (error) { console.error(`  ✗ Officer ${o.email}:`, error.message); continue; }
        officerCount++;
      } else {
        // Update district_id if missing
        await supabase.from('users').update({ district_id: distRow.id, department_id: deptId }).eq('id', existing.id);
        officerCount++;
      }
    }
    console.log(`  ✓ ${officerCount} officers ready`);
    summary.push({ state: stateName, depts: Object.keys(deptMap).length, officers: officerCount });
  }

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  ✅  City Officers Seed Complete!                ║');
  console.log('╠══════════════════════════════════════════════════╣');
  for (const s of summary) {
    console.log(`║  ${s.state.padEnd(20)} ${String(s.depts).padStart(2)} depts, ${String(s.officers).padStart(2)} officers  ║`);
  }
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Password for all officers: Officer@123          ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
}

seedCityOfficers().catch(err => { console.error('Seed failed:', err); process.exit(1); });

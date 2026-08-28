'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ══════════════════════════════════════════════════════════════════════════════
//  JanSamadhan — Telangana City Officers Seed
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
];

async function seedCityOfficers() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  🌱  JanSamadhan — Telangana Officers Seed       ║');
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
  console.log('║  ✅  Telangana Officers Seed Complete!           ║');
  console.log('╠══════════════════════════════════════════════════╣');
  for (const s of summary) {
    console.log(`║  ${s.state.padEnd(20)} ${String(s.depts).padStart(2)} depts, ${String(s.officers).padStart(2)} officers  ║`);
  }
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Password for all officers: Officer@123          ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
}

seedCityOfficers().catch(err => { console.error('Seed failed:', err); process.exit(1); });

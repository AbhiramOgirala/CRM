'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Delhi districts → sub-divisions (talukas) → areas/wards (mandals)
const DELHI_DATA = {
  'Central Delhi':    {
    subdivisions: ['Karol Bagh', 'Civil Lines', 'Kotwali'],
    areas: {
      'Karol Bagh':   ['Karol Bagh', 'Patel Nagar', 'Rajendra Nagar', 'Ramesh Nagar'],
      'Civil Lines':  ['Civil Lines', 'Model Town', 'Mukherjee Nagar', 'Kamla Nagar'],
      'Kotwali':      ['Chandni Chowk', 'Paharganj', 'Connaught Place', 'Daryaganj'],
    }
  },
  'East Delhi':       {
    subdivisions: ['Shahdara', 'Vivek Vihar', 'Preet Vihar'],
    areas: {
      'Shahdara':     ['Shahdara', 'Seelampur', 'Mustafabad', 'Gokulpuri'],
      'Vivek Vihar':  ['Vivek Vihar', 'Anand Vihar', 'Karkardooma', 'Mandawali'],
      'Preet Vihar':  ['Preet Vihar', 'Laxmi Nagar', 'Nirman Vihar', 'Patparganj'],
    }
  },
  'New Delhi':        {
    subdivisions: ['New Delhi', 'Chanakyapuri'],
    areas: {
      'New Delhi':        ['Connaught Place', 'Janpath', 'Mandi House', 'ITO'],
      'Chanakyapuri':     ['Chanakyapuri', 'RK Puram', 'Sarojini Nagar', 'Lodhi Colony'],
    }
  },
  'North Delhi':      {
    subdivisions: ['Sadar Bazar', 'Narela', 'Alipur'],
    areas: {
      'Sadar Bazar':  ['Sadar Bazar', 'Subzi Mandi', 'Shakti Nagar', 'Rani Bagh'],
      'Narela':       ['Narela', 'Bawana', 'Holambi Kalan', 'Samaypur Badli'],
      'Alipur':       ['Alipur', 'Burari', 'Timarpur', 'Mukherjee Nagar'],
    }
  },
  'North East Delhi': {
    subdivisions: ['Seema Puri', 'Nand Nagri', 'Ghonda'],
    areas: {
      'Seema Puri':   ['Seema Puri', 'New Seemapuri', 'Dilshad Garden', 'Jhilmil'],
      'Nand Nagri':   ['Nand Nagri', 'Brahmpuri', 'Karawal Nagar', 'Mustafabad'],
      'Ghonda':       ['Ghonda', 'Babarpur', 'Gokulpur', 'Maujpur'],
    }
  },
  'North West Delhi': {
    subdivisions: ['Rohini', 'Shalimar Bagh', 'Pitampura'],
    areas: {
      'Rohini':           ['Rohini Sector 1-5', 'Rohini Sector 6-11', 'Rohini Sector 15-17', 'Prashant Vihar'],
      'Shalimar Bagh':    ['Shalimar Bagh', 'Ashok Vihar', 'Wazirpur', 'Tri Nagar'],
      'Pitampura':        ['Pitampura', 'Kohat Enclave', 'Netaji Subhash Place', 'Keshav Puram'],
    }
  },
  'Shahdara':         {
    subdivisions: ['Shahdara North', 'Shahdara South'],
    areas: {
      'Shahdara North':   ['Shahdara', 'Seelampur', 'Mustafabad', 'Bhajanpura'],
      'Shahdara South':   ['Laxmi Nagar', 'Vishwas Nagar', 'Krishna Nagar', 'Gandhi Nagar'],
    }
  },
  'South Delhi':      {
    subdivisions: ['Hauz Khas', 'Mehrauli', 'Kalkaji'],
    areas: {
      'Hauz Khas':    ['Hauz Khas', 'Green Park', 'Safdarjung', 'Malviya Nagar'],
      'Mehrauli':     ['Mehrauli', 'Vasant Kunj', 'Chattarpur', 'Sultanpur'],
      'Kalkaji':      ['Kalkaji', 'Govindpuri', 'Tughlakabad', 'Badarpur'],
    }
  },
  'South East Delhi': {
    subdivisions: ['Lajpat Nagar', 'Okhla', 'Sarita Vihar'],
    areas: {
      'Lajpat Nagar': ['Lajpat Nagar I', 'Lajpat Nagar II', 'Lajpat Nagar III', 'CR Park'],
      'Okhla':        ['Okhla Phase I', 'Okhla Phase II', 'Okhla Phase III', 'Jamia Nagar'],
      'Sarita Vihar': ['Sarita Vihar', 'Jasola', 'Madanpur Khadar', 'Kalindi Kunj'],
    }
  },
  'South West Delhi': {
    subdivisions: ['Dwarka', 'Najafgarh', 'Palam'],
    areas: {
      'Dwarka':       ['Dwarka Sector 1-6', 'Dwarka Sector 7-12', 'Dwarka Sector 13-18', 'Dwarka Sector 19-23'],
      'Najafgarh':    ['Najafgarh', 'Uttam Nagar', 'Bindapur', 'Janakpuri'],
      'Palam':        ['Palam', 'Sagarpur', 'Dabri', 'Kakrola'],
    }
  },
  'West Delhi':       {
    subdivisions: ['Rajouri Garden', 'Tilak Nagar', 'Punjabi Bagh'],
    areas: {
      'Rajouri Garden':   ['Rajouri Garden', 'Tagore Garden', 'Subhash Nagar', 'Madipur'],
      'Tilak Nagar':      ['Tilak Nagar', 'Janakpuri', 'Vikaspuri', 'Uttam Nagar'],
      'Punjabi Bagh':     ['Punjabi Bagh', 'Paschim Vihar', 'Meera Bagh', 'Peeragarhi'],
    }
  },
};

async function seed() {
  console.log('Seeding Delhi location hierarchy...');

  // Get Delhi state ID
  const { data: delhiState } = await supabase.from('states').select('id').eq('name', 'Delhi').single();
  if (!delhiState) { console.error('Delhi state not found'); return; }
  console.log('Delhi state ID:', delhiState.id);

  // Get Delhi districts
  const { data: districts } = await supabase.from('districts').select('id, name').eq('state_id', delhiState.id);
  console.log(`Found ${districts.length} Delhi districts`);

  for (const district of districts) {
    const data = DELHI_DATA[district.name];
    if (!data) { console.log(`No data for district: ${district.name}`); continue; }

    for (const subdivName of data.subdivisions) {
      // Check if taluka already exists
      const { data: existing } = await supabase.from('talukas').select('id').eq('name', subdivName).eq('district_id', district.id).single();
      let talukaId = existing?.id;

      if (!talukaId) {
        const { data: taluka, error: tErr } = await supabase.from('talukas').insert({ name: subdivName, district_id: district.id }).select().single();
        if (tErr) { console.error(`Taluka error for ${subdivName}:`, tErr.message); continue; }
        talukaId = taluka.id;
      }
      console.log(`  ✓ Sub-division: ${subdivName}`);

      // Insert mandals (areas/wards)
      const areas = data.areas[subdivName] || [];
      for (const areaName of areas) {
        const { data: existingM } = await supabase.from('mandals').select('id').eq('name', areaName).eq('taluka_id', talukaId).single();
        if (existingM) { console.log(`    ~ Already exists: ${areaName}`); continue; }
        const { error: mErr } = await supabase.from('mandals').insert({ name: areaName, taluka_id: talukaId, district_id: district.id });
        if (mErr) console.error(`    Mandal error for ${areaName}:`, mErr.message);
        else console.log(`    ✓ Area: ${areaName}`);
      }
    }
  }

  console.log('\nDone! Delhi location hierarchy seeded.');
}

seed().catch(console.error);

'use strict';
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CITIES = {
  Telangana: {
    state: 'Telangana',
    districts: {
      'Hyderabad': {
        subdivisions: ['Secunderabad', 'Charminar', 'Kukatpally', 'LB Nagar', 'Serilingampally'],
        areas: {
          'Secunderabad':       ['Secunderabad', 'Trimulgherry', 'Maredpally', 'Bowenpally'],
          'Charminar':          ['Charminar', 'Falaknuma', 'Chandrayangutta', 'Karwan'],
          'Kukatpally':         ['Kukatpally', 'KPHB Colony', 'Nizampet', 'Bachupally'],
          'LB Nagar':           ['LB Nagar', 'Saroornagar', 'Hayathnagar', 'Vanasthalipuram'],
          'Serilingampally':    ['Gachibowli', 'Madhapur', 'Kondapur', 'Hitech City'],
        }
      },
      'Rangareddy': {
        subdivisions: ['Rajendranagar', 'Shamshabad', 'Maheshwaram'],
        areas: {
          'Rajendranagar':  ['Rajendranagar', 'Attapur', 'Bandlaguda', 'Narsingi'],
          'Shamshabad':     ['Shamshabad', 'Kothur', 'Shadnagar', 'Farooqnagar'],
          'Maheshwaram':    ['Maheshwaram', 'Adibatla', 'Pedda Amberpet', 'Yacharam'],
        }
      },
      'Medchal-Malkajgiri': {
        subdivisions: ['Malkajgiri', 'Medchal', 'Quthbullapur'],
        areas: {
          'Malkajgiri':     ['Malkajgiri', 'Uppal', 'Nacharam', 'Habsiguda'],
          'Medchal':        ['Medchal', 'Kompally', 'Dundigal', 'Alwal'],
          'Quthbullapur':   ['Quthbullapur', 'Balanagar', 'Moosapet', 'Jeedimetla'],
        }
      },
    }
  },
  Maharashtra: {
    state: 'Maharashtra',
    districts: {
      'Mumbai City': {
        subdivisions: ['Fort', 'Colaba', 'Byculla', 'Dharavi'],
        areas: {
          'Fort':     ['Fort', 'Churchgate', 'Nariman Point', 'Ballard Estate'],
          'Colaba':   ['Colaba', 'Cuffe Parade', 'Navy Nagar', 'Backbay'],
          'Byculla':  ['Byculla', 'Mazgaon', 'Nagpada', 'Madanpura'],
          'Dharavi':  ['Dharavi', 'Sion', 'Matunga', 'Antop Hill'],
        }
      },
      'Mumbai Suburban': {
        subdivisions: ['Andheri', 'Borivali', 'Kurla', 'Bandra'],
        areas: {
          'Andheri':  ['Andheri East', 'Andheri West', 'Jogeshwari', 'Vile Parle'],
          'Borivali': ['Borivali East', 'Borivali West', 'Kandivali', 'Malad'],
          'Kurla':    ['Kurla East', 'Kurla West', 'Ghatkopar', 'Vikhroli'],
          'Bandra':   ['Bandra East', 'Bandra West', 'Khar', 'Santacruz'],
        }
      },
      'Thane': {
        subdivisions: ['Thane City', 'Navi Mumbai', 'Kalyan'],
        areas: {
          'Thane City':   ['Thane West', 'Thane East', 'Kopri', 'Naupada'],
          'Navi Mumbai':  ['Vashi', 'Nerul', 'Belapur', 'Kharghar'],
          'Kalyan':       ['Kalyan East', 'Kalyan West', 'Dombivli', 'Ulhasnagar'],
        }
      },
    }
  },
  'West Bengal': {
    state: 'West Bengal',
    districts: {
      'Kolkata': {
        subdivisions: ['North Kolkata', 'Central Kolkata', 'South Kolkata', 'East Kolkata'],
        areas: {
          'North Kolkata':    ['Shyambazar', 'Belgachia', 'Sinthee', 'Dum Dum'],
          'Central Kolkata':  ['Esplanade', 'Burrabazar', 'Jorasanko', 'Shyampukur'],
          'South Kolkata':    ['Ballygunge', 'Alipore', 'Tollygunge', 'Jadavpur'],
          'East Kolkata':     ['Salt Lake', 'New Town', 'Kasba', 'Gariahat'],
        }
      },
      'North 24 Parganas': {
        subdivisions: ['Barasat', 'Barrackpore', 'Basirhat'],
        areas: {
          'Barasat':      ['Barasat', 'Madhyamgram', 'Rajarhat', 'Birati'],
          'Barrackpore':  ['Barrackpore', 'Titagarh', 'Khardah', 'Panihati'],
          'Basirhat':     ['Basirhat', 'Deganga', 'Haroa', 'Minakhan'],
        }
      },
    }
  },
  Karnataka: {
    state: 'Karnataka',
    districts: {
      'Bengaluru Urban': {
        subdivisions: ['North Bengaluru', 'South Bengaluru', 'East Bengaluru', 'West Bengaluru'],
        areas: {
          'North Bengaluru':  ['Hebbal', 'Yelahanka', 'Jalahalli', 'Mathikere'],
          'South Bengaluru':  ['Jayanagar', 'JP Nagar', 'Banashankari', 'BTM Layout'],
          'East Bengaluru':   ['Whitefield', 'Marathahalli', 'Indiranagar', 'Koramangala'],
          'West Bengaluru':   ['Rajajinagar', 'Vijayanagar', 'Basaveshwara Nagar', 'Malleshwaram'],
        }
      },
      'Bengaluru Rural': {
        subdivisions: ['Devanahalli', 'Doddaballapur', 'Hosakote'],
        areas: {
          'Devanahalli':      ['Devanahalli', 'Vijayapura', 'Nandi Hills', 'Sulibele'],
          'Doddaballapur':    ['Doddaballapur', 'Rajanukunte', 'Tubagere', 'Bashettihalli'],
          'Hosakote':         ['Hosakote', 'Malur', 'Jadigenahalli', 'Anugondanahalli'],
        }
      },
    }
  },
};

async function seedCity(stateName, districtData) {
  const { data: stateRow } = await supabase.from('states').select('id').eq('name', stateName).single();
  if (!stateRow) { console.log(`State not found: ${stateName}`); return; }

  for (const [districtName, data] of Object.entries(districtData)) {
    // Check/insert district
    let { data: dist } = await supabase.from('districts').select('id').eq('name', districtName).eq('state_id', stateRow.id).single();
    if (!dist) {
      const { data: newDist } = await supabase.from('districts').insert({ name: districtName, state_id: stateRow.id }).select().single();
      dist = newDist;
    }
    console.log(`District: ${districtName}`);

    for (const subdivName of data.subdivisions) {
      let { data: taluka } = await supabase.from('talukas').select('id').eq('name', subdivName).eq('district_id', dist.id).single();
      if (!taluka) {
        const { data: newT } = await supabase.from('talukas').insert({ name: subdivName, district_id: dist.id }).select().single();
        taluka = newT;
      }
      console.log(`  Sub-division: ${subdivName}`);

      for (const areaName of (data.areas[subdivName] || [])) {
        const { data: existing } = await supabase.from('mandals').select('id').eq('name', areaName).eq('taluka_id', taluka.id).single();
        if (!existing) {
          await supabase.from('mandals').insert({ name: areaName, taluka_id: taluka.id, district_id: dist.id });
        }
        console.log(`    Area: ${areaName}`);
      }
    }
  }
}

async function main() {
  for (const [stateName, cityData] of Object.entries(CITIES)) {
    console.log(`\n=== Seeding ${stateName} ===`);
    await seedCity(stateName, cityData.districts);
  }
  console.log('\nDone!');
}

main().catch(console.error);

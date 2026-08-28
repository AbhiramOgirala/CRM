require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: cit } = await supabase.from('users').select('id, state_id').eq('role', 'citizen').limit(1).single();
  const { data: dist } = await supabase.from('districts').select('id, name').limit(1).single();
  
  const payload = {
    ticket_number: 'TEST-12345',
    citizen_id: cit.id,
    title: 'Water leaking heavily',
    description: 'Huge water leak',
    category: 'water_supply',
    department_id: (await supabase.from('departments').select('id').eq('code', 'HMWSSB').single()).data.id,
    state_id: cit.state_id,
    district_id: dist.id,
    status: 'pending'
  };

  console.log("Filing test complaint:", payload);
  const { data, error } = await supabase.from('complaints').insert(payload).select();
  console.log("Result:", data, error);
}

test();

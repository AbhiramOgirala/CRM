const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '/Users/keerthipriyareddy/Downloads/CRM/backend/.env'});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('complaints').insert({
    ticket_number: 'TEST-123',
    citizen_id: '1aa8110a-d021-4d7f-801a-628fffea77af',
    title: 'test',
    description: 'test description',
    category: 'other',
    priority: 'low',
    status: 'pending',
    sla_deadline: new Date().toISOString(),
    sla_hours_allotted: 72
  }).select().single();
  console.log('Result:', data, 'Error:', error);
}
run();

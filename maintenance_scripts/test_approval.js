
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestApproval() {
  const { data: employees } = await supabase.from('employees').select('id').limit(1);
  const requesterId = employees[0].id;

  const { error } = await supabase
    .from('approval_requests')
    .insert({
      type: 'expense',
      requester_id: requesterId,
      status: 'pending',
      details: {
        amount: 5000000,
        reason: 'Mua server mới cho Neural Link',
        vendor: 'AWS'
      }
    });

  if (error) console.error('Error:', error);
  else console.log('Test approval request created.');
}

createTestApproval();

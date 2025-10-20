import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key] = value.replace(/"/g, '');
      }
    });
  } catch (error) {
    console.error('Error loading .env.local:', error.message);
  }
}

// Load environment variables
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testEdgeFunctionEnv() {
  try {
    console.log('Testing Edge Function environment variables...');
    
    // Call the edge function with a test payload to check env vars
    const { data, error } = await supabase.functions.invoke('process-workflow-queues', {
      body: { 
        check_env: true 
      }
    });

    if (error) {
      console.error('❌ Error calling Edge Function:', error);
      return;
    }

    console.log('✅ Edge Function environment check:', data);
    
    if (data.env_check) {
      console.log('📊 Environment Variables Status:');
      console.log(`  - TELEGRAM_BOT_TOKEN: ${data.telegram_token_set ? '✅ Set' : '❌ Not set'} (length: ${data.telegram_token_length})`);
      console.log(`  - TELEGRAM_CHAT_ID: ${data.telegram_chat_id_set ? '✅ Set' : '❌ Not set'} (value: ${data.telegram_chat_id})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEdgeFunctionEnv();
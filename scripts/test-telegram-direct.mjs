import { readFileSync } from 'fs';
import { join } from 'path';

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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
console.log('TELEGRAM_CHAT_ID:', TELEGRAM_CHAT_ID ? 'Set' : 'Not set');

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
  console.error('Missing Telegram credentials');
  process.exit(1);
}

// Test direct Telegram API call
async function testTelegramDirect() {
  const message = `Direct Telegram Test ${new Date().toISOString()}`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    console.log('Sending message to Telegram...');
    console.log('URL:', url);
    console.log('Chat ID:', TELEGRAM_CHAT_ID);
    console.log('Message:', message);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
      }),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Message sent successfully!');
      console.log('Response:', result);
    } else {
      console.log('❌ Failed to send message');
      console.log('Status:', response.status);
      console.log('Response:', result);
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
}

testTelegramDirect();
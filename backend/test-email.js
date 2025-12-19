#!/usr/bin/env node

/**
 * 🧪 TEST EMAIL SENDING
 * Простой тест отправки email через Resend
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({ path: path.join(__dirname, 'env.env') });

console.log('\n🧪 ══════════════════════════════════════════════════════════');
console.log('🧪 TESTING EMAIL SENDING');
console.log('🧪 ══════════════════════════════════════════════════════════\n');

const RESEND_API_KEY = process.env.RESEND_API_KEY;

console.log('📧 RESEND_API_KEY:', RESEND_API_KEY ? `✅ ${RESEND_API_KEY.substring(0, 10)}...` : '❌ NOT FOUND');

if (!RESEND_API_KEY) {
  console.error('\n❌ RESEND_API_KEY not found in env.env!');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function testEmail() {
  console.log('\n📨 Sending test email...\n');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'onAI Academy <noreply@onai.academy>',
      to: 'smmmcwin@gmail.com', // Твой тестовый email
      subject: '🧪 TEST EMAIL - onAI Academy',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 40px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px;">
    <h1 style="color: #00FF94;">✅ TEST EMAIL</h1>
    <p>This is a test email from onAI Academy.</p>
    <p><strong>Timestamp:</strong> ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}</p>
    <p><strong>Status:</strong> Email system is working! 🎉</p>
  </div>
</body>
</html>
      `,
    });

    if (error) {
      console.error('\n❌ RESEND ERROR:\n');
      console.error(JSON.stringify(error, null, 2));
      return false;
    }

    console.log('\n✅ EMAIL SENT SUCCESSFULLY!\n');
    console.log('📧 Email ID:', data.id);
    console.log('📧 To:', 'smmmcwin@gmail.com');
    console.log('📧 From:', 'onAI Academy <noreply@onai.academy>');
    
    console.log('\n✅ ══════════════════════════════════════════════════════════');
    console.log('✅ CHECK YOUR INBOX: smmmcwin@gmail.com');
    console.log('✅ CHECK SPAM FOLDER IF NOT IN INBOX');
    console.log('✅ ══════════════════════════════════════════════════════════\n');
    
    return true;
  } catch (error) {
    console.error('\n❌ EXCEPTION:\n');
    console.error(error);
    return false;
  }
}

testEmail().then(success => {
  process.exit(success ? 0 : 1);
});

/**
 * Тестовый скрипт для проверки Resend конфигурации и верификации домена
 */

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY not set');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function testResendConfig() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 RESEND API CONFIGURATION TEST                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`API Key: ${RESEND_API_KEY.substring(0, 15)}...`);
  console.log(`FROM Email (env): ${process.env.RESEND_FROM_EMAIL || 'NOT SET'}\n`);

  // Test 1: Get API key info (if available)
  console.log('📋 Test 1: Checking API configuration...');

  // Test 2: Try sending a test email to owner
  console.log('\n📧 Test 2: Sending test email...');
  console.log('Trying different FROM addresses:\n');

  const testRecipient = 'onai.agency.kz@gmail.com'; // Your email from error message

  // Option 1: Try with platform@onai.academy
  try {
    console.log('1️⃣ Trying: platform@onai.academy');
    const { data, error } = await resend.emails.send({
      from: 'onAI Academy <platform@onai.academy>',
      to: testRecipient,
      subject: '🧪 Test Email - platform@onai.academy',
      html: '<h1>Test Email from platform@onai.academy</h1><p>If you receive this, the domain is verified!</p>',
    });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Success! Email ID: ${data?.id}`);
    }
  } catch (err: any) {
    console.log(`   ❌ Exception: ${err.message}`);
  }

  // Option 2: Try with onboarding@resend.dev (default)
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    console.log('\n2️⃣ Trying: onboarding@resend.dev (default)');
    const { data, error } = await resend.emails.send({
      from: 'onAI Academy <onboarding@resend.dev>',
      to: testRecipient,
      subject: '🧪 Test Email - onboarding@resend.dev',
      html: '<h1>Test Email from onboarding@resend.dev</h1><p>This should work as fallback!</p>',
    });

    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Success! Email ID: ${data?.id}`);
    }
  } catch (err: any) {
    console.log(`   ❌ Exception: ${err.message}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RECOMMENDATIONS:');
  console.log('═'.repeat(60));
  console.log('');
  console.log('If platform@onai.academy FAILED:');
  console.log('  → Domain is NOT verified in Resend');
  console.log('  → Go to https://resend.com/domains');
  console.log('  → Add and verify onai.academy domain');
  console.log('  → Add DNS records (SPF, DKIM, DMARC)');
  console.log('');
  console.log('If onboarding@resend.dev WORKED:');
  console.log('  → Use this as temporary FROM address');
  console.log('  → Update RESEND_FROM_EMAIL=onAI Academy <onboarding@resend.dev>');
  console.log('');
  console.log('═'.repeat(60));
}

testResendConfig()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

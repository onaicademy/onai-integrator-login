#!/usr/bin/env npx tsx
/**
 * 🔍 Validate Environment Configuration
 * Run: npx tsx scripts/validate-env.ts
 */

import '../src/load-env.js';
import { initializeConfig, getConfig } from '../src/config/env-validated.js';

console.log('\n🔍 Running ENV Validation...\n');

const { config, validation } = initializeConfig();

console.log('\n📊 Feature Status Summary:\n');

const features = config.features;
for (const [key, enabled] of Object.entries(features)) {
  const icon = enabled ? '✅' : '❌';
  console.log(`   ${icon} ${key}: ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

console.log('\n📦 Supabase Instances:\n');
console.log(`   Main:     ${config.supabase.main ? '✅' : '❌'}`);
console.log(`   Tripwire: ${config.supabase.tripwire ? '✅' : '❌'}`);
console.log(`   Traffic:  ${config.supabase.traffic ? '✅' : '❌'}`);
console.log(`   Landing:  ${config.supabase.landing ? '✅' : '❌'}`);

console.log('\n🔔 Telegram Bots:\n');
console.log(`   IAE:      ${config.telegram.iaeBot ? '✅' : '❌'}`);
console.log(`   Traffic:  ${config.telegram.trafficBot ? '✅' : '❌'}`);
console.log(`   Leads:    ${config.telegram.leadsBot ? '✅' : '❌'}`);

console.log('\n');

if (validation.missingRequired.length > 0) {
  console.log('⚠️  Missing Required Variables:');
  validation.missingRequired.forEach(v => console.log(`   - ${v}`));
  console.log('');
}

process.exit(validation.allCriticalPresent ? 0 : 1);

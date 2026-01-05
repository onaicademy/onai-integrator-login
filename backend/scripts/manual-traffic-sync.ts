#!/usr/bin/env tsx
/**
 * Manual Traffic Sync Script
 *
 * Run this script to manually trigger:
 * 1. Facebook Ads sync
 * 2. Metrics aggregation
 *
 * Usage:
 *   npx tsx backend/scripts/manual-traffic-sync.ts
 */

import { runManualSync } from '../src/cron/traffic-sync-jobs.js';

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 MANUAL TRAFFIC SYNC');
console.log('═══════════════════════════════════════════════════════════\n');

runManualSync()
  .then(() => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ SYNC COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n═══════════════════════════════════════════════════════════');
    console.error('❌ SYNC FAILED');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(error);
    process.exit(1);
  });

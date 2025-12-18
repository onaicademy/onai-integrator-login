/**
 * Weekly Plan Generator - Cron Job
 * 
 * Automatically generates weekly KPI plans every Monday at 00:01 Almaty time
 * Uses Groq AI for intelligent plan calculation
 */

import cron from 'node-cron';
import { calculateWeeklyPlan } from '../services/trafficPlanService.js';

const TEAMS = ['Kenesary', 'Arystan', 'Traf4', 'Muha'];

/**
 * Schedule weekly plan generation
 * Runs every Monday at 00:01 (Asia/Almaty timezone UTC+5)
 */
export function scheduleWeeklyPlanGeneration() {
  // Cron: Every Monday at 00:01 Almaty time
  // Pattern: minute hour day-of-month month day-of-week
  // 1 0 * * 1 = 00:01 on Mondays
  
  cron.schedule('1 0 * * 1', async () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 WEEKLY PLAN GENERATION JOB - STARTED');
    console.log(`🕐 Time: ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })} (Almaty)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const results: any[] = [];
    
    for (const team of TEAMS) {
      try {
        console.log(`🤖 Generating plan for ${team}...`);
        
        const plan = await calculateWeeklyPlan(team);
        
        console.log(`✅ Plan generated for ${team}`);
        console.log(`   - Week: ${plan.week_number} (${plan.week_start} to ${plan.week_end})`);
        console.log(`   - Revenue target: ₸${plan.plan_revenue}`);
        console.log(`   - Sales target: ${plan.plan_sales}`);
        console.log(`   - ROAS target: ${plan.plan_roas}x`);
        console.log('');
        
        results.push({ team, success: true, planId: plan.id });
      } catch (error: any) {
        console.error(`❌ Failed to generate plan for ${team}:`);
        console.error(`   Error: ${error.message}`);
        console.log('');
        
        results.push({ team, success: false, error: error.message });
      }
    }
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🤖 WEEKLY PLAN GENERATION JOB - COMPLETED');
    console.log(`   ✅ Successful: ${successCount}/${TEAMS.length}`);
    console.log(`   ❌ Failed: ${TEAMS.length - successCount}/${TEAMS.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }, {
    timezone: 'Asia/Almaty' // UTC+5 (Kazakhstan - Almaty)
  });
  
  console.log('📅 Weekly plan generator scheduled:');
  console.log('   - Schedule: Every Monday at 00:01');
  console.log('   - Timezone: Asia/Almaty (UTC+5)');
  console.log('   - Teams: Kenesary, Arystan, Traf4, Muha');
  console.log('   ✅ Scheduler active\n');
}

/**
 * Initialize all traffic schedulers
 */
export function startTrafficSchedulers() {
  console.log('\n🚀 Initializing Traffic Dashboard Schedulers...\n');
  
  scheduleWeeklyPlanGeneration();
  
  console.log('✅ All Traffic schedulers initialized!\n');
}


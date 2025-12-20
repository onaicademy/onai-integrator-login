/**
 * Traffic Plan Service - Groq AI Integration
 * 
 * Generates intelligent weekly KPI plans using Groq AI (Llama 3.3 70B)
 * Applies 10% growth strategy and realistic targets
 */

import Groq from 'groq-sdk';
import { tripwireAdminSupabase } from '../config/supabase-tripwire.js';
import axios from 'axios';

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY 
});

const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Calculate weekly plan for a team using Groq AI
 * 
 * @param teamName - Team name (Kenesary, Arystan, Traf4, Muha)
 * @returns Generated weekly plan with AI recommendations
 */
export async function calculateWeeklyPlan(teamName: string) {
  console.log(`🤖 Starting AI plan calculation for ${teamName}...`);
  
  // 1️⃣ Get previous week data from Traffic API
  const prevWeekData = await getPreviousWeekData(teamName);
  console.log(`📊 Previous week data:`, prevWeekData);
  
  // 2️⃣ Get admin settings (growth %, prompt template, etc.)
  const { data: settings } = await tripwireAdminSupabase
    .from('traffic_admin_settings')
    .select('*');
  
  const settingsMap = settings?.reduce((acc: any, s: any) => {
    acc[s.setting_key] = s.setting_value;
    return acc;
  }, {}) || {};
  
  const growthPercentage = parseFloat(settingsMap.ai_growth_percentage) || 10.0;
  const minRoas = parseFloat(settingsMap.min_roas_target) || 1.5;
  const maxCpa = parseFloat(settingsMap.max_cpa_target) || 60.0;
  
  console.log(`⚙️ Settings: ${growthPercentage}% growth, min ROAS ${minRoas}x, max CPA $${maxCpa}`);
  
  // 3️⃣ Get current week dates
  const now = new Date();
  const weekStart = getMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  console.log(`📅 Week: ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`);
  
  // 4️⃣ Generate plan with Groq AI
  const aiPrompt = `You are an expert KPI planning AI for Facebook Ads targetologists at OnAI Academy.

TEAM: ${teamName}

PREVIOUS WEEK RESULTS:
- Revenue: ₸${prevWeekData.revenue.toFixed(2)} (Tenge)
- Sales: ${prevWeekData.sales} conversions
- Ad Spend: $${prevWeekData.spend.toFixed(2)} (USD)
- ROAS: ${prevWeekData.roas.toFixed(2)}x
- CPA: $${prevWeekData.cpa.toFixed(2)} per sale

YOUR TASK:
Calculate realistic and achievable weekly KPI goals with ${growthPercentage}% growth.

CONSTRAINTS & RULES:
1. Apply ${growthPercentage}% growth to Revenue and Sales targets
2. Keep Ad Spend increase MODERATE - max +5% (we don't want to overspend)
3. ROAS must be realistic and improving (minimum target: ${minRoas}x)
4. CPA should decrease or stay flat (maximum target: $${maxCpa})
5. Goals MUST be ACHIEVABLE, not aspirational - targetologist needs to actually hit these numbers

IMPORTANT:
- If previous week had very low ROAS (<0.5), be conservative with growth
- If previous week was excellent (ROAS >2.0), maintain that level with modest growth
- Consider that real business constraints exist - don't just multiply by ${growthPercentage}%

RESPOND WITH ONLY THIS JSON (no markdown, no explanation):
{
  "plan_revenue": <number in Tenge>,
  "plan_sales": <integer count>,
  "plan_spend": <number in USD>,
  "plan_roas": <decimal like 1.85>,
  "plan_cpa": <number in USD>,
  "ai_recommendations": "<2-3 short sentences of actionable advice for the targetologist>"
}`;

  console.log(`🤖 Sending request to Groq AI (${GROQ_MODEL})...`);
  
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: aiPrompt }],
    temperature: 0.3, // Lower temperature = more consistent/conservative
    max_tokens: 500,
  });
  
  const aiResponseText = completion.choices[0].message.content || '{}';
  console.log(`🤖 AI Response:`, aiResponseText);
  
  // Parse AI response
  let aiResponse: any;
  try {
    aiResponse = JSON.parse(aiResponseText);
  } catch (error) {
    console.error('❌ Failed to parse AI response, using fallback calculation');
    aiResponse = calculateFallbackPlan(prevWeekData, growthPercentage, minRoas, maxCpa);
  }
  
  // Validate and sanitize AI response
  aiResponse = sanitizePlan(aiResponse, prevWeekData, minRoas, maxCpa);
  
  // 5️⃣ Insert plan into database
  const { data: newPlan, error } = await tripwireAdminSupabase
    .from('traffic_weekly_plans')
    .insert({
      team_name: teamName,
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      week_number: getWeekNumber(weekStart),
      year: weekStart.getFullYear(),
      
      // Previous week (actual)
      prev_week_revenue: prevWeekData.revenue,
      prev_week_sales: prevWeekData.sales,
      prev_week_spend: prevWeekData.spend,
      prev_week_roas: prevWeekData.roas,
      prev_week_cpa: prevWeekData.cpa,
      
      // Current week (plan)
      plan_revenue: aiResponse.plan_revenue,
      plan_sales: aiResponse.plan_sales,
      plan_spend: aiResponse.plan_spend,
      plan_roas: aiResponse.plan_roas,
      plan_cpa: aiResponse.plan_cpa,
      
      // AI metadata
      ai_generated_plan: aiResponseText,
      ai_recommendations: aiResponse.ai_recommendations,
      growth_percentage: growthPercentage,
      
      status: 'in_progress'
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Database error:', error);
    throw error;
  }
  
  console.log(`✅ Plan saved to database: ID ${newPlan.id}`);
  console.log(`   - Revenue target: ₸${aiResponse.plan_revenue}`);
  console.log(`   - Sales target: ${aiResponse.plan_sales}`);
  console.log(`   - ROAS target: ${aiResponse.plan_roas}x`);
  
  return newPlan;
}

/**
 * Get previous week data from Traffic Analytics API
 */
async function getPreviousWeekData(teamName: string) {
  try {
    const API_URL = process.env.API_URL || 'http://localhost:3000';
    const response = await axios.get(`${API_URL}/api/traffic/combined-analytics?preset=7d`, {
      timeout: 10000
    });
    
    const teamData = response.data.teams.find((t: any) => t.team === teamName);
    
    if (!teamData) {
      console.warn(`⚠️ No data found for ${teamName}, using defaults`);
      return {
        revenue: 0,
        sales: 0,
        spend: 0,
        roas: 0,
        cpa: 0
      };
    }
    
    return {
      revenue: teamData.revenue || 0,
      sales: teamData.sales || 0,
      spend: teamData.spend || 0,
      roas: teamData.roas || 0,
      cpa: teamData.cpa || 0
    };
  } catch (error) {
    console.error('❌ Error fetching previous week data:', error);
    // Return safe defaults
    return {
      revenue: 0,
      sales: 0,
      spend: 0,
      roas: 0,
      cpa: 0
    };
  }
}

/**
 * Fallback plan calculation if AI fails
 */
function calculateFallbackPlan(
  prevWeek: any,
  growthPercentage: number,
  minRoas: number,
  maxCpa: number
) {
  const growth = 1 + (growthPercentage / 100);
  
  const plan_revenue = Math.round(prevWeek.revenue * growth);
  const plan_sales = Math.ceil(prevWeek.sales * growth);
  const plan_spend = Math.round(prevWeek.spend * 1.05 * 100) / 100; // +5% max
  const plan_roas = Math.max(minRoas, prevWeek.roas * 1.05);
  const plan_cpa = Math.min(maxCpa, prevWeek.cpa * 0.95);
  
  return {
    plan_revenue,
    plan_sales,
    plan_spend,
    plan_roas: Math.round(plan_roas * 100) / 100,
    plan_cpa: Math.round(plan_cpa * 100) / 100,
    ai_recommendations: `Увеличьте бюджет на ${growthPercentage}% и оптимизируйте креативы для достижения целей. Фокус на снижение CPA и увеличение ROAS.`
  };
}

/**
 * Sanitize and validate AI-generated plan
 */
function sanitizePlan(plan: any, prevWeek: any, minRoas: number, maxCpa: number) {
  // Ensure all values are numbers
  const sanitized = {
    plan_revenue: Math.max(0, parseFloat(plan.plan_revenue) || prevWeek.revenue),
    plan_sales: Math.max(1, parseInt(plan.plan_sales) || prevWeek.sales),
    plan_spend: Math.max(0, parseFloat(plan.plan_spend) || prevWeek.spend),
    plan_roas: Math.max(0.1, parseFloat(plan.plan_roas) || minRoas),
    plan_cpa: Math.max(1, parseFloat(plan.plan_cpa) || maxCpa),
    ai_recommendations: String(plan.ai_recommendations || 'Продолжайте оптимизацию кампаний.')
  };
  
  // Validate ROAS
  if (sanitized.plan_roas < minRoas * 0.8) {
    console.warn(`⚠️ AI generated low ROAS ${sanitized.plan_roas}, adjusting to ${minRoas}`);
    sanitized.plan_roas = minRoas;
  }
  
  // Validate CPA
  if (sanitized.plan_cpa > maxCpa * 1.2) {
    console.warn(`⚠️ AI generated high CPA $${sanitized.plan_cpa}, adjusting to $${maxCpa}`);
    sanitized.plan_cpa = maxCpa;
  }
  
  // Round values
  sanitized.plan_revenue = Math.round(sanitized.plan_revenue);
  sanitized.plan_roas = Math.round(sanitized.plan_roas * 100) / 100;
  sanitized.plan_cpa = Math.round(sanitized.plan_cpa * 100) / 100;
  sanitized.plan_spend = Math.round(sanitized.plan_spend * 100) / 100;
  
  return sanitized;
}

/**
 * Get Monday of current week
 */
function getMonday(d: Date): Date {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get ISO week number
 */
function getWeekNumber(d: Date): number {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}





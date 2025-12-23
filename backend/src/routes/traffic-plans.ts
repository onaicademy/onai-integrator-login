/**
 * Traffic Dashboard Weekly Plans Routes
 * 
 * Manages weekly KPI plans for targetologists
 * Integrates with Groq AI for plan generation
 */

import express from 'express';
import { authenticateToken } from './traffic-auth.js';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const router = express.Router();

// 📊 GET /api/traffic-plans/current
// Get current week's plan for a team
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const team = req.user.role === 'admin' ? req.query.team : req.user.team;
    
    if (!team) {
      return res.status(400).json({ error: 'Team parameter is required' });
    }
    
    console.log(`📊 Getting current plan for team: ${team}`);
    
    const { data: plan, error } = await trafficAdminSupabase
      .from('traffic_weekly_plans')
      .select('*')
      .eq('team_name', team)
      .eq('status', 'in_progress')
      .order('week_start', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error fetching plan:', error);
      throw error;
    }
    
    if (!plan) {
      console.log(`ℹ️  No active plan found for ${team}`);
      return res.json({ plan: null, message: 'No active plan found' });
    }
    
    console.log(`✅ Current plan found for ${team}: Week ${plan.week_number}`);
    
    res.json({ plan });
  } catch (error) {
    console.error('❌ Get current plan error:', error);
    res.status(500).json({ error: 'Failed to get current plan' });
  }
});

// 📜 GET /api/traffic-plans/history
// Get historical plans for a team
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const team = req.user.role === 'admin' ? req.query.team : req.user.team;
    const limit = parseInt(req.query.limit as string) || 12; // Last 12 weeks by default
    
    if (!team) {
      return res.status(400).json({ error: 'Team parameter is required' });
    }
    
    console.log(`📜 Getting plan history for team: ${team} (limit: ${limit})`);
    
    const { data: plans, error } = await trafficAdminSupabase
      .from('traffic_weekly_plans')
      .select('*')
      .eq('team_name', team)
      .order('week_start', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ Error fetching history:', error);
      throw error;
    }
    
    console.log(`✅ Found ${plans?.length || 0} historical plans for ${team}`);
    
    res.json({ plans: plans || [] });
  } catch (error) {
    console.error('❌ Get plan history error:', error);
    res.status(500).json({ error: 'Failed to get plan history' });
  }
});

// 🤖 POST /api/traffic-plans/generate (Admin only)
// Generate new weekly plan using AI
router.post('/generate', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { team } = req.body;
    
    if (!team) {
      return res.status(400).json({ error: 'Team parameter is required' });
    }
    
    console.log(`🤖 Generating plan for team: ${team}`);
    
    // Import dynamically to avoid circular dependencies
    const { calculateWeeklyPlan } = await import('../services/trafficPlanService.js');
    
    const plan = await calculateWeeklyPlan(team);
    
    console.log(`✅ Plan generated for ${team}`);
    
    res.json({ success: true, plan });
  } catch (error: any) {
    console.error('❌ Generate plan error:', error);
    res.status(500).json({ 
      error: 'Failed to generate plan',
      details: error.message 
    });
  }
});

// 🔄 PUT /api/traffic-plans/:id/update-actual
// Update actual metrics for a plan (called by cron or manually)
router.put('/:id/update-actual', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const { id } = req.params;
    const { actual_revenue, actual_sales, actual_spend, actual_roas, actual_cpa } = req.body;
    
    // Calculate completion percentage
    const { data: plan } = await trafficAdminSupabase
      .from('traffic_weekly_plans')
      .select('plan_revenue, plan_sales')
      .eq('id', id)
      .single();
    
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    
    const completion = Math.round(
      ((actual_revenue / plan.plan_revenue) + (actual_sales / plan.plan_sales)) / 2 * 100
    );
    
    // Update actual values
    const { data: updatedPlan, error } = await trafficAdminSupabase
      .from('traffic_weekly_plans')
      .update({
        actual_revenue,
        actual_sales,
        actual_spend,
        actual_roas,
        actual_cpa,
        completion_percentage: completion,
        status: completion >= 100 ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log(`✅ Updated actual metrics for plan ${id}: ${completion}% complete`);
    
    res.json({ success: true, plan: updatedPlan });
  } catch (error) {
    console.error('❌ Update actual metrics error:', error);
    res.status(500).json({ error: 'Failed to update actual metrics' });
  }
});

// 📈 GET /api/traffic-plans/stats/:team
// Get plan completion statistics for a team
router.get('/stats/:team', authenticateToken, async (req, res) => {
  try {
    const { team } = req.params;
    
    // Check access rights
    if (req.user.role !== 'admin' && req.user.team !== team) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const { data: plans, error } = await trafficAdminSupabase
      .from('traffic_weekly_plans')
      .select('status, completion_percentage, week_start')
      .eq('team_name', team)
      .order('week_start', { ascending: false })
      .limit(4); // Last 4 weeks
    
    if (error) throw error;
    
    const stats = {
      totalPlans: plans?.length || 0,
      completedPlans: plans?.filter(p => p.status === 'completed').length || 0,
      averageCompletion: plans?.length 
        ? Math.round(plans.reduce((sum, p) => sum + (p.completion_percentage || 0), 0) / plans.length)
        : 0,
      recentPlans: plans || []
    };
    
    res.json({ stats });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;







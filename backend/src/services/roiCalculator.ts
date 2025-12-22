/**
 * ROI Calculator Service
 * Calculates ROI using historical exchange rates stored with each transaction
 */

import { supabase } from '../config/supabase';

interface ROIResult {
  spend_usd: number;
  spend_kzt: number;
  revenue_usd: number;
  revenue_kzt: number;
  profit_usd: number;
  profit_kzt: number;
  roi_percent: number;
}

/**
 * Calculate ROI for a team using historical exchange rates
 * @param teamId - Team ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns ROI metrics in both USD and KZT
 */
export async function calculateROI(
  teamId: string, 
  startDate: string, 
  endDate: string
): Promise<ROIResult> {
  // Fetch all transactions with their HISTORICAL rates
  const { data: expenses } = await supabase
    .from('traffic_stats')
    .select('spend_usd, usd_to_kzt_rate, transaction_date')
    .eq('team_id', teamId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);
  
  const { data: sales } = await supabase
    .from('amocrm_sales')
    .select('amount_usd, usd_to_kzt_rate, sale_date')
    .eq('team_id', teamId)
    .gte('sale_date', startDate)
    .lte('sale_date', endDate);
  
  // Calculate using HISTORICAL rates (stored at transaction time)
  const totalSpendUSD = expenses?.reduce((sum, exp) => sum + (exp.spend_usd || 0), 0) || 0;
  const totalSpendKZT = expenses?.reduce((sum, exp) => 
    sum + ((exp.spend_usd || 0) * (exp.usd_to_kzt_rate || 475.0)), 0
  ) || 0;
  
  const totalRevenueUSD = sales?.reduce((sum, sale) => sum + (sale.amount_usd || 0), 0) || 0;
  const totalRevenueKZT = sales?.reduce((sum, sale) => 
    sum + ((sale.amount_usd || 0) * (sale.usd_to_kzt_rate || 475.0)), 0
  ) || 0;
  
  const roiPercent = totalSpendKZT > 0 
    ? ((totalRevenueKZT - totalSpendKZT) / totalSpendKZT) * 100 
    : 0;
  
  return {
    spend_usd: totalSpendUSD,
    spend_kzt: totalSpendKZT,
    revenue_usd: totalRevenueUSD,
    revenue_kzt: totalRevenueKZT,
    profit_usd: totalRevenueUSD - totalSpendUSD,
    profit_kzt: totalRevenueKZT - totalSpendKZT,
    roi_percent: roiPercent
  };
}

/**
 * Calculate ROI for multiple teams
 * @param teamIds - Array of team IDs
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Map of team ID to ROI metrics
 */
export async function calculateMultipleTeamROI(
  teamIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, ROIResult>> {
  const results = new Map<string, ROIResult>();
  
  await Promise.all(
    teamIds.map(async (teamId) => {
      const roi = await calculateROI(teamId, startDate, endDate);
      results.set(teamId, roi);
    })
  );
  
  return results;
}

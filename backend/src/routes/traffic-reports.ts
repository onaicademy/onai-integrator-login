import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Supabase Tripwire client
const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co',
  process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || process.env.TRIPWIRE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzY4NTIsImV4cCI6MjA1MDIxMjg1Mn0.vD7PxK0WYyT-xeD9cJQMcb1tCL5hpBqQzLf3VgWyk'
);

/**
 * POST /api/traffic/reports/save
 * Сохранить отчет за день в базу данных
 */
router.post('/save', async (req: Request, res: Response) => {
  try {
    const {
      report_date,
      total_spend,
      total_revenue,
      total_sales,
      total_roas,
      total_impressions,
      total_clicks,
      total_ctr,
      usd_to_kzt_rate,
      teams_data,
      top_utm_sales,
      top_campaigns_ctr,
      top_campaigns_video,
    } = req.body;

    if (!report_date) {
      return res.status(400).json({ error: 'report_date is required' });
    }

    console.log(`💾 Сохранение отчета за ${report_date}...`);

    // Upsert отчет (если уже есть - обновить, если нет - создать)
    const { data, error } = await tripwireSupabase
      .from('daily_traffic_reports')
      .upsert({
        report_date,
        total_spend: total_spend || 0,
        total_revenue: total_revenue || 0,
        total_sales: total_sales || 0,
        total_roas: total_roas || 0,
        total_impressions: total_impressions || 0,
        total_clicks: total_clicks || 0,
        total_ctr: total_ctr || 0,
        usd_to_kzt_rate: usd_to_kzt_rate || 470,
        teams_data: teams_data || [],
        top_utm_sales: top_utm_sales || [],
        top_campaigns_ctr: top_campaigns_ctr || [],
        top_campaigns_video: top_campaigns_video || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'report_date',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Ошибка сохранения отчета:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Отчет за ${report_date} сохранен`);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Ошибка сохранения отчета:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/traffic/reports/date/:date
 * Получить отчет за конкретную дату
 */
router.get('/date/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;

    console.log(`📊 Получение отчета за ${date}...`);

    const { data, error } = await tripwireSupabase
      .from('daily_traffic_reports')
      .select('*')
      .eq('report_date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Отчет за эту дату не найден' });
      }
      console.error('❌ Ошибка получения отчета:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Ошибка получения отчета:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/traffic/reports/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Получить отчеты за диапазон дат
 */
router.get('/range', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates are required' });
    }

    console.log(`📊 Получение отчетов: ${start} - ${end}`);

    const { data, error } = await tripwireSupabase
      .from('daily_traffic_reports')
      .select('*')
      .gte('report_date', start)
      .lte('report_date', end)
      .order('report_date', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения отчетов:', error);
      return res.status(500).json({ error: error.message });
    }

    // Суммируем данные за период
    const summary = {
      period_start: start,
      period_end: end,
      days_count: data.length,
      total_spend: 0,
      total_revenue: 0,
      total_sales: 0,
      total_impressions: 0,
      total_clicks: 0,
      avg_ctr: 0,
      period_roas: 0,
      reports: data,
    };

    let totalSpendKZT = 0;

    data.forEach((report: any) => {
      summary.total_spend += parseFloat(report.total_spend) || 0;
      summary.total_revenue += parseFloat(report.total_revenue) || 0;
      summary.total_sales += parseInt(report.total_sales) || 0;
      summary.total_impressions += parseInt(report.total_impressions) || 0;
      summary.total_clicks += parseInt(report.total_clicks) || 0;
      
      const spendKZT = (parseFloat(report.total_spend) || 0) * (parseFloat(report.usd_to_kzt_rate) || 470);
      totalSpendKZT += spendKZT;
    });

    // Средний CTR
    summary.avg_ctr = summary.total_impressions > 0 
      ? (summary.total_clicks / summary.total_impressions) * 100 
      : 0;

    // ROAS за период
    summary.period_roas = totalSpendKZT > 0 
      ? summary.total_revenue / totalSpendKZT 
      : 0;

    console.log(`✅ Найдено ${data.length} отчетов`);
    res.json({ success: true, ...summary });
  } catch (error: any) {
    console.error('❌ Ошибка получения отчетов:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/traffic/reports/teams-analysis?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Анализ окупаемости по командам за период
 */
router.get('/teams-analysis', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates are required' });
    }

    console.log(`📊 Анализ команд: ${start} - ${end}`);

    const { data: reports, error } = await tripwireSupabase
      .from('daily_traffic_reports')
      .select('report_date, teams_data, usd_to_kzt_rate')
      .gte('report_date', start)
      .lte('report_date', end)
      .order('report_date', { ascending: false });

    if (error) {
      console.error('❌ Ошибка получения отчетов:', error);
      return res.status(500).json({ error: error.message });
    }

    // Агрегируем данные по командам
    const teamsMap: Record<string, {
      team: string;
      total_spend: number;
      total_revenue: number;
      total_sales: number;
      total_impressions: number;
      total_clicks: number;
      period_roas: number;
      period_cpa: number;
      period_ctr: number;
      days_active: number;
    }> = {};

    reports.forEach((report: any) => {
      const teamsData = report.teams_data || [];
      const rate = parseFloat(report.usd_to_kzt_rate) || 470;

      teamsData.forEach((teamData: any) => {
        const team = teamData.team;
        
        if (!teamsMap[team]) {
          teamsMap[team] = {
            team,
            total_spend: 0,
            total_revenue: 0,
            total_sales: 0,
            total_impressions: 0,
            total_clicks: 0,
            period_roas: 0,
            period_cpa: 0,
            period_ctr: 0,
            days_active: 0,
          };
        }

        teamsMap[team].total_spend += parseFloat(teamData.spend) || 0;
        teamsMap[team].total_revenue += parseFloat(teamData.revenue) || 0;
        teamsMap[team].total_sales += parseInt(teamData.sales) || 0;
        teamsMap[team].total_impressions += parseInt(teamData.impressions) || 0;
        teamsMap[team].total_clicks += parseInt(teamData.clicks) || 0;
        teamsMap[team].days_active++;
      });
    });

    // Расчет метрик для каждой команды
    const teamsAnalysis = Object.values(teamsMap).map(team => {
      const spendKZT = team.total_spend * 470; // Средний курс
      team.period_roas = spendKZT > 0 ? team.total_revenue / spendKZT : 0;
      team.period_cpa = team.total_sales > 0 ? team.total_spend / team.total_sales : 0;
      team.period_ctr = team.total_impressions > 0 ? (team.total_clicks / team.total_impressions) * 100 : 0;
      return team;
    }).sort((a, b) => b.period_roas - a.period_roas);

    console.log(`✅ Анализ по ${teamsAnalysis.length} командам`);
    res.json({
      success: true,
      period: { start, end },
      days_count: reports.length,
      teams: teamsAnalysis,
    });
  } catch (error: any) {
    console.error('❌ Ошибка анализа команд:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

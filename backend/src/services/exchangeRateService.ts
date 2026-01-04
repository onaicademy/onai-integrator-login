import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const FALLBACK_RATE = 475;

export async function upsertExchangeRate(date: string, rate: number, source: string) {
  const { error } = await trafficAdminSupabase
    .from('exchange_rates')
    .upsert(
      {
        date,
        usd_to_kzt: rate,
        source,
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    );

  if (error) {
    throw error;
  }
}

export async function getExchangeRateForDate(date: string): Promise<number> {
  const { data, error } = await trafficAdminSupabase
    .from('exchange_rates')
    .select('usd_to_kzt')
    .eq('date', date)
    .single();

  if (!error && data?.usd_to_kzt) {
    return data.usd_to_kzt;
  }

  const { data: latestRate } = await trafficAdminSupabase
    .from('exchange_rates')
    .select('usd_to_kzt')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  return latestRate?.usd_to_kzt || FALLBACK_RATE;
}

export async function getExchangeRateMap(start: string, end: string): Promise<Record<string, number>> {
  const { data } = await trafficAdminSupabase
    .from('exchange_rates')
    .select('date, usd_to_kzt')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  const map: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    map[row.date] = row.usd_to_kzt;
  });

  if (Object.keys(map).length === 0) {
    const latest = await getExchangeRateForDate(end);
    map[end] = latest;
  }

  return map;
}

export async function getAverageExchangeRate(start: string, end: string): Promise<number> {
  const map = await getExchangeRateMap(start, end);
  const values = Object.values(map);
  if (!values.length) {
    return FALLBACK_RATE;
  }
  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

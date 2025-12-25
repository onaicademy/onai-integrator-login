/**
 * 📊 Funnel Conversion Chart Component
 * 
 * Визуализирует воронку конверсий: ProfTest → Express → Purchase
 * Поддерживает кросс-девайс трекинг (Desktop → Mobile)
 * 
 * Data Source: funnel_analytics SQL view
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';

interface FunnelData {
  utm_source: string;
  utm_id: string;
  date: string;
  proftest_count: number;
  express_visit_count: number;
  express_submit_count: number;
  purchase_count: number;
  proftest_to_express_rate: number;
  express_visit_to_submit_rate: number;
  express_submit_to_purchase_rate: number;
  overall_conversion_rate: number;
}

interface FunnelConversionChartProps {
  teamName?: string;
  dateRange?: { start: string; end: string };
}

export default function FunnelConversionChart({ teamName, dateRange }: FunnelConversionChartProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FunnelData[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');

  useEffect(() => {
    loadFunnelData();
  }, [teamName, dateRange]);

  const loadFunnelData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');
      
      const params: any = {};
      if (teamName) params.team = teamName;
      if (dateRange) {
        params.start_date = dateRange.start;
        params.end_date = dateRange.end;
      }

      const response = await axios.get(`${API_URL}/traffic-dashboard/funnel-analytics`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setData(response.data.data || []);
    } catch (error) {
      console.error('❌ Failed to load funnel analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate data by source
  const aggregated = React.useMemo(() => {
    if (selectedSource === 'all') {
      return data.reduce(
        (acc, row) => ({
          proftest_count: acc.proftest_count + row.proftest_count,
          express_visit_count: acc.express_visit_count + row.express_visit_count,
          express_submit_count: acc.express_submit_count + row.express_submit_count,
          purchase_count: acc.purchase_count + row.purchase_count,
        }),
        { proftest_count: 0, express_visit_count: 0, express_submit_count: 0, purchase_count: 0 }
      );
    }

    const filtered = data.filter((row) => row.utm_source === selectedSource);
    return filtered.reduce(
      (acc, row) => ({
        proftest_count: acc.proftest_count + row.proftest_count,
        express_visit_count: acc.express_visit_count + row.express_visit_count,
        express_submit_count: acc.express_submit_count + row.express_submit_count,
        purchase_count: acc.purchase_count + row.purchase_count,
      }),
      { proftest_count: 0, express_visit_count: 0, express_submit_count: 0, purchase_count: 0 }
    );
  }, [data, selectedSource]);

  // Calculate conversion rates
  const rates = {
    proftest_to_express:
      aggregated.proftest_count > 0
        ? ((aggregated.express_visit_count / aggregated.proftest_count) * 100).toFixed(2)
        : '0.00',
    express_visit_to_submit:
      aggregated.express_visit_count > 0
        ? ((aggregated.express_submit_count / aggregated.express_visit_count) * 100).toFixed(2)
        : '0.00',
    express_submit_to_purchase:
      aggregated.express_submit_count > 0
        ? ((aggregated.purchase_count / aggregated.express_submit_count) * 100).toFixed(2)
        : '0.00',
    overall:
      aggregated.proftest_count > 0
        ? ((aggregated.purchase_count / aggregated.proftest_count) * 100).toFixed(2)
        : '0.00',
  };

  // Unique UTM sources
  const utmSources = React.useMemo(() => {
    const sources = new Set(data.map((row) => row.utm_source));
    return Array.from(sources).sort();
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#00FF88]" />
        <span className="ml-2 text-white/60">Загрузка воронки...</span>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Воронка конверсий</h2>
          <p className="text-sm text-white/60">ProfTest → Express → Purchase</p>
        </div>

        {/* Source Filter */}
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#00FF88]"
        >
          <option value="all">Все источники</option>
          {utmSources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-4">
        {/* Stage 1: ProfTest */}
        <div className="relative">
          <div className="bg-gradient-to-r from-[#00FF88]/20 to-[#00FF88]/10 rounded-lg p-4 border border-[#00FF88]/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60">Этап 1: ProfTest</div>
                <div className="text-3xl font-bold text-white">{aggregated.proftest_count}</div>
              </div>
              <div className="text-[#00FF88] text-sm font-semibold">100%</div>
            </div>
          </div>
          
          {/* Conversion Arrow */}
          <div className="flex items-center justify-center py-2">
            <div className="text-white/40 text-sm flex items-center gap-2">
              <span>{rates.proftest_to_express}%</span>
              {parseFloat(rates.proftest_to_express) > 30 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Stage 2: Express Visit */}
        <div className="relative">
          <div
            className="bg-gradient-to-r from-blue-500/20 to-blue-500/10 rounded-lg p-4 border border-blue-500/30"
            style={{
              width: `${(aggregated.express_visit_count / aggregated.proftest_count) * 100}%`,
              minWidth: '30%',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60">Этап 2: Express Visit</div>
                <div className="text-2xl font-bold text-white">{aggregated.express_visit_count}</div>
              </div>
              <div className="text-blue-400 text-sm font-semibold">{rates.proftest_to_express}%</div>
            </div>
          </div>

          {/* Conversion Arrow */}
          <div className="flex items-center justify-center py-2">
            <div className="text-white/40 text-sm flex items-center gap-2">
              <span>{rates.express_visit_to_submit}%</span>
              {parseFloat(rates.express_visit_to_submit) > 20 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Stage 3: Express Submit */}
        <div className="relative">
          <div
            className="bg-gradient-to-r from-purple-500/20 to-purple-500/10 rounded-lg p-4 border border-purple-500/30"
            style={{
              width: `${(aggregated.express_submit_count / aggregated.proftest_count) * 100}%`,
              minWidth: '20%',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60">Этап 3: Express Submit</div>
                <div className="text-xl font-bold text-white">{aggregated.express_submit_count}</div>
              </div>
              <div className="text-purple-400 text-sm font-semibold">{rates.express_visit_to_submit}%</div>
            </div>
          </div>

          {/* Conversion Arrow */}
          <div className="flex items-center justify-center py-2">
            <div className="text-white/40 text-sm flex items-center gap-2">
              <span>{rates.express_submit_to_purchase}%</span>
              {parseFloat(rates.express_submit_to_purchase) > 10 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* Stage 4: Purchase */}
        <div className="relative">
          <div
            className="bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 rounded-lg p-4 border border-yellow-500/30"
            style={{
              width: `${(aggregated.purchase_count / aggregated.proftest_count) * 100}%`,
              minWidth: '15%',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60">Этап 4: Purchase</div>
                <div className="text-xl font-bold text-white">{aggregated.purchase_count}</div>
              </div>
              <div className="text-yellow-400 text-sm font-semibold">{rates.overall}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-white/60">ProfTest → Express</div>
            <div className="text-2xl font-bold text-[#00FF88]">{rates.proftest_to_express}%</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/60">Express Visit → Submit</div>
            <div className="text-2xl font-bold text-blue-400">{rates.express_visit_to_submit}%</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/60">Submit → Purchase</div>
            <div className="text-2xl font-bold text-purple-400">{rates.express_submit_to_purchase}%</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/60">Overall</div>
            <div className="text-2xl font-bold text-yellow-400">{rates.overall}%</div>
          </div>
        </div>
      </div>

      {/* Cross-Device Notice */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-xs text-blue-300">
          📱 <strong>Кросс-девайс трекинг:</strong> Воронка учитывает переходы Desktop → Mobile через URL параметры (client_id, utm_id)
        </p>
      </div>
    </div>
  );
}

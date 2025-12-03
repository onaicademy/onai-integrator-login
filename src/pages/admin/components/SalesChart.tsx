import { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface SalesData {
  date: string;
  sales: number;
  revenue: number;
}

interface SalesChartProps {
  managerId?: string;
  period?: 'week' | 'month' | 'year';
}

export default function SalesChart({ managerId, period = 'month' }: SalesChartProps) {
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChartData() {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error('No access token');
          return;
        }

        const params = new URLSearchParams();
        if (managerId) params.append('manager_id', managerId);
        params.append('period', period);

        const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
        const response = await fetch(`${API_URL}/api/admin/tripwire/sales-chart?${params}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
        }
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadChartData();
  }, [managerId, period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#00FF94] text-xl font-['JetBrains_Mono']">
          ЗАГРУЗКА ГРАФИКА...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-[#00FF94]" />
          <h2
            className="text-2xl font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider"
            style={{ textShadow: '0 0 20px rgba(0, 255, 148, 0.3)' }}
          >
            ДИНАМИКА ПРОДАЖ
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-[rgba(15,15,15,0.6)] rounded-lg p-1">
          {['week', 'month', 'year'].map((p) => (
            <button
              key={p}
              className={`px-4 py-2 rounded-lg font-['JetBrains_Mono'] text-sm uppercase transition-all ${
                period === p
                  ? 'bg-[#00FF94] text-black'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 bg-[rgba(15,15,15,0.6)] rounded-2xl border border-white/10">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Нет данных для отображения</p>
          <p className="text-sm text-gray-500 mt-2">Создайте первую продажу чтобы увидеть график</p>
        </div>
      ) : (
        <div className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="date"
                stroke="#9CA3AF"
                style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}
              />
              <YAxis stroke="#9CA3AF" style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A0A0A',
                  border: '1px solid rgba(0, 255, 148, 0.3)',
                  borderRadius: '12px',
                  fontFamily: 'JetBrains Mono',
                }}
                labelStyle={{ color: '#00FF94' }}
              />
              <Legend
                wrapperStyle={{ fontFamily: 'JetBrains Mono', fontSize: 14 }}
                iconType="line"
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#00FF94"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSales)"
                name="Продажи"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                name="Выручка (₸)"
                yAxisId="right"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}



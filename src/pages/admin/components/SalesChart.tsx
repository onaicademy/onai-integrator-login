import { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import { api } from '@/utils/apiClient';
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
  period?: 'week' | 'month' | 'year' | 'custom';
  dateRange?: { from: Date; to: Date };
}

export default function SalesChart({ managerId, period = 'month', dateRange }: SalesChartProps) {
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChartData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (managerId) params.append('manager_id', managerId);
        params.append('period', period);

        // 🎯 ARCHITECT APPROVED: Custom date range
        if (period === 'custom' && dateRange) {
          params.append('startDate', dateRange.from.toISOString());
          params.append('endDate', dateRange.to.toISOString());
        }

        console.log('📊 [SalesChart] API Request:', `/api/admin/tripwire/sales-chart?${params}`);
        const result = await api.get(`/api/admin/tripwire/sales-chart?${params}`);
        console.log('📊 [SalesChart] API Response:', result);
        // API возвращает массив напрямую, не обернутый в объект
        setData(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error('❌ [SalesChart] Error loading chart data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadChartData();
  }, [managerId, period, dateRange]);

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
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-[#00FF94]" />
        <h2
          className="text-xl md:text-2xl font-bold text-white font-['JetBrains_Mono'] uppercase tracking-wider break-words"
          style={{ textShadow: '0 0 20px rgba(0, 255, 148, 0.3)' }}
        >
          ДИНАМИКА ПРОДАЖ
        </h2>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 bg-[rgba(15,15,15,0.6)] rounded-2xl border border-white/10">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Нет данных для отображения</p>
          <p className="text-sm text-gray-500 mt-2">Создайте первую продажу чтобы увидеть график</p>
        </div>
      ) : (
        <div className="bg-[rgba(15,15,15,0.6)] backdrop-blur-xl border border-white/10 rounded-2xl p-2 sm:p-4 md:p-6">
          {/* 🔥 MOBILE: Высота графика меньше на мобильных */}
          <ResponsiveContainer width="100%" height={300} className="sm:!h-[400px]">
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
                style={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#9CA3AF" 
                style={{ fontFamily: 'JetBrains Mono', fontSize: 10 }} 
                tick={{ fontSize: 10 }}
                width={40}
              />
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
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}



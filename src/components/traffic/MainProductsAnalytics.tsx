/**
 * 🚀 Main Products Analytics Panel
 * 
 * Показывает окупаемость ОСНОВНЫХ продуктов (VAMUS RM)
 * Учитывает: затраты на Express + конверсию → основные продукты
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';
import axios from 'axios';
import { TrendingUp, DollarSign, Target, Percent } from 'lucide-react';

interface MainProductStats {
  targetologist: string;
  express_sales: number;
  express_revenue: number;
  main_products_sales: number;
  main_products_revenue: number;
  total_spend: number;
  conversion_rate: number; // Express → Main Products
  roi: number;
  roas: number;
}

export function MainProductsAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MainProductStats[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d'>('30d');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');

      // Вычислить даты
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setDate(dateTo.getDate() - parseInt(dateRange));

      const response = await axios.get(
        `${API_URL}/api/traffic/main-products-sales`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            dateFrom: dateFrom.toISOString().split('T')[0],
            dateTo: dateTo.toISOString().split('T')[0]
          }
        }
      );

      if (response.data.success) {
        // TODO: Объединить с данными ExpressCourse для расчета ROI
        console.log('📊 Main products data:', response.data);
      }

    } catch (error) {
      console.error('❌ Error fetching main products analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            🚀 Основные продукты (VAMUS RM)
          </h2>
          <p className="text-gray-400 mt-1">
            Окупаемость с учетом конверсии из ExpressCourse
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex gap-2">
          {(['7d', '14d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg transition-all ${
                dateRange === range
                  ? 'bg-[#00FF88] text-black font-semibold'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {range === '7d' && '7 дней'}
              {range === '14d' && '14 дней'}
              {range === '30d' && '30 дней'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 mt-4">Загрузка данных...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#00FF88]/10 to-[#00FF88]/5 border-[#00FF88]/20">
              <CardHeader className="pb-3">
                <CardDescription className="text-[#00FF88]">
                  <TrendingUp className="w-4 h-4 inline mr-1" />
                  Продаж основных
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">--</div>
                <p className="text-xs text-gray-400 mt-1">за {dateRange}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardDescription className="text-blue-400">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Доход основных
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">--</div>
                <p className="text-xs text-gray-400 mt-1">в тенге</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardHeader className="pb-3">
                <CardDescription className="text-purple-400">
                  <Percent className="w-4 h-4 inline mr-1" />
                  Конверсия
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">--%</div>
                <p className="text-xs text-gray-400 mt-1">Express → Основные</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardHeader className="pb-3">
                <CardDescription className="text-yellow-400">
                  <Target className="w-4 h-4 inline mr-1" />
                  Полный ROI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">--x</div>
                <p className="text-xs text-gray-400 mt-1">с учетом Express</p>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-[#00FF88]/5 to-blue-500/5 border-[#00FF88]/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#00FF88]/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[#00FF88]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Расчет полной окупаемости
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Учитываются затраты на ExpressCourse + конверсия в основные продукты.
                    Это дает реальную картину ROI по каждому таргетологу.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coming Soon Message */}
          <div className="text-center py-12 border border-dashed border-[#00FF88]/20 rounded-xl">
            <div className="inline-block w-16 h-16 rounded-full bg-[#00FF88]/10 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-[#00FF88]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              Аналитика в разработке
            </h3>
            <p className="text-gray-400">
              API подключен к VAMUS RM воронке.<br />
              Скоро здесь будет детальная статистика по основным продуктам.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default MainProductsAnalytics;

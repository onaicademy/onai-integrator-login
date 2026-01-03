/**
 * Product Dashboard View
 * Основной вид дашборда для выбранного продукта
 *
 * Desktop Layout:
 * - LEFT (50%): Funnel Pyramid
 * - RIGHT (50%): Metrics Grid + Recommendations
 *
 * Mobile Layout:
 * - Stacked vertically
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { ProductDashboardData } from '@/types/traffic-products.types';
import { FunnelPyramid } from './FunnelPyramid';
import { MetricsGrid } from './MetricsGrid';
import { TopAdsRanking } from './TopAdsRanking';
import { RecommendationsPanel } from './RecommendationsPanel';
import { ForecastChart } from './ForecastChart';

interface ProductDashboardViewProps {
  productData: ProductDashboardData | null;
  language: 'ru' | 'kz';
}

export function ProductDashboardView({ productData, language }: ProductDashboardViewProps) {
  if (!productData) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {language === 'ru' ? 'Данные не загружены' : 'Деректер жүктелмеген'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Layout: Funnel (Left) + Metrics (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Funnel Pyramid */}
        <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
            <div className="text-3xl">📊</div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {language === 'ru' ? 'Воронка продаж' : 'Сатылым воронкасы'}
              </h3>
              <p className="text-sm text-gray-500">
                {language === 'ru' ? 'Визуализация конверсий по этапам' : 'Кезеңдер бойынша конверсиялар'}
              </p>
            </div>
          </div>
          <FunnelPyramid funnel={productData.funnel} language={language} />
        </div>

        {/* RIGHT: Metrics Grid */}
        <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
            <div className="text-3xl">📈</div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {language === 'ru' ? 'Метрики кампании' : 'Науқан метрикалары'}
              </h3>
              <p className="text-sm text-gray-500">
                {language === 'ru' ? 'Ключевые показатели эффективности' : 'Тиімділіктің негізгі көрсеткіштері'}
              </p>
            </div>
          </div>
          <MetricsGrid
            metrics={productData.metrics}
            criticality={productData.criticality}
            language={language}
          />
        </div>
      </div>

      {/* Top Ads Ranking */}
      <TopAdsRanking topAds={productData.topAds} language={language} />

      {/* Recommendations Panel */}
      <RecommendationsPanel recommendations={productData.recommendations} language={language} />

      {/* Forecast Chart */}
      <ForecastChart forecast={productData.forecast} language={language} />
    </div>
  );
}

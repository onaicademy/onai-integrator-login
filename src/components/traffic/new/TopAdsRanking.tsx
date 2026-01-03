/**
 * Top Ads Ranking
 * Рейтинг топ-5 объявлений по эффективности
 *
 * Показывает:
 * - Название объявления
 * - CTR, ROAS, CPA
 * - Расход и выручку
 * - Место в рейтинге (1-5)
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { TopAd } from '@/types/traffic-products.types';

interface TopAdsRankingProps {
  topAds: TopAd[];
  language: 'ru' | 'kz';
}

function getRankMedal(rank: number): string {
  const medals: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
    4: '4️⃣',
    5: '5️⃣',
  };
  return medals[rank] || '📌';
}

function getRankColor(rank: number): string {
  const colors: Record<number, string> = {
    1: '#FFD700', // Gold
    2: '#C0C0C0', // Silver
    3: '#CD7F32', // Bronze
    4: '#00D9FF', // Blue
    5: '#A0A0A0', // Gray
  };
  return colors[rank] || '#A0A0A0';
}

export function TopAdsRanking({ topAds, language }: TopAdsRankingProps) {
  if (!topAds || topAds.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-xl rounded-2xl border-2 border-gray-800 p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-800">
        <div className="text-3xl">🏆</div>
        <div>
          <h3 className="text-xl font-bold text-white">
            {language === 'ru' ? 'Топ-5 объявлений' : 'Топ-5 жарнамалар'}
          </h3>
          <p className="text-sm text-gray-500">
            {language === 'ru' ? 'Рейтинг по эффективности (ROAS)' : 'Тиімділік бойынша рейтинг (ROAS)'}
          </p>
        </div>
      </div>

      {/* Ads List */}
      <div className="space-y-4">
        {topAds.map((ad, index) => {
          const rank = index + 1;
          const medal = getRankMedal(rank);
          const rankColor = getRankColor(rank);

          return (
            <div
              key={ad.id}
              className="relative bg-black/60 backdrop-blur-xl rounded-xl border-2 p-5 hover:scale-102 transition-all group"
              style={{ borderColor: rankColor }}
            >
              {/* Rank Badge */}
              <div className="absolute top-3 right-3 text-3xl">{medal}</div>

              {/* Ad Name */}
              <div className="text-lg font-bold text-white mb-3 pr-12">
                {ad.name}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* CTR */}
                <div className="bg-black/40 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">CTR</div>
                  <div className="text-base font-bold text-[#00D9FF]">
                    {ad.ctr.toFixed(2)}%
                  </div>
                </div>

                {/* ROAS */}
                <div className="bg-black/40 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">ROAS</div>
                  <div
                    className="text-base font-bold"
                    style={{
                      color: ad.roas >= 3.0 ? '#00FF88' : ad.roas >= 2.0 ? '#FFB800' : '#FF4444',
                    }}
                  >
                    {ad.roas.toFixed(2)}x
                  </div>
                </div>

                {/* CPA */}
                <div className="bg-black/40 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">CPA</div>
                  <div className="text-base font-bold text-white">
                    ${ad.cpa.toFixed(2)}
                  </div>
                </div>

                {/* Spend / Revenue */}
                <div className="bg-black/40 rounded-lg p-3 border border-gray-700">
                  <div className="text-xs text-gray-500 mb-1">
                    {language === 'ru' ? 'Расход / Выручка' : 'Шығын / Табыс'}
                  </div>
                  <div className="text-xs font-bold text-gray-300">
                    ${ad.spend.toFixed(0)} / ${ad.revenue.toFixed(0)}
                  </div>
                </div>
              </div>

              {/* Hover Effect */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"
                style={{ backgroundColor: rankColor }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 🧪 Onboarding Test Page
 * 
 * Специальная страница для тестирования онбординга в изоляции
 * Доступна только для тестирования (не в production)
 * 
 * URL: /traffic/onboarding-test
 * 
 * @version 1.0.0
 * @date 2025-12-22
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { OnboardingTour } from '@/components/traffic/OnboardingTour';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, RefreshCw, User, Shield, Eye, Target, BarChart3, Settings } from 'lucide-react';

export default function OnboardingTestPage() {
  const [showTour, setShowTour] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'targetologist'>('targetologist');
  const [testUserId] = useState('test-user-' + Date.now());
  const [testUserName, setTestUserName] = useState('Тестовый Пользователь');
  
  const startTour = () => {
    setShowTour(false);
    // Небольшая задержка для перезапуска компонента
    setTimeout(() => {
      setShowTour(true);
    }, 100);
  };
  
  const resetTour = () => {
    setShowTour(false);
    localStorage.removeItem(`onboarding_completed_${testUserId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030303] via-[#0a0a0a] to-[#000000] text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00FF88]/10 via-transparent to-transparent opacity-30" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-full px-6 py-2 mb-6">
            <Sparkles className="w-5 h-5 text-[#00FF88]" />
            <span className="text-sm font-bold text-[#00FF88] uppercase tracking-wider">
              Тестовая Среда
            </span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#00FF88] to-[#00CC6F] bg-clip-text text-transparent">
            Тестирование Онбординга
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Полностью изолированная среда для проверки онбординг-тура.<br/>
            Все элементы интерактивны и готовы к E2E тестированию.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Control Panel */}
          <Card className="bg-black/60 border-[#00FF88]/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00FF88]">
                <Settings className="w-5 h-5" />
                Панель Управления
              </CardTitle>
              <CardDescription className="text-gray-400">
                Настройте параметры тестового онбординга
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-300">
                  Роль пользователя:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setUserRole('targetologist')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      userRole === 'targetologist'
                        ? 'border-[#00FF88] bg-[#00FF88]/10'
                        : 'border-gray-700 bg-black/40 hover:border-gray-600'
                    }`}
                  >
                    <Target className="w-6 h-6 mx-auto mb-2 text-[#00FF88]" />
                    <div className="text-sm font-semibold">Таргетолог</div>
                  </button>
                  <button
                    onClick={() => setUserRole('admin')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      userRole === 'admin'
                        ? 'border-[#00FF88] bg-[#00FF88]/10'
                        : 'border-gray-700 bg-black/40 hover:border-gray-600'
                    }`}
                  >
                    <Shield className="w-6 h-6 mx-auto mb-2 text-[#00FF88]" />
                    <div className="text-sm font-semibold">Админ</div>
                  </button>
                </div>
              </div>

              {/* User Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300">
                  Имя пользователя:
                </label>
                <input
                  type="text"
                  value={testUserName}
                  onChange={(e) => setTestUserName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-xl text-white focus:border-[#00FF88] focus:outline-none focus:ring-2 focus:ring-[#00FF88]/20"
                  placeholder="Введите имя"
                />
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4">
                <Button
                  onClick={startTour}
                  className="w-full bg-gradient-to-r from-[#00FF88] to-[#00DD70] hover:from-[#00FFAA] hover:to-[#00EE88] text-black font-bold py-6 rounded-xl shadow-lg shadow-[#00FF88]/30"
                  data-testid="start-tour-btn"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Запустить Онбординг
                </Button>
                
                <Button
                  onClick={resetTour}
                  variant="outline"
                  className="w-full border-gray-700 hover:bg-gray-800 py-6 rounded-xl"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Сбросить Прогресс
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card className="bg-black/60 border-[#00FF88]/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#00FF88]">
                <Eye className="w-5 h-5" />
                Информация о Тесте
              </CardTitle>
              <CardDescription className="text-gray-400">
                Что будет протестировано
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#00FF88]">✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      Центровка Popover
                    </div>
                    <div className="text-xs text-gray-400">
                      Проверка идеальной центровки всплывающих окон на всех разрешениях
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#00FF88]">✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      Брендовые Цвета
                    </div>
                    <div className="text-xs text-gray-400">
                      Кнопки используют правильный цвет #00FF88 с градиентами
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#00FF88]">✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      Триггеры
                    </div>
                    <div className="text-xs text-gray-400">
                      Пока не нажмешь "Далее" - система не продолжит
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#00FF88]">✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      Observability
                    </div>
                    <div className="text-xs text-gray-400">
                      Все события логируются в консоль браузера
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#00FF88]">✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white mb-1">
                      E2E Ready
                    </div>
                    <div className="text-xs text-gray-400">
                      data-testid атрибуты для автоматизированного тестирования
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <div className="text-xs text-gray-500 space-y-1">
                  <div><strong className="text-gray-400">Test User ID:</strong> {testUserId}</div>
                  <div><strong className="text-gray-400">Role:</strong> {userRole}</div>
                  <div><strong className="text-gray-400">Environment:</strong> Test</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mock Dashboard Elements (для tour targets) */}
        <div className="mt-12 max-w-6xl mx-auto">
          <Card className="bg-black/40 border-[#00FF88]/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Mock Traffic Dashboard</CardTitle>
              <CardDescription className="text-gray-400">
                Элементы для тестирования онбординга
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Metrics Cards - ГЛАВНАЯ ПОДСВЕТКА */}
              <div data-tour="metrics-cards" className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border-2 border-dashed border-[#00FF88]/20">
                <div className="bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5 text-[#00FF88]" />
                    <span className="text-sm text-gray-400">Доход</span>
                  </div>
                  <div className="text-2xl font-bold text-[#00FF88]">$12,450</div>
                  <div className="text-xs text-gray-500 mt-1">+15% за неделю</div>
                </div>
                
                <div className="bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="w-5 h-5 text-[#00FF88]" />
                    <span className="text-sm text-gray-400">ROAS</span>
                  </div>
                  <div className="text-2xl font-bold text-[#00FF88]">2.4x</div>
                  <div className="text-xs text-gray-500 mt-1">Цель: &gt; 2.0x</div>
                </div>
                
                <div className="bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-[#00FF88]" />
                    <span className="text-sm text-gray-400">CPA</span>
                  </div>
                  <div className="text-2xl font-bold text-[#00FF88]">$45</div>
                  <div className="text-xs text-gray-500 mt-1">За продажу</div>
                </div>
              </div>

              {/* My Results Button - ВТОРАЯ ПОДСВЕТКА */}
              <div className="flex justify-center py-4">
                <Button 
                  data-tour="my-results-button"
                  className="bg-[#00FF88]/10 hover:bg-[#00FF88]/20 border-2 border-[#00FF88]/40 text-[#00FF88] font-bold px-10 py-4 text-base rounded-xl shadow-lg shadow-[#00FF88]/20 transition-all hover:scale-105"
                >
                  <User className="w-5 h-5 mr-2" />
                  Мои результаты
                </Button>
              </div>

              {/* Results Table - ТРЕТЬЯ ПОДСВЕТКА */}
              <div data-tour="results-table" className="bg-black/60 border-2 border-[#00FF88]/20 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-[#00FF88]" />
                  <h3 className="text-lg font-bold text-white">Результаты команд</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-[#00FF88]/5 border border-[#00FF88]/20 rounded-lg hover:bg-[#00FF88]/10 transition-all">
                    <div>
                      <span className="text-white font-semibold">Команда Kenesary</span>
                      <div className="text-xs text-gray-400 mt-1">ROAS: 2.4x</div>
                    </div>
                    <span className="text-[#00FF88] font-bold text-lg">$5,200</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-800/20 border border-gray-700/30 rounded-lg">
                    <div>
                      <span className="text-gray-300 font-medium">Команда Arystan</span>
                      <div className="text-xs text-gray-500 mt-1">ROAS: 1.8x</div>
                    </div>
                    <span className="text-gray-400 font-bold text-lg">$4,800</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-800/20 border border-gray-700/30 rounded-lg">
                    <div>
                      <span className="text-gray-300 font-medium">Команда Muha</span>
                      <div className="text-xs text-gray-500 mt-1">ROAS: 2.1x</div>
                    </div>
                    <span className="text-gray-400 font-bold text-lg">$3,900</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Onboarding Tour Component */}
      {showTour && (
        <OnboardingTour
          userRole={userRole}
          userId={testUserId}
          userEmail={`test-${userRole}@onai.academy`}
          userName={testUserName}
          skipApiCheck={true}
        />
      )}
    </div>
  );
}


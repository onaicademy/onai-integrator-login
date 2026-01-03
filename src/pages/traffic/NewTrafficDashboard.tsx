/**
 * New Traffic Dashboard (Tripwire Brand)
 * Новый дашборд для таргетологов с системой вкладок продуктов
 *
 * Продукты:
 * - Экспресс-курс
 * - Трехдневник
 * - Однодневник
 *
 * Дизайн: Tripwire Brand (черный + #00FF88)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Globe, RefreshCw } from 'lucide-react';
import { OnAILogo } from '@/components/OnAILogo';
import { AuthManager, AuthUser } from '@/lib/auth';
import { useLanguage } from '@/hooks/useLanguage';
import { ProductType, AllProductsData } from '@/types/traffic-products.types';
import { generateAllProductsData } from '@/lib/traffic-test-data';
import { ProductTabsNav } from '@/components/traffic/new/ProductTabsNav';
import { ProductDashboardView } from '@/components/traffic/new/ProductDashboardView';
import { OverallMetricsCard } from '@/components/traffic/new/OverallMetricsCard';

export default function NewTrafficDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProduct, setActiveProduct] = useState<ProductType>('express');
  const [dashboardData, setDashboardData] = useState<AllProductsData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  // Валидация авторизации
  useEffect(() => {
    validateAuth();
    loadDashboardData();
  }, []);

  const validateAuth = () => {
    try {
      const token = AuthManager.getAccessToken();
      if (!token) {
        navigate('/traffic/login');
        return;
      }

      const userData = AuthManager.getUser();
      if (!userData) {
        navigate('/traffic/login');
        return;
      }

      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Auth validation error:', error);
      navigate('/traffic/login');
    }
  };

  const loadDashboardData = () => {
    try {
      // TODO: Заменить на реальный API call
      console.log('📊 Loading dashboard data...');
      const data = generateAllProductsData();
      console.log('✅ Dashboard data loaded:', data);
      setDashboardData(data);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      loadDashboardData();
      setIsRefreshing(false);
    }, 1000);
  };

  const handleLogout = () => {
    AuthManager.logout();
    navigate('/traffic/login');
  };

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <OnAILogo size="lg" className="mx-auto mb-4" />
          <p className="text-gray-400">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  const currentProductData = dashboardData.products[activeProduct];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <header className="bg-black/80 border-b border-gray-800 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <OnAILogo size="md" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold">Traffic Dashboard</h1>
                <p className="text-sm text-gray-400">
                  {user?.fullName || user?.email}
                  {user?.team && (
                    <span className="ml-2 px-2 py-0.5 bg-[#00FF88]/10 text-[#00FF88] rounded text-xs">
                      {user.team}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Refresh */}
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="bg-black/60 border-gray-700 hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Обновить</span>
              </Button>

              {/* Language */}
              <Button
                onClick={toggleLanguage}
                variant="outline"
                size="sm"
                className="bg-black/60 border-gray-700 hover:bg-gray-800"
              >
                <Globe className="w-4 h-4" />
                <span className="ml-2">{language === 'ru' ? 'РУС' : 'ҚАЗ'}</span>
              </Button>

              {/* Logout */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-black/60 border-red-900/50 hover:bg-red-900/20 text-red-400"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Выйти</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* OVERALL METRICS (КРАТКАЯ СВОДКА ПО ВСЕМ ПРОДУКТАМ) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 py-6">
        <OverallMetricsCard data={dashboardData} language={language} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PRODUCT TABS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4">
        <ProductTabsNav
          activeProduct={activeProduct}
          onProductChange={setActiveProduct}
          language={language}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PRODUCT DASHBOARD */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="container mx-auto px-4 py-6">
        <ProductDashboardView
          productData={currentProductData}
          language={language}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <footer className="bg-black/40 border-t border-gray-800/30 py-4 mt-12">
        <div className="container mx-auto px-4">
          <p className="text-xs text-gray-500 text-center">
            <span className="text-gray-400">⚠️ IP-адреса отслеживаются.</span> Передача доступа
            запрещена. Конфиденциальная информация.
          </p>
          <p className="text-xs text-gray-600 text-center mt-1">
            Последнее обновление: {new Date(dashboardData.lastUpdated).toLocaleString('ru-RU')}
          </p>
        </div>
      </footer>
    </div>
  );
}

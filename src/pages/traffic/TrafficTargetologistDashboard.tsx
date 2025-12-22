/**
 * Traffic Targetologist Dashboard - Simplified Version
 * 
 * No sidebar - все на одном экране
 * Only for targetologists
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TrafficCommandDashboard from '../tripwire/TrafficCommandDashboard';
import MainProductsAnalytics from '@/components/traffic/MainProductsAnalytics';
import { Button } from '@/components/ui/button';
import { Users, User, Globe, LogOut, BarChart3, Settings, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { OnAILogo } from '@/components/OnAILogo';
import { AuthManager, AuthUser } from '@/lib/auth';
import { DebugPanel } from '@/components/debug/DebugPanel';
import { useDebugPanel } from '@/hooks/useDebugPanel';
import { actionLogger } from '@/lib/action-logger';

export default function TrafficTargetologistDashboard() {
  const { team } = useParams<{ team: string }>();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<'express' | 'main-products'>('express');
  const [showOnlyMyTeam, setShowOnlyMyTeam] = useState(false);
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  
  // Debug Panel
  const debugPanel = useDebugPanel();
  
  // ✅ CRITICAL: Validate authentication on mount
  useEffect(() => {
    validateAuthAndLoadUser();
  }, []);

  const validateAuthAndLoadUser = () => {
    try {
      // ✅ Check if token exists and is valid
      const token = AuthManager.getAccessToken();
      
      if (!token) {
        console.warn('❌ No valid token found');
        setUnauthorized(true);
        setLoading(false);
        setTimeout(() => {
          const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
          navigate(isTrafficDomain ? '/login' : '/traffic/login');
        }, 2000);
        return;
      }

      // ✅ Validate user data
      const userData = AuthManager.getUser();
      
      if (!userData) {
        console.warn('❌ Invalid user data');
        setUnauthorized(true);
        setLoading(false);
        setTimeout(() => {
          const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
          navigate(isTrafficDomain ? '/login' : '/traffic/login');
        }, 2000);
        return;
      }

      // ✅ Check if user has permission for this route
      if (userData.role === 'admin') {
        // Redirect admin to admin dashboard
        const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
        navigate(isTrafficDomain ? '/admin/dashboard' : '/traffic/admin/dashboard');
        return;
      }

      setUser(userData);
      setUnauthorized(false);
      setLoading(false);
    } catch (error) {
      console.error('❌ Auth validation error:', error);
      setUnauthorized(true);
      setLoading(false);
    }
  };

  // ✅ Refresh validation every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      validateAuthAndLoadUser();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const teamName = team?.charAt(0).toUpperCase() + team?.slice(1).toLowerCase() || user?.team;
  
  const handleLogout = () => {
    // ✅ Log action
    actionLogger.logClick('logout-button', 'User Logout');
    
    // ✅ Clear all authentication data
    AuthManager.clearAll();
    
    // ✅ Notify server to invalidate session (optional but recommended)
    fetch('/api/traffic-auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('Logout error:', err));
    
    const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
    navigate(isTrafficDomain ? '/login' : '/traffic/login');
  };

  // ✅ Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF88]"></div>
          <p className="mt-4 text-[#00FF88] font-semibold">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // ✅ Show unauthorized message
  if (unauthorized) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
        <div className="max-w-md bg-black/60 border border-red-500/30 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{t('auth.unauthorized') || 'Нет доступа'}</h2>
          <p className="text-gray-400 mb-6">
            Your session has expired. Please log in again.
          </p>
          <Button
            onClick={() => {
              const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
              navigate(isTrafficDomain ? '/login' : '/traffic/login');
            }}
            className="w-full bg-[#00FF88] text-black font-bold"
          >
            {t('auth.returnToLogin') || 'Вернуться ко входу'}
          </Button>
        </div>
      </div>
    );
  }

  // ✅ Render dashboard only if authenticated
  if (!user) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-[#030303] relative">
      {/* Debug Panel (Ctrl/Cmd + Shift + D) */}
      <DebugPanel isOpen={debugPanel.isOpen} onClose={debugPanel.close} />
      
      {/* Top Bar - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/60 border-b border-[#00FF88]/10 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo + User */}
            <div className="flex items-center gap-4">
              <OnAILogo width={120} height={35} />
              
              {user && (
                <div className="hidden md:flex items-center gap-3 pl-4 border-l border-[#00FF88]/10">
                  <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
                    <User className="w-5 h-5 text-[#00FF88]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{user.fullName}</p>
                    <p className="text-xs text-[#00FF88]">{user.team}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Language Toggle */}
              <Button
                data-tour="language-toggle"
                onClick={toggleLanguage}
                variant="outline"
                size="sm"
                className="bg-black/80 border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10 hover:border-[#00FF88]/40 backdrop-blur-xl rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <Globe className="w-4 h-4 text-[#00FF88]" />
                <span className="hidden sm:inline text-xs font-bold uppercase">{language === 'ru' ? 'РУС' : 'ҚАЗ'}</span>
              </Button>
              
              {/* Settings Button */}
              <Button
                data-tour="settings-button"
                onClick={() => navigate('/settings')}
                variant="outline"
                size="sm"
                className="bg-black/80 border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10 hover:border-[#00FF88]/40 backdrop-blur-xl rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <Settings className="w-4 h-4 text-[#00FF88]" />
                <span className="hidden lg:inline text-xs font-bold">Настройки</span>
              </Button>
              
              {/* Detailed Analytics Button */}
              <Button
                data-tour="analytics-button"
                onClick={() => navigate('/detailed-analytics')}
                variant="outline"
                size="sm"
                className="bg-black/80 border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10 hover:border-[#00FF88]/40 backdrop-blur-xl rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4 text-[#00FF88]" />
                <span className="hidden lg:inline text-xs font-bold">{t('detailedAnalytics.title')}</span>
              </Button>
              
              {/* My Results Toggle */}
              <Button
                data-tour="my-results-button"
                onClick={() => setShowOnlyMyTeam(!showOnlyMyTeam)}
                variant="outline"
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-bold
                  transition-all shadow-xl backdrop-blur-xl rounded-lg
                  ${showOnlyMyTeam 
                    ? 'bg-[#00FF88] border-[#00FF88] text-black hover:bg-[#00FF88]/90' 
                    : 'bg-black/80 border-[#00FF88]/30 text-white hover:bg-[#00FF88]/10 animate-pulse-glow'
                  }
                `}
              >
                {showOnlyMyTeam ? (
                  <>
                    <Users className="w-4 h-4" />
                    <span className="hidden md:inline">{t('btn.allTeams')}</span>
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span className="hidden md:inline">{t('btn.myResults')}</span>
                  </>
                )}
              </Button>
              
              {/* Logout */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-black/80 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 rounded-lg px-3 py-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline ml-2 text-xs">{t('sidebar.logout')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content - with top padding */}
      <div className="pt-16 px-4">
        {/* Tabs for Express vs Main Products */}
        <div className="max-w-[1600px] mx-auto mb-6">
          <div className="flex gap-2 bg-black/40 p-1 rounded-xl border border-[#00FF88]/10 w-fit">
            <button
              data-tour="express-course-tab"
              onClick={() => setActiveTab('express')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'express'
                  ? 'bg-[#00FF88] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ ExpressCourse
            </button>
            <button
              data-tour="main-products-tab"
              onClick={() => setActiveTab('main-products')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === 'main-products'
                  ? 'bg-[#00FF88] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🚀 Основные продукты
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'express' ? (
          <TrafficCommandDashboard 
            filterTeam={showOnlyMyTeam ? teamName : null}
            currentUserTeam={teamName}
            language={language}
          />
        ) : (
          <MainProductsAnalytics />
        )}
      </div>
      
      
      {/* Security Footer - Simple, not fixed */}
      <div className="bg-black/40 border-t border-gray-800/30 py-3 mt-8">
        <div className="container mx-auto px-4">
          <p className="text-xs text-gray-500 text-center">
            <span className="text-gray-400">⚠️ IP-адреса отслеживаются.</span> Передача доступа запрещена. Конфиденциальная информация.
          </p>
        </div>
      </div>
    </div>
  );
}

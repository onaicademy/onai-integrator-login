/**
 * Traffic Targetologist Dashboard - Simplified Version
 * 
 * No sidebar - все на одном экране
 * Only for targetologists
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TrafficCommandDashboard from '../tripwire/TrafficCommandDashboard';
import { Button } from '@/components/ui/button';
import { Users, User, Globe, LogOut, BarChart3, Settings } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { OnboardingTour } from '@/components/traffic/OnboardingTour';
import { OnAILogo } from '@/components/traffic/OnAILogo';

export default function TrafficTargetologistDashboard() {
  const { team } = useParams<{ team: string }>();
  const [user, setUser] = useState<any>(null);
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  
  useEffect(() => {
    const userData = localStorage.getItem('traffic_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);
  
  const teamName = team?.charAt(0).toUpperCase() + team?.slice(1).toLowerCase() || user?.team;
  const [showOnlyMyTeam, setShowOnlyMyTeam] = useState(false);
  
  const handleLogout = () => {
    localStorage.removeItem('traffic_token');
    localStorage.removeItem('traffic_user');
    navigate('/login');
  };
  
  return (
    <div className="min-h-screen bg-[#030303] relative">
      {/* Onboarding Tour */}
      {user && (
        <OnboardingTour 
          userRole={user.role}
          userId={user.id}
          userEmail={user.email}
          userName={user.fullName}
        />
      )}
      
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
      <div className="pt-16">
        <TrafficCommandDashboard 
          filterTeam={showOnlyMyTeam ? teamName : null}
          currentUserTeam={teamName}
          language={language}
        />
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

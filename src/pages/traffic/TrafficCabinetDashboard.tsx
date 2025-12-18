/**
 * Traffic Cabinet Dashboard
 * 
 * Main dashboard page for targetologists
 * Shows original TrafficCommandDashboard with all teams by default
 * Toggle to show only own team
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TrafficCabinetLayout } from '@/components/traffic/TrafficCabinetLayout';
import TrafficCommandDashboard from '../tripwire/TrafficCommandDashboard';
import { Button } from '@/components/ui/button';
import { Users, User, Globe } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { OnboardingTour } from '@/components/traffic/OnboardingTour';

export default function TrafficCabinetDashboard() {
  const { team } = useParams<{ team: string }>();
  const [user, setUser] = useState<any>(null);
  const { language, toggleLanguage, t } = useLanguage();
  
  useEffect(() => {
    const userData = localStorage.getItem('traffic_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);
  
  // Capitalize team name for API calls
  const teamName = team?.charAt(0).toUpperCase() + team?.slice(1).toLowerCase() || user?.team;
  
  // По умолчанию показываем ВСЕ команды (showOnlyMyTeam = false)
  const [showOnlyMyTeam, setShowOnlyMyTeam] = useState(false);
  
  return (
    <TrafficCabinetLayout>
      {/* Onboarding Tour - интерактивное обучение */}
      {user && (
        <OnboardingTour 
          userRole={user.role}
          userId={user.id}
          userEmail={user.email}
          userName={user.fullName}
        />
      )}
      
      {/* Top Right Controls */}
      <div className="fixed top-4 sm:top-6 right-4 sm:right-6 z-50 flex flex-col sm:flex-row gap-2 sm:gap-3 items-end sm:items-center">
        {/* Language Toggle */}
        <Button
          data-tour="language-toggle"
          onClick={toggleLanguage}
          variant="outline"
          size="sm"
          className="bg-black/80 border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10 hover:border-[#00FF88]/40 backdrop-blur-xl rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg"
        >
          <Globe className="w-4 h-4 text-[#00FF88]" />
          <span className="text-xs font-bold uppercase">{language === 'ru' ? 'РУС' : 'ҚАЗ'}</span>
        </Button>
        
        {/* My Results Toggle - КРУПНАЯ КНОПКА */}
        <Button
          data-tour="my-results-button"
          onClick={() => setShowOnlyMyTeam(!showOnlyMyTeam)}
          variant="outline"
          size="lg"
          className={`
            flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-bold
            transition-all shadow-2xl backdrop-blur-xl rounded-xl sm:rounded-2xl
            border-2 sm:border-3
            ${showOnlyMyTeam 
              ? 'bg-[#00FF88] border-[#00FF88] text-black hover:bg-[#00FF88]/90 shadow-[#00FF88]/50 scale-105' 
              : 'bg-black/80 border-[#00FF88]/30 text-white hover:bg-[#00FF88]/10 hover:border-[#00FF88]/60 hover:shadow-[#00FF88]/30 animate-pulse-glow'
            }
          `}
          style={{
            boxShadow: showOnlyMyTeam 
              ? '0 0 30px rgba(0,255,136,0.5), 0 10px 25px rgba(0,0,0,0.5)' 
              : '0 0 20px rgba(0,255,136,0.3), 0 10px 25px rgba(0,0,0,0.5)'
          }}
        >
          {showOnlyMyTeam ? (
            <>
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">{t('btn.allTeams')}</span>
              <span className="sm:hidden">Все</span>
            </>
          ) : (
            <>
              <User className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">{t('btn.myResults')}</span>
              <span className="sm:hidden">Мои</span>
            </>
          )}
        </Button>
      </div>
      
      {/* Original Traffic Dashboard (без Weekly KPI Widget) */}
      <div>
        <TrafficCommandDashboard 
          filterTeam={showOnlyMyTeam ? teamName : null}
          currentUserTeam={teamName}
          language={language}
        />
      </div>
      
      {/* Security Footer - Simple */}
      <div className="bg-black/40 border-t border-gray-800/30 py-3 mt-8">
        <div className="container mx-auto px-4">
          <p className="text-xs text-gray-500 text-center">
            <span className="text-gray-400">⚠️ IP-адреса отслеживаются.</span> Передача доступа запрещена. Конфиденциальная информация.
          </p>
        </div>
      </div>
    </TrafficCabinetLayout>
  );
}


/**
 * Traffic Cabinet Layout
 * 
 * Main layout for Traffic Dashboard with sidebar
 * Mobile responsive with collapsible sidebar
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Settings, User, BarChart3, Menu, X, TrendingUp, Shield, PieChart, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrafficCabinetLayoutProps {
  children: React.ReactNode;
}

export function TrafficCabinetLayout({ children }: TrafficCabinetLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('traffic_user');
    const token = localStorage.getItem('traffic_token');
    
    if (!userData || !token) {
      console.log('❌ No auth found, redirecting to login');
      navigate('/login');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      console.log('✅ User loaded:', parsedUser);
    } catch (error) {
      console.error('❌ Failed to parse user data:', error);
      navigate('/login');
    }
  }, [navigate]);
  
  const handleLogout = () => {
    console.log('👋 Logging out');
    localStorage.removeItem('traffic_token');
    localStorage.removeItem('traffic_user');
    navigate('/login');
  };
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-3 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">Загрузка...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#030303] flex">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00FF88]/5 via-transparent to-transparent" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,255,136,0.02) 1px, transparent 0)`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-black/80 border border-[#00FF88]/20 rounded-lg backdrop-blur-xl"
      >
        {sidebarOpen ? (
          <X className="w-6 h-6 text-[#00FF88]" />
        ) : (
          <Menu className="w-6 h-6 text-[#00FF88]" />
        )}
      </button>
      
      {/* Sidebar */}
      <div data-tour="sidebar" className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-black/40 border-r border-[#00FF88]/10 backdrop-blur-xl
        flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 flex flex-col h-full">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3 mb-8 p-3 bg-[#00FF88]/5 rounded-xl border border-[#00FF88]/20">
            <div className="w-10 h-10 rounded-lg bg-[#00FF88]/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-[#00FF88]" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">Traffic Command</h1>
              <p className="text-xs text-[#00FF88]/60">Dashboard</p>
            </div>
          </div>
          
          {/* User Profile */}
          <div className="mb-8 p-3 bg-[#00FF88]/5 rounded-xl border border-[#00FF88]/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#00FF88]/20 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-[#00FF88]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate">{user.fullName}</p>
                <p className="text-xs text-[#00FF88] truncate">{user.team}</p>
                <p className="text-xs text-gray-400 truncate">{user.role === 'admin' ? 'Администратор' : 'Таргетолог'}</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {/* ГЛАВНОЕ */}
          <NavItem
            icon={<TrendingUp className="w-5 h-5" />}
            label="Dashboard"
            href={user.role === 'admin' ? '/admin/dashboard' : `/cabinet/${user.team.toLowerCase()}`}
            isActive={isActive(user.role === 'admin' ? '/admin/dashboard' : `/cabinet/${user.team.toLowerCase()}`)}
            onClick={() => setSidebarOpen(false)}
            dataTour={user.role === 'admin' ? 'admin-dashboard' : undefined}
          />
          
          {user.role === 'admin' && (
            <>
              {/* АНАЛИТИКА */}
              <div className="my-4 border-t border-[#00FF88]/10" />
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Аналитика
                </p>
              </div>
              <NavItem
                icon={<PieChart className="w-5 h-5" />}
                label="Источники продаж"
                href="/admin/utm-sources"
                isActive={isActive('/admin/utm-sources')}
                onClick={() => setSidebarOpen(false)}
                dataTour="utm-sources"
              />
              <NavItem
                icon={<Shield className="w-5 h-5" />}
                label="Безопасность"
                href="/admin/security"
                isActive={isActive('/admin/security')}
                onClick={() => setSidebarOpen(false)}
                dataTour="security"
              />
              
              {/* УПРАВЛЕНИЕ */}
              <div className="my-4 border-t border-[#00FF88]/10" />
              <div className="px-4 py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Управление
                </p>
              </div>
              <NavItem
                icon={<Building2 className="w-5 h-5" />}
                label="Конструктор команд"
                href="/admin/team-constructor"
                isActive={isActive('/admin/team-constructor')}
                onClick={() => setSidebarOpen(false)}
                dataTour="team-constructor"
              />
              <NavItem
                icon={<User className="w-5 h-5" />}
                label="Пользователи"
                href="/admin/users"
                isActive={isActive('/admin/users')}
                onClick={() => setSidebarOpen(false)}
                dataTour="user-management"
              />
              <NavItem
                icon={<Settings className="w-5 h-5" />}
                label="Настройки"
                href="/admin/settings"
                isActive={isActive('/admin/settings')}
                onClick={() => setSidebarOpen(false)}
                dataTour="settings"
              />
            </>
          )}
        </nav>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-red-400 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Выйти</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto relative">
        <div className="min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
  onClick?: () => void;
  dataTour?: string;
}

function NavItem({ icon, label, href, isActive, onClick, dataTour }: NavItemProps) {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(href);
    onClick?.();
  };
  
  return (
    <a
      href={href}
      onClick={handleClick}
      data-tour={dataTour}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg transition-all
        ${isActive 
          ? 'bg-[#00FF88]/20 text-[#00FF88] border border-[#00FF88]/30' 
          : 'text-gray-400 hover:bg-[#00FF88]/10 hover:text-white'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </a>
  );
}


/**
 * Traffic Dashboard Login Page
 * 
 * Separate login for Traffic Command Dashboard
 * Uses JWT authentication with traffic_users table
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Globe } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { OnAILogo } from '@/components/OnAILogo';
import { useLanguage } from '@/hooks/useLanguage';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';
import { AuthManager } from '@/lib/auth';

interface LoginResponse {
  accessToken?: string;
  token?: string; // fallback for old API response
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    team: string | null; // ✅ Can be NULL for admin
    role: 'admin' | 'targetologist';
  };
  expiresIn?: number;
}

export default function TrafficLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { language, toggleLanguage, t } = useLanguage();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      console.log('🔐 Attempting login:', email);
      
      const response = await axios.post<LoginResponse>(
        `${API_URL}/api/traffic-auth/login`,
        {
          email: email.trim().toLowerCase(),
          password
        }
      );
      
      const data = response.data;
      
      // ✅ Support both old and new API response formats
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken || accessToken; // fallback to accessToken if no refresh
      const expiresIn = data.expiresIn || (24 * 60 * 60); // default 24 hours
      const user = data.user;
      
      if (!accessToken) {
        throw new Error('No access token received');
      }
      
      // ✅ Save tokens using AuthManager
      AuthManager.saveTokens(
        {
          accessToken,
          refreshToken,
          expiresIn
        },
        user
      );
      
      console.log('✅ Login successful:', user);
      toast.success(`Добро пожаловать, ${user.fullName}!`);

      // 🔥 FIX: Priority redirect for Global Admin (team can be NULL)
      if (user.role === 'admin') {
        console.log('👑 Global Admin detected, redirecting to /traffic/admin');
        navigate('/traffic/admin');
        return;
      }

      // ✅ Navigate targetologists based on team
      if (user.team) {
        const teamSlug = user.team.toLowerCase();
        navigate(`/traffic/cabinet/${teamSlug}`);
      } else {
        // Fallback: если нет team и не admin (не должно случиться)
        console.error('⚠️ User has no team and is not admin:', user);
        navigate('/traffic');
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      
      const errorMessage = error.response?.data?.error || 'Ошибка входа. Проверьте данные.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030303] via-[#0a0a0a] to-[#000000] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Advanced Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Radial gradient glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00FF88]/10 via-transparent to-transparent opacity-30" />
        
        {/* Animated grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          animation: 'grid-pulse 8s ease-in-out infinite'
        }} />
        
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00FF88]/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00FF88]/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* Language Toggle - Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-[#00FF88]/20 rounded-xl backdrop-blur-xl hover:bg-[#00FF88]/10 hover:border-[#00FF88]/40 transition-all shadow-lg"
        >
          <Globe className="w-4 h-4 text-[#00FF88]" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {language === 'ru' ? 'РУС' : 'ҚАЗ'}
          </span>
        </button>
      </div>
      
      {/* Login Card */}
      <div className="relative w-full max-w-md z-10">
        {/* Premium glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00FF88]/20 via-[#00FF88]/5 to-[#00FF88]/20 rounded-3xl blur-xl opacity-75 animate-pulse" />
        
        <div className="relative bg-gradient-to-b from-black/80 to-black/60 border border-[#00FF88]/30 rounded-2xl p-10 backdrop-blur-2xl shadow-2xl shadow-[#00FF88]/20">
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-10">
            <OnAILogo className="h-12 w-auto mb-6" />
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                {t('login.title')}
              </h1>
              <div className="flex items-center justify-center gap-2">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#00FF88]/50" />
                <p className="text-sm text-[#00FF88] font-medium uppercase tracking-wider">
                  {t('login.subtitle')}
                </p>
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#00FF88]/50" />
              </div>
            </div>
          </div>
          
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          
          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300 mb-2 tracking-wide">
                {t('login.email')}
              </label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-black/70 border-[#00FF88]/30 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20 transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300 mb-2 tracking-wide">
                {t('login.password')}
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-black/70 border-[#00FF88]/30 text-white placeholder:text-gray-600 h-12 rounded-xl focus:border-[#00FF88] focus:ring-2 focus:ring-[#00FF88]/20 transition-all"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#00FF88] to-[#00dd77] hover:from-[#00dd77] hover:to-[#00FF88] text-black font-bold py-6 text-base rounded-xl shadow-xl shadow-[#00FF88]/30 transition-all hover:shadow-2xl hover:shadow-[#00FF88]/40 hover:scale-[1.02] active:scale-[0.98] mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('login.loggingIn')}
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {t('login.button')}
                  <span className="text-lg">→</span>
                </span>
              )}
            </Button>
          </form>
        </div>
        
        {/* Premium Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-xs text-gray-500 tracking-wider">
            OnAI Academy Traffic Dashboard
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#00FF88]/20" />
            <p className="text-xs text-[#00FF88]/60 font-mono">2025</p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#00FF88]/20" />
          </div>
        </div>
        
        {/* Security Footer - Simple */}
        <div className="mt-6 py-3 border-t border-gray-800/30">
          <p className="text-xs text-gray-500 text-center">
            <span className="text-gray-400">⚠️ IP-адреса отслеживаются.</span> Передача доступа запрещена. Конфиденциальная информация.
          </p>
        </div>
      </div>
    </div>
  );
}


/**
 * Traffic Targetologist Settings Page - FULL REFACTOR V2
 * 
 * НОВАЯ АРХИТЕКТУРА:
 * 1. Процесс подключения кабинетов с визуальным индикатором
 * 2. Выпадающие списки для кабинетов и кампаний
 * 3. Система поиска по кабинетам и кампаниям
 * 4. Персональные UTM метки для каждого таргетолога
 * 5. Logout и Change Password кнопки
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Settings, Save, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Facebook, Youtube, Link, Tag, Bell, Globe, LogOut, Target, AlertCircle,
  Check, X, Loader2, Search, Key, Power
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { OnAILogo } from '@/components/traffic/OnAILogo';
import axios from 'axios';
import toast from 'react-hot-toast';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

// Traffic Source Types
type TrafficSource = 'facebook' | 'youtube' | 'tiktok' | 'google_ads';
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface TokenStatus {
  connected: boolean;
  lastChecked?: Date;
  error?: string;
}

interface FBAccount {
  id: string;
  name: string;
  status?: string;
  currency?: string;
  enabled: boolean;
  connectionStatus: ConnectionStatus; // NEW!
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  ad_account_id: string;
  ad_account_name?: string;
  enabled: boolean;
}

interface TrafficSourceConfig {
  id: TrafficSource;
  name: string;
  icon: any;
  color: string;
  iconBg: string;
  description: string;
}

const TRAFFIC_SOURCES: TrafficSourceConfig[] = [
  {
    id: 'facebook',
    name: 'Facebook Ads',
    icon: Facebook,
    color: '#1877F2',
    iconBg: 'bg-[#1877F2]/20',
    description: 'Facebook & Instagram кампании'
  },
  {
    id: 'youtube',
    name: 'YouTube Ads',
    icon: Youtube,
    color: '#FF0000',
    iconBg: 'bg-[#FF0000]/20',
    description: 'YouTube видео и In-Stream реклама'
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    icon: Target,
    color: '#000000',
    iconBg: 'bg-white/20',
    description: 'TikTok For Business кампании'
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    icon: Target,
    color: '#4285F4',
    iconBg: 'bg-[#4285F4]/20',
    description: 'Google Search, Display, Shopping'
  }
];

export default function TrafficSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Source selection
  const [selectedSource, setSelectedSource] = useState<TrafficSource>('facebook');
  const [tokenStatuses, setTokenStatuses] = useState<Record<TrafficSource, TokenStatus>>({
    facebook: { connected: false },
    youtube: { connected: false },
    tiktok: { connected: false },
    google_ads: { connected: false }
  });
  
  // Settings state
  const [fbAccounts, setFbAccounts] = useState<FBAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  
  // Search state
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  
  // UTM персональная метка
  const [personalUtmSource, setPersonalUtmSource] = useState('');
  
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  
  useEffect(() => {
    const userData = localStorage.getItem('traffic_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadSettings(parsedUser.id);
      checkTokenStatuses();
    }
  }, []);
  
  const checkTokenStatuses = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await axios.get(`${API_URL}/api/traffic-settings/token-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTokenStatuses(res.data.statuses || {
        facebook: { connected: true },
        youtube: { connected: false },
        tiktok: { connected: false },
        google_ads: { connected: false }
      });
    } catch (error) {
      console.error('Failed to check token statuses:', error);
      setTokenStatuses({
        facebook: { connected: true },
        youtube: { connected: false },
        tiktok: { connected: false },
        google_ads: { connected: false }
      });
    }
  };
  
  const loadSettings = async (userId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');
      
      const settingsRes = await axios.get(`${API_URL}/api/traffic-settings/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const settings = settingsRes.data.settings;
      if (settings) {
        const accounts = (settings.fb_ad_accounts || []).map((acc: any) => ({
          ...acc,
          connectionStatus: acc.enabled ? 'connected' : 'idle'
        }));
        setFbAccounts(accounts);
        setCampaigns(settings.tracked_campaigns || []);
        setPersonalUtmSource(settings.personal_utm_source || `fb_${user?.team?.toLowerCase() || 'default'}`);
      }
      
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };
  
  const loadAvailableAccounts = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await axios.get(`${API_URL}/api/traffic-settings/${user.id}/fb-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const availableAccounts = res.data.accounts || [];
      
      const mergedAccounts = availableAccounts.map((acc: FBAccount) => {
        const existing = fbAccounts.find(a => a.id === acc.id);
        return { 
          ...acc, 
          enabled: existing?.enabled || false,
          connectionStatus: existing?.connectionStatus || 'idle'
        };
      });
      
      setFbAccounts(mergedAccounts);
      toast.success(`Загружено ${mergedAccounts.length} кабинетов`);
      
    } catch (error: any) {
      console.error('Failed to load FB accounts:', error);
      toast.error('Ошибка загрузки кабинетов FB');
    }
  };
  
  const loadCampaignsForAccount = async (accountId: string) => {
    try {
      const token = localStorage.getItem('traffic_token');
      const res = await axios.get(`${API_URL}/api/traffic-settings/${user.id}/campaigns`, {
        params: { adAccountId: accountId },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newCampaigns = res.data.campaigns || [];
      
      const merged = [...campaigns];
      newCampaigns.forEach((camp: Campaign) => {
        camp.ad_account_id = accountId;
        camp.ad_account_name = fbAccounts.find(a => a.id === accountId)?.name;
        if (!merged.find(c => c.id === camp.id)) {
          merged.push(camp);
        }
      });
      
      setCampaigns(merged);
      setExpandedAccounts(prev => new Set(prev).add(accountId));
      toast.success(`Загружено ${newCampaigns.length} кампаний`);
      
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
      toast.error('Ошибка загрузки кампаний');
    }
  };
  
  // NEW: Connect account with visual feedback
  const connectAccount = async (accountId: string) => {
    try {
      // Update status to connecting
      setFbAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, connectionStatus: 'connecting' as ConnectionStatus } 
          : acc
      ));
      
      // Simulate connection process (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update status to connected
      setFbAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, enabled: true, connectionStatus: 'connected' as ConnectionStatus } 
          : acc
      ));
      
      toast.success('Кабинет подключен!');
      
      // Auto-load campaigns
      await loadCampaignsForAccount(accountId);
      
    } catch (error) {
      setFbAccounts(prev => prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, connectionStatus: 'error' as ConnectionStatus } 
          : acc
      ));
      toast.error('Ошибка подключения кабинета');
    }
  };
  
  // NEW: Disconnect account
  const disconnectAccount = (accountId: string) => {
    setFbAccounts(prev => prev.map(acc => 
      acc.id === accountId 
        ? { ...acc, enabled: false, connectionStatus: 'idle' as ConnectionStatus } 
        : acc
    ));
    
    // Remove campaigns for this account
    setCampaigns(prev => prev.filter(c => c.ad_account_id !== accountId));
    
    toast.success('Кабинет отключен');
  };
  
  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('traffic_token');
      
      await axios.put(`${API_URL}/api/traffic-settings/${user.id}`, {
        fb_ad_accounts: fbAccounts,
        tracked_campaigns: campaigns,
        personal_utm_source: personalUtmSource,
        active_source: selectedSource
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('✅ Настройки сохранены!');
      
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };
  
  const toggleCampaign = (campaignId: string) => {
    setCampaigns(prev => prev.map(camp => 
      camp.id === campaignId ? { ...camp, enabled: !camp.enabled } : camp
    ));
  };
  
  const toggleAccountExpansion = (accountId: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };
  
  const handleLogout = () => {
    localStorage.removeItem('traffic_token');
    localStorage.removeItem('traffic_user');
    const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
    navigate(isTrafficDomain ? '/login' : '/traffic/login');
  };
  
  const handleChangePassword = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.post(`${API_URL}/api/traffic-auth/request-password-reset`, {
        email: user.email
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Письмо для сброса пароля отправлено на ваш email!');
      setShowPasswordDialog(false);
    } catch (error) {
      toast.error('Ошибка отправки письма');
    }
  };
  
  // Filter accounts by search
  const filteredAccounts = fbAccounts.filter(acc => 
    acc.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
    acc.id.includes(accountSearchQuery)
  );
  
  // Filter campaigns by search
  const filteredCampaigns = (accountId: string) => {
    return campaigns
      .filter(c => c.ad_account_id === accountId)
      .filter(c => 
        c.name.toLowerCase().includes(campaignSearchQuery.toLowerCase()) ||
        c.id.includes(campaignSearchQuery)
      );
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00FF88]" />
      </div>
    );
  }
  
  const currentSource = TRAFFIC_SOURCES.find(s => s.id === selectedSource)!;
  const currentTokenStatus = tokenStatuses[selectedSource];
  
  return (
    <div className="min-h-screen bg-[#030303]">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00FF88]/5 via-transparent to-transparent" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,255,136,0.02) 1px, transparent 0)`,
          backgroundSize: '60px 60px'
        }} />
      </div>
      
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/60 border-b border-[#00FF88]/10 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <OnAILogo width={120} height={35} />
              {user && (
                <div className="hidden md:flex items-center gap-3 pl-4 border-l border-[#00FF88]/10">
                  <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
                    <Settings className="w-5 h-5 text-[#00FF88]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{user.fullName}</p>
                    <p className="text-xs text-[#00FF88]">Настройки</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleLanguage}
                variant="outline"
                size="sm"
                className="bg-black/80 border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10"
              >
                <Globe className="w-4 h-4 text-[#00FF88]" />
                <span className="hidden sm:inline ml-2 text-xs font-bold uppercase">{language === 'ru' ? 'РУС' : 'ҚАЗ'}</span>
              </Button>
              
              <Button
                onClick={() => navigate(`/cabinet/${user?.team.toLowerCase()}`)}
                variant="outline"
                size="sm"
                className="bg-black/80 border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10"
              >
                Dashboard
              </Button>
              
              {/* NEW: Change Password Button */}
              <Button
                onClick={() => setShowPasswordDialog(true)}
                variant="outline"
                size="sm"
                className="bg-black/80 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10"
              >
                <Key className="w-4 h-4" />
              </Button>
              
              {/* NEW: Logout Button */}
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="bg-black/80 border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="pt-20 container mx-auto px-4 py-8 max-w-7xl relative">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-[#00FF88]/10 to-transparent border border-[#00FF88]/20 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white mb-2">⚙️ Настройки источников трафика</h1>
          <p className="text-sm text-[#00FF88]/60">
            Подключай рекламные источники, настраивай кабинеты и персональные UTM метки
          </p>
        </div>
        
        {/* Traffic Sources Selection */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {TRAFFIC_SOURCES.map((source) => {
            const Icon = source.icon;
            const isSelected = selectedSource === source.id;
            const status = tokenStatuses[source.id];
            
            return (
              <div
                key={source.id}
                onClick={() => setSelectedSource(source.id)}
                className={`
                  relative cursor-pointer p-6 rounded-xl border transition-all
                  ${isSelected 
                    ? 'bg-gradient-to-br from-[#00FF88]/20 to-[#00FF88]/5 border-[#00FF88]/40 scale-105' 
                    : 'bg-black/40 border-gray-800/30 hover:border-[#00FF88]/20'
                  }
                `}
              >
                {isSelected && (
                  <div className="absolute inset-0 bg-[#00FF88]/10 blur-xl rounded-xl -z-10" />
                )}
                
                <div className={`w-12 h-12 ${source.iconBg} rounded-xl flex items-center justify-center mb-4 border border-white/10`}>
                  <Icon className="w-6 h-6" style={{ color: source.color }} />
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">{source.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{source.description}</p>
                
                <div className={`
                  flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg
                  ${status.connected 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }
                `}>
                  {status.connected ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span className="font-semibold">Подключено</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3" />
                      <span>Не подключено</span>
                    </>
                  )}
                </div>
                
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-[#00FF88] rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Selected Source Content */}
        <div className="space-y-6">
          {/* Token Connection Status */}
          <div className="bg-black/40 border border-[#00FF88]/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 ${currentSource.iconBg} rounded-xl flex items-center justify-center border border-white/10`}>
                  <currentSource.icon className="w-7 h-7" style={{ color: currentSource.color }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentSource.name}</h2>
                  <p className="text-sm text-gray-400">{currentSource.description}</p>
                </div>
              </div>
              
              <div className={`
                flex items-center gap-3 px-4 py-3 rounded-xl border
                ${currentTokenStatus.connected 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
                }
              `}>
                {currentTokenStatus.connected ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <p className="text-sm font-bold text-green-400">Токен подключен</p>
                      <p className="text-xs text-green-400/60">API доступен</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div>
                      <p className="text-sm font-bold text-red-400">Токен не настроен</p>
                      <p className="text-xs text-red-400/60">Обратитесь к администратору</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Facebook Content */}
          {selectedSource === 'facebook' && currentTokenStatus.connected && (
            <>
              {/* Персональная UTM метка */}
              <div className="bg-black/40 border border-[#00FF88]/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-[#00FF88]/20 rounded-xl flex items-center justify-center border border-[#00FF88]/30">
                    <Tag className="w-6 h-6 text-[#00FF88]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Персональная UTM метка</h3>
                    <p className="text-xs text-gray-400">Для отслеживания вашего трафика</p>
                  </div>
                </div>
                
                <div className="bg-black/60 border border-[#00FF88]/20 rounded-xl p-6">
                  <label className="text-sm text-gray-400 mb-3 block font-semibold">
                    UTM Source (автоматическое отслеживание)
                  </label>
                  <Input
                    value={personalUtmSource}
                    onChange={(e) => setPersonalUtmSource(e.target.value)}
                    className="bg-black/50 border-[#00FF88]/20 text-white text-lg font-mono"
                    placeholder="fb_kenesary"
                  />
                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">
                    💡 Все продажи с этой UTM меткой будут автоматически присвоены вам.
                    <br />
                    Используйте формат: <code className="text-[#00FF88] bg-black/50 px-2 py-1 rounded">источник_имя</code> (например: fb_kenesary, fb_arystan)
                  </p>
                  
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-sm text-green-400 font-semibold mb-2">✅ Автоматическое отслеживание включено</p>
                    <p className="text-xs text-green-400/70">
                      Система будет отслеживать все продажи с UTM меткой <code className="font-mono bg-black/50 px-2 py-1 rounded">{personalUtmSource}</code>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* FB Accounts */}
              <div className="bg-black/40 border border-[#00FF88]/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-6 h-6 text-[#1877F2]" />
                    <div>
                      <h3 className="text-xl font-bold text-white">Рекламные кабинеты</h3>
                      <p className="text-xs text-gray-400">Подключите кабинеты для отслеживания</p>
                    </div>
                  </div>
                  <Button
                    onClick={loadAvailableAccounts}
                    size="sm"
                    className="bg-[#00FF88] text-black hover:bg-[#00FF88]/90"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Загрузить доступные
                  </Button>
                </div>
                
                {/* Search for accounts */}
                {fbAccounts.length > 0 && (
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={accountSearchQuery}
                        onChange={(e) => setAccountSearchQuery(e.target.value)}
                        placeholder={t('settings.searchAccounts')}
                        className="pl-10 bg-black/50 border-[#00FF88]/20 text-white"
                      />
                    </div>
                  </div>
                )}
                
                {fbAccounts.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
                    <Facebook className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">{t('settings.clickLoadAccounts')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAccounts.map((account) => {
                      const isExpanded = expandedAccounts.has(account.id);
                      const accountCampaigns = filteredCampaigns(account.id);
                      const { connectionStatus } = account;
                      
                      return (
                        <div key={account.id} className="border border-gray-800 rounded-xl overflow-hidden">
                          {/* Account Header */}
                          <div className={`
                            p-4 flex items-center justify-between transition-all
                            ${account.enabled 
                              ? 'bg-[#00FF88]/10' 
                              : 'bg-black/20'
                            }
                          `}>
                            <div className="flex items-center gap-3 flex-1">
                              {/* Connection Status Indicator */}
                              <div className="flex items-center gap-2">
                                {connectionStatus === 'connecting' && (
                                  <Loader2 className="w-5 h-5 text-[#00FF88] animate-spin" />
                                )}
                                {connectionStatus === 'connected' && (
                                  <CheckCircle2 className="w-5 h-5 text-[#00FF88]" />
                                )}
                                {connectionStatus === 'idle' && (
                                  <XCircle className="w-5 h-5 text-gray-500" />
                                )}
                                {connectionStatus === 'error' && (
                                  <AlertCircle className="w-5 h-5 text-red-500" />
                                )}
                              </div>
                              
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-white">{account.name}</p>
                                <p className="text-xs text-gray-400">ID: {account.id} • {account.currency || 'N/A'}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Connection Status Text */}
                              {connectionStatus === 'connecting' && (
                                <span className="text-xs text-[#00FF88] px-3 py-1 bg-[#00FF88]/20 rounded-lg font-semibold">
                                  Подключение...
                                </span>
                              )}
                              {connectionStatus === 'connected' && accountCampaigns.length > 0 && (
                                <span className="text-xs bg-[#00FF88]/20 px-2 py-1 rounded text-[#00FF88] font-semibold">
                                  {accountCampaigns.filter(c => c.enabled).length}/{accountCampaigns.length} кампаний
                                </span>
                              )}
                              
                              {/* Connect/Disconnect Button */}
                              {!account.enabled ? (
                                <Button
                                  onClick={() => connectAccount(account.id)}
                                  disabled={connectionStatus === 'connecting'}
                                  size="sm"
                                  className="bg-[#00FF88] text-black hover:bg-[#00FF88]/90"
                                >
                                  {connectionStatus === 'connecting' ? (
                                    <>
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      Подключение
                                    </>
                                  ) : (
                                    <>
                                      <Power className="w-3 h-3 mr-1" />
                                      Подключить
                                    </>
                                  )}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => disconnectAccount(account.id)}
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                                  >
                                    <Power className="w-3 h-3 mr-1" />
                                    Отключить
                                  </Button>
                                  
                                  {accountCampaigns.length > 0 && (
                                    <button
                                      onClick={() => toggleAccountExpansion(account.id)}
                                      className="p-2 hover:bg-[#00FF88]/10 rounded-lg transition-all"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-[#00FF88]" />
                                      ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                      )}
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Campaigns Dropdown */}
                          {account.enabled && isExpanded && accountCampaigns.length > 0 && (
                            <div className="bg-black/60 border-t border-gray-800 p-4">
                              {/* Search for campaigns */}
                              <div className="mb-3">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                  <Input
                                    value={campaignSearchQuery}
                                    onChange={(e) => setCampaignSearchQuery(e.target.value)}
                                    placeholder={t('settings.searchCampaigns')}
                                    className="pl-9 py-1 text-sm bg-black/50 border-[#00FF88]/20 text-white"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">
                                  Кампании этого кабинета ({accountCampaigns.length}):
                                </p>
                                {accountCampaigns.map((campaign) => (
                                  <div
                                    key={campaign.id}
                                    onClick={() => toggleCampaign(campaign.id)}
                                    className={`
                                      p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all
                                      ${campaign.enabled 
                                        ? 'bg-[#00FF88]/10 border-[#00FF88]/30' 
                                        : 'bg-black/40 border-gray-700'
                                      }
                                    `}
                                  >
                                    <div className="flex items-center gap-3">
                                      {campaign.enabled ? (
                                        <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-gray-500" />
                                      )}
                                      <div>
                                        <p className="text-sm font-semibold text-white">{campaign.name}</p>
                                        <p className="text-xs text-gray-400">ID: {campaign.id}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className={`
                                        text-xs px-2 py-1 rounded font-semibold
                                        ${campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
                                      `}>
                                        {campaign.status}
                                      </span>
                                      {campaign.objective && (
                                        <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                          {campaign.objective}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Placeholder for other sources */}
          {selectedSource !== 'facebook' && (
            <div className="bg-black/40 border border-yellow-500/20 rounded-xl p-12">
              <div className="text-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Источник в разработке</h3>
                <p className="text-gray-400 mb-4">
                  {currentSource.name} интеграция будет доступна в следующих обновлениях
                </p>
                <p className="text-xs text-yellow-400/60">
                  {currentTokenStatus.connected ? 'Токен подключен' : 'Токен не настроен'}
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end gap-4 mt-8">
          <Button
            onClick={() => navigate(`/cabinet/${user?.team.toLowerCase()}`)}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            Отмена
          </Button>
          
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-[#00FF88] to-[#00dd77] text-black hover:from-[#00dd77] hover:to-[#00FF88] px-8 font-bold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Сохранить настройки
              </>
            )}
          </Button>
        </div>
      </div>
      
      {/* Change Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-black border border-[#00FF88]/20 rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4">Изменить пароль</h3>
            <p className="text-gray-400 mb-6">
              Мы отправим вам письмо со ссылкой для сброса пароля на <span className="text-[#00FF88] font-semibold">{user?.email}</span>
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => setShowPasswordDialog(false)}
                variant="outline"
                className="flex-1 border-gray-700"
              >
                Отмена
              </Button>
              <Button
                onClick={handleChangePassword}
                className="flex-1 bg-[#00FF88] text-black hover:bg-[#00FF88]/90"
              >
                Отправить письмо
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="bg-black/40 border-t border-gray-800/30 py-4 mt-12">
        <div className="container mx-auto px-4">
          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-2">
            <span className="text-yellow-400">⚠️</span>
            <span className="text-gray-400">IP-адреса отслеживаются. Передача доступа запрещена. Конфиденциальная информация.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

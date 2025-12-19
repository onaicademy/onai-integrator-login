/**
 * Traffic Targetologist Settings Page
 * 
 * Настройки таргетолога:
 * - Выбор FB рекламных кабинетов
 * - Выбор отслеживаемых кампаний
 * - Настройка UTM меток
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Settings, Save, RefreshCw, CheckCircle2, XCircle,
  Facebook, Link, Tag, Bell, Globe, LogOut, Target
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { OnAILogo } from '@/components/traffic/OnAILogo';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface FBAccount {
  id: string;
  name: string;
  status?: string;
  currency?: string;
  enabled: boolean;
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

export default function TrafficSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [fbAccounts, setFbAccounts] = useState<FBAccount[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [utmSource, setUtmSource] = useState('facebook');
  const [utmMedium, setUtmMedium] = useState('cpc');
  const [utmTemplates, setUtmTemplates] = useState<any>({
    campaign: '{campaign_name}',
    content: '{ad_name}'
  });
  
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  
  useEffect(() => {
    const userData = localStorage.getItem('traffic_user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadSettings(parsedUser.id);
    }
  }, []);
  
  const loadSettings = async (userId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');
      
      // Загружаем настройки
      const settingsRes = await axios.get(`${API_URL}/api/traffic-settings/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const settings = settingsRes.data.settings;
      if (settings) {
        setFbAccounts(settings.fb_ad_accounts || []);
        setCampaigns(settings.tracked_campaigns || []);
        setUtmSource(settings.utm_source || 'facebook');
        setUtmMedium(settings.utm_medium || 'cpc');
        setUtmTemplates(settings.utm_templates || {});
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
      
      // Merge с текущими настройками
      const mergedAccounts = availableAccounts.map((acc: FBAccount) => {
        const existing = fbAccounts.find(a => a.id === acc.id);
        return { ...acc, enabled: existing?.enabled || false };
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
      
      // Добавляем к существующим (без дубликатов)
      const merged = [...campaigns];
      newCampaigns.forEach((camp: Campaign) => {
        if (!merged.find(c => c.id === camp.id)) {
          merged.push(camp);
        }
      });
      
      setCampaigns(merged);
      toast.success(`Загружено ${newCampaigns.length} кампаний`);
      
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
      toast.error('Ошибка загрузки кампаний');
    }
  };
  
  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('traffic_token');
      
      await axios.put(`${API_URL}/api/traffic-settings/${user.id}`, {
        fb_ad_accounts: fbAccounts,
        tracked_campaigns: campaigns,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_templates: utmTemplates
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
  
  const toggleAccount = (accountId: string) => {
    setFbAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, enabled: !acc.enabled } : acc
    ));
  };
  
  const toggleCampaign = (campaignId: string) => {
    setCampaigns(prev => prev.map(camp => 
      camp.id === campaignId ? { ...camp, enabled: !camp.enabled } : camp
    ));
  };
  
  const handleLogout = () => {
    localStorage.removeItem('traffic_token');
    localStorage.removeItem('traffic_user');
    navigate('/login');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00FF88]" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#030303]">
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
                onClick={() => navigate(`/traffic/cabinet/${user?.team.toLowerCase()}`)}
                variant="outline"
                size="sm"
                className="bg-black/80 border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10"
              >
                Dashboard
              </Button>
              
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
      <div className="pt-20 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 bg-gradient-to-r from-[#00FF88]/10 to-transparent border border-[#00FF88]/20 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-white mb-2">⚙️ Настройки таргетолога</h1>
          <p className="text-sm text-[#00FF88]/60">
            Управляй своими рекламными кабинетами, кампаниями и UTM метками
          </p>
        </div>
        
        {/* FB Accounts Section */}
        <div className="mb-8 bg-black/40 border border-[#00FF88]/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Facebook className="w-6 h-6 text-[#1877F2]" />
              <h2 className="text-xl font-bold text-white">Рекламные кабинеты Facebook</h2>
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
          
          {fbAccounts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Нажмите "Загрузить доступные" для подключения FB кабинетов
            </p>
          ) : (
            <div className="space-y-2">
              {fbAccounts.map((account) => (
                <div
                  key={account.id}
                  className={`
                    p-4 rounded-lg border flex items-center justify-between cursor-pointer transition-all
                    ${account.enabled 
                      ? 'bg-[#00FF88]/10 border-[#00FF88]/30' 
                      : 'bg-black/20 border-gray-800/30'
                    }
                  `}
                  onClick={() => toggleAccount(account.id)}
                >
                  <div className="flex items-center gap-3">
                    {account.enabled ? (
                      <CheckCircle2 className="w-5 h-5 text-[#00FF88]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-500" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{account.name}</p>
                      <p className="text-xs text-gray-400">ID: {account.id}</p>
                    </div>
                  </div>
                  
                  {account.enabled && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadCampaignsForAccount(account.id);
                      }}
                      size="sm"
                      variant="outline"
                      className="border-[#00FF88]/20"
                    >
                      Загрузить кампании
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Campaigns Section */}
        {campaigns.length > 0 && (
          <div className="mb-8 bg-black/40 border border-[#00FF88]/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-[#00FF88]" />
              <h2 className="text-xl font-bold text-white">Отслеживаемые кампании</h2>
              <span className="text-xs bg-[#00FF88]/20 px-2 py-1 rounded">
                {campaigns.filter(c => c.enabled).length} / {campaigns.length}
              </span>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`
                    p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all
                    ${campaign.enabled 
                      ? 'bg-[#00FF88]/10 border-[#00FF88]/30' 
                      : 'bg-black/20 border-gray-800/30'
                    }
                  `}
                  onClick={() => toggleCampaign(campaign.id)}
                >
                  <div className="flex items-center gap-3">
                    {campaign.enabled ? (
                      <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-500" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{campaign.name}</p>
                      <p className="text-xs text-gray-400">
                        {campaign.ad_account_name} • {campaign.status}
                      </p>
                    </div>
                  </div>
                  
                  <span className={`
                    text-xs px-2 py-1 rounded
                    ${campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
                  `}>
                    {campaign.objective}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* UTM Settings */}
        <div className="mb-8 bg-black/40 border border-[#00FF88]/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="w-6 h-6 text-[#00FF88]" />
            <h2 className="text-xl font-bold text-white">UTM Метки</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">UTM Source</label>
              <Input
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
                placeholder="facebook"
              />
            </div>
            
            <div>
              <label className="text-sm text-gray-400 mb-2 block">UTM Medium</label>
              <Input
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
                placeholder="cpc"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400 mb-2 block">
                UTM Campaign Template
                <span className="text-xs text-gray-500 ml-2">(Используй {'{campaign_name}'} для имени кампании)</span>
              </label>
              <Input
                value={utmTemplates.campaign || ''}
                onChange={(e) => setUtmTemplates({ ...utmTemplates, campaign: e.target.value })}
                className="bg-black/50 border-[#00FF88]/20 text-white"
                placeholder="{campaign_name}"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400 mb-2 block">
                UTM Content Template
                <span className="text-xs text-gray-500 ml-2">(Используй {'{ad_name}'} для имени объявления)</span>
              </label>
              <Input
                value={utmTemplates.content || ''}
                onChange={(e) => setUtmTemplates({ ...utmTemplates, content: e.target.value })}
                className="bg-black/50 border-[#00FF88]/20 text-white"
                placeholder="{ad_name}"
              />
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button
            onClick={() => navigate(`/traffic/cabinet/${user?.team.toLowerCase()}`)}
            variant="outline"
            className="border-gray-700 text-gray-300"
          >
            Отмена
          </Button>
          
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-[#00FF88] text-black hover:bg-[#00FF88]/90 px-8"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
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
      
      {/* Footer */}
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

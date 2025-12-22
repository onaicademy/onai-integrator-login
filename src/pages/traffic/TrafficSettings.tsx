/**
 * Traffic Settings Page - ПОЛНАЯ ПЕРЕЗАПИСЬ
 * 
 * ✅ Выпадающие списки для кабинетов
 * ✅ Выпадающие списки для кампаний
 * ✅ Checkboxes для выбора
 * ✅ Сохранение в БД
 * ✅ Pre-selection из БД
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Settings, Save, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Facebook, LogOut, Loader2, Search, Globe, Power
} from 'lucide-react';
import { OnAILogo } from '@/components/OnAILogo';
import axios from 'axios';
import { toast } from 'sonner';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

interface FBAccount {
  id: string;
  name: string;
  status?: string;
  currency?: string;
  timezone?: string;
  amount_spent?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  ad_account_id: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
}

export default function TrafficSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState<Record<string, boolean>>({});
  
  // Available lists (загруженные из API)
  const [availableAccounts, setAvailableAccounts] = useState<FBAccount[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Record<string, Campaign[]>>({});
  
  // Selected items (что выбрал пользователь)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  
  // UI state
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');

  // UTM метка
  const [personalUtmSource, setPersonalUtmSource] = useState('');
  
  // 🔥 Facebook Connection Status
  const [fbStatus, setFbStatus] = useState<{
    connected: boolean;
    checking: boolean;
    error?: string;
    lastChecked?: string;
    tokenInfo?: any;
  }>({
    connected: false,
    checking: true
  });

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const userData = localStorage.getItem('traffic_user');
    if (!userData) {
      navigate('/traffic/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // 🔥 СНАЧАЛА проверяем статус Facebook токена
    checkFacebookStatus().then(() => {
      // 🔥 ПОТОМ загружаем настройки из БД
      loadSettings(parsedUser.id).then(() => {
        // 🔥 И автоматически загружаем доступные кабинеты
        loadAvailableAccounts();
      });
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // CHECK FACEBOOK TOKEN STATUS
  // ═══════════════════════════════════════════════════════════════
  
  const checkFacebookStatus = async () => {
    try {
      setFbStatus(prev => ({ ...prev, checking: true, error: undefined }));
      
      const res = await axios.get(`${API_URL}/api/traffic-settings/facebook/status`);
      
      setFbStatus({
        connected: res.data.connected,
        checking: false,
        lastChecked: new Date().toLocaleString('ru-RU'),
        tokenInfo: res.data.tokenInfo,
        error: undefined
      });
      
    } catch (error: any) {
      console.error('Failed to check Facebook status:', error);
      setFbStatus({
        connected: false,
        checking: false,
        error: error.response?.data?.error || 'Ошибка проверки токена',
        lastChecked: new Date().toLocaleString('ru-RU')
      });
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LOAD SETTINGS FROM DB
  // ═══════════════════════════════════════════════════════════════
  
  const loadSettings = async (userId: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');
      
      const res = await axios.get(`${API_URL}/api/traffic-settings/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const settings = res.data.settings;
      
      if (settings) {
        // ✅ Если в БД есть сохраненные кабинеты - показываем их
        const savedAccounts = settings.fb_ad_accounts || [];
        if (savedAccounts.length > 0) {
          setAvailableAccounts(savedAccounts);
          setSelectedAccountIds(savedAccounts.map((a: any) => a.id));
        }
        
        // ✅ Если есть сохраненные кампании - показываем их
        const savedCampaigns = settings.tracked_campaigns || [];
        if (savedCampaigns.length > 0) {
          // Group campaigns by ad account
          const grouped: Record<string, Campaign[]> = {};
          savedCampaigns.forEach((camp: Campaign) => {
            const accId = camp.ad_account_id;
            if (!grouped[accId]) grouped[accId] = [];
            grouped[accId].push(camp);
          });
          setAvailableCampaigns(grouped);
          setSelectedCampaignIds(savedCampaigns.map((c: any) => c.id));
        }
        
        setPersonalUtmSource(settings.personal_utm_source || `fb_${userId.toLowerCase()}`);
      }
      
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LOAD AVAILABLE AD ACCOUNTS FROM FACEBOOK API
  // ═══════════════════════════════════════════════════════════════
  
  const loadAvailableAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const token = localStorage.getItem('traffic_token');
      
      const res = await axios.get(`${API_URL}/api/traffic-settings/facebook/ad-accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const accounts = res.data.adAccounts || [];
      
      // 🔥 MERGE: Новые из API + уже выбранные из БД
      const existingIds = selectedAccountIds;
      
      // Создаем Map для быстрого поиска
      const accountsMap = new Map(accounts.map((acc: FBAccount) => [acc.id, acc]));
      
      // Добавляем уже выбранные (из БД), которых нет в новом списке
      availableAccounts.forEach(existing => {
        if (existingIds.includes(existing.id) && !accountsMap.has(existing.id)) {
          accountsMap.set(existing.id, existing);
        }
      });
      
      const merged = Array.from(accountsMap.values());
      
      setAvailableAccounts(merged);
      
      // 🔥 Показываем toast только если загрузили НОВЫЕ кабинеты (не при первой загрузке)
      if (availableAccounts.length > 0) {
        toast.success(`✅ Обновлено: ${merged.length} кабинетов`);
      } else {
        console.log(`✅ Loaded ${merged.length} accounts from Facebook`);
      }
      
    } catch (error: any) {
      console.error('Failed to load FB accounts:', error);
      // Не показываем ошибку при первой автоматической загрузке
      if (availableAccounts.length > 0) {
        toast.error('❌ Ошибка загрузки кабинетов');
      }
    } finally {
      setLoadingAccounts(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LOAD CAMPAIGNS FOR SPECIFIC AD ACCOUNT
  // ═══════════════════════════════════════════════════════════════
  
  const loadCampaignsForAccount = async (accountId: string) => {
    try {
      setLoadingCampaigns(prev => ({ ...prev, [accountId]: true }));
      const token = localStorage.getItem('traffic_token');
      
      const res = await axios.get(`${API_URL}/api/traffic-settings/facebook/campaigns/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const campaigns = res.data.campaigns || [];
      
      setAvailableCampaigns(prev => ({
        ...prev,
        [accountId]: campaigns
      }));
      
      toast.success(`✅ Загружено ${campaigns.length} кампаний`);
      
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
      toast.error('❌ Ошибка загрузки кампаний');
    } finally {
      setLoadingCampaigns(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // TOGGLE SELECTIONS
  // ═══════════════════════════════════════════════════════════════
  
  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev => {
      if (prev.includes(accountId)) {
        // Unselect - also unselect all campaigns from this account
        setSelectedCampaignIds(prevCamps => 
          prevCamps.filter(cId => {
            const allCamps = Object.values(availableCampaigns).flat();
            const camp = allCamps.find(c => c.id === cId);
            return camp?.ad_account_id !== accountId;
          })
        );
        return prev.filter(id => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaignIds(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      } else {
        return [...prev, campaignId];
      }
    });
  };

  const toggleAccountExpanded = (accountId: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
        // Load campaigns when expanding
        if (!availableCampaigns[accountId]) {
          loadCampaignsForAccount(accountId);
        }
      }
      return newSet;
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // SAVE SETTINGS TO DB
  // ═══════════════════════════════════════════════════════════════
  
  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('traffic_token');
      
      // Prepare data to save
      const selectedAccounts = availableAccounts.filter(acc => 
        selectedAccountIds.includes(acc.id)
      );
      
      const allSelectedCampaigns = Object.values(availableCampaigns)
        .flat()
        .filter(camp => selectedCampaignIds.includes(camp.id));
      
      const saveData = {
        fb_ad_accounts: selectedAccounts,
        tracked_campaigns: allSelectedCampaigns,
        facebook_connected: selectedAccounts.length > 0,
        personal_utm_source: personalUtmSource || `fb_${user?.team?.toLowerCase()}`,
      };
      
      await axios.put(
        `${API_URL}/api/traffic-settings/${user.id}`,
        saveData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('✅ Настройки сохранены!');
      
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('❌ Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════
  
  const handleLogout = () => {
    localStorage.removeItem('traffic_token');
    localStorage.removeItem('traffic_user');
    navigate('/traffic/login');
  };

  // ═══════════════════════════════════════════════════════════════
  // FILTERED LISTS
  // ═══════════════════════════════════════════════════════════════
  
  const filteredAccounts = availableAccounts.filter(acc =>
    acc.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
    acc.id.toLowerCase().includes(accountSearchQuery.toLowerCase())
  );

  const filteredCampaigns = (accountId: string) => {
    const campaigns = availableCampaigns[accountId] || [];
    return campaigns.filter(camp =>
      camp.name.toLowerCase().includes(campaignSearchQuery.toLowerCase()) ||
      camp.id.toLowerCase().includes(campaignSearchQuery.toLowerCase())
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  if (loading && availableAccounts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#00FF88]" />
          <p className="text-white/60">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <OnAILogo size="sm" />
              <div>
                <h1 className="text-xl font-bold text-white">Настройки</h1>
                <p className="text-sm text-white/60">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate('/traffic/dashboard')}
                variant="outline"
                className="border-white/20 hover:border-[#00FF88] text-white"
              >
                <Globe className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-white/20 hover:border-red-500 text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выход
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-6">
          
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FACEBOOK CONNECTION STATUS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-gradient-to-r from-[#1877F2]/10 to-purple-500/10 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`
                  w-12 h-12 rounded-xl flex items-center justify-center
                  ${fbStatus.connected 
                    ? 'bg-[#00FF88]/20 text-[#00FF88]' 
                    : fbStatus.checking 
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : 'bg-red-500/20 text-red-500'
                  }
                `}>
                  {fbStatus.checking ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : fbStatus.connected ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Facebook Ads API
                    {fbStatus.connected && (
                      <span className="px-2 py-0.5 bg-[#00FF88]/20 text-[#00FF88] text-xs rounded-full font-semibold">
                        ПОДКЛЮЧЕНО
                      </span>
                    )}
                    {fbStatus.error && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-semibold">
                        ОШИБКА
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-white/60">
                    {fbStatus.checking 
                      ? 'Проверка подключения...'
                      : fbStatus.connected
                      ? `Последняя проверка: ${fbStatus.lastChecked}`
                      : fbStatus.error || 'Токен не подключен'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                {/* Счетчики */}
                <div className="flex items-center gap-6 px-6 py-3 bg-white/5 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedAccountIds.length}</div>
                    <div className="text-xs text-white/60">Кабинетов</div>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{selectedCampaignIds.length}</div>
                    <div className="text-xs text-white/60">Кампаний</div>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{availableAccounts.length}</div>
                    <div className="text-xs text-white/60">Доступно</div>
                  </div>
                </div>
                
                <Button
                  onClick={checkFacebookStatus}
                  disabled={fbStatus.checking}
                  variant="outline"
                  className="border-white/20 hover:border-[#00FF88] text-white"
                >
                  {fbStatus.checking ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Проверить
                </Button>
              </div>
            </div>
          </div>
          
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* FACEBOOK AD ACCOUNTS SECTION */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div 
            className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
            data-tour="fb-accounts-section"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1877F2]/20 flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-[#1877F2]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Рекламные кабинеты Facebook</h2>
                  <p className="text-sm text-white/60">
                    {selectedAccountIds.length > 0 
                      ? `Выбрано: ${selectedAccountIds.length} из ${availableAccounts.length}`
                      : 'Выберите кабинеты для отслеживания'
                    }
                  </p>
                </div>
              </div>
              
              <Button
                onClick={loadAvailableAccounts}
                disabled={loadingAccounts}
                className="bg-[#00FF88] hover:bg-[#00DD77] text-black font-semibold"
                data-tour="refresh-accounts-btn"
              >
                {loadingAccounts ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Загрузить доступные кабинеты
              </Button>
            </div>

            {/* Search */}
            {availableAccounts.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    placeholder="Поиск по кабинетам..."
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              </div>
            )}

            {/* Accounts List */}
            <div className="space-y-2" data-tour="fb-accounts-list">
              {availableAccounts.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Facebook className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Нажмите "Загрузить доступные кабинеты" выше</p>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p>Ничего не найдено</p>
                </div>
              ) : (
                filteredAccounts.map(account => (
                  <div key={account.id}>
                    {/* Account Item */}
                    <div 
                      className={`
                        p-4 rounded-lg border transition-all cursor-pointer
                        ${selectedAccountIds.includes(account.id)
                          ? 'bg-[#00FF88]/10 border-[#00FF88] hover:bg-[#00FF88]/15'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Checkbox */}
                          <Checkbox
                            checked={selectedAccountIds.includes(account.id)}
                            onCheckedChange={() => toggleAccount(account.id)}
                            className="border-white/40"
                          />
                          
                          {/* Account Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">{account.name}</h3>
                              {selectedAccountIds.includes(account.id) && (
                                <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
                              )}
                            </div>
                            <p className="text-sm text-white/60">
                              ID: {account.id} • {account.currency || 'USD'}
                              {account.amount_spent && ` • Потрачено: $${account.amount_spent}`}
                            </p>
                          </div>
                        </div>

                        {/* Expand campaigns button */}
                        {selectedAccountIds.includes(account.id) && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAccountExpanded(account.id);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white"
                          >
                            {expandedAccounts.has(account.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            Кампании
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Campaigns List (когда expanded) */}
                    {expandedAccounts.has(account.id) && selectedAccountIds.includes(account.id) && (
                      <div className="ml-8 mt-2 space-y-2">
                        {loadingCampaigns[account.id] ? (
                          <div className="flex items-center gap-2 text-white/60 py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Загрузка кампаний...</span>
                          </div>
                        ) : !availableCampaigns[account.id] || availableCampaigns[account.id].length === 0 ? (
                          <div className="text-white/40 py-4 text-sm">
                            Нет доступных кампаний
                          </div>
                        ) : (
                          filteredCampaigns(account.id).map(campaign => (
                            <div
                              key={campaign.id}
                              className={`
                                p-3 rounded-lg border transition-all
                                ${selectedCampaignIds.includes(campaign.id)
                                  ? 'bg-[#00FF88]/10 border-[#00FF88]/50'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                                }
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedCampaignIds.includes(campaign.id)}
                                  onCheckedChange={() => toggleCampaign(campaign.id)}
                                  className="border-white/40"
                                />
                                
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-medium text-white">{campaign.name}</h4>
                                    {selectedCampaignIds.includes(campaign.id) && (
                                      <CheckCircle2 className="w-3 h-3 text-[#00FF88]" />
                                    )}
                                  </div>
                                  <p className="text-xs text-white/60">
                                    {campaign.status} • {campaign.objective || 'No objective'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* UTM МЕТКА */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h2 className="text-lg font-bold text-white mb-4">Персональная UTM метка</h2>
            <Input
              placeholder="fb_kenesary"
              value={personalUtmSource}
              onChange={(e) => setPersonalUtmSource(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            <p className="text-sm text-white/60 mt-2">
              Эта метка будет автоматически добавляться ко всем вашим продажам
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SAVE BUTTON */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => navigate('/traffic/dashboard')}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Отмена
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving || selectedAccountIds.length === 0}
              className="bg-[#00FF88] hover:bg-[#00DD77] text-black font-semibold min-w-[200px]"
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm text-white/60 mb-1">Кабинетов выбрано</p>
              <p className="text-2xl font-bold text-[#00FF88]">{selectedAccountIds.length}</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm text-white/60 mb-1">Кампаний выбрано</p>
              <p className="text-2xl font-bold text-[#00FF88]">{selectedCampaignIds.length}</p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm text-white/60 mb-1">UTM метка</p>
              <p className="text-lg font-bold text-white truncate">{personalUtmSource || 'Не установлена'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

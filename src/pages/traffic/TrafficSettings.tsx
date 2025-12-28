/**
 * Traffic Settings Page - ПОЛНАЯ ПЕРЕЗАПИСЬ
 * 
 * ✅ Выпадающие списки для кабинетов
 * ✅ Выпадающие списки для кампаний
 * ✅ Checkboxes для выбора
 * ✅ Сохранение в БД
 * ✅ Pre-selection из БД
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Settings, Save, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  Facebook, LogOut, Loader2, Search, Globe, Power, Lock
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
  business_manager_id?: string;
  business_manager_name?: string;
}

// Business Manager interface for hierarchical display
interface BusinessManager {
  id: string;
  name: string;
  accounts: FBAccount[];
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
  // 🔥 NEW: Targetologist detection
  targetologist?: string | null;
  detectionMethod?: 'database' | 'utm' | 'pattern' | 'manual';
  detectionConfidence?: 'high' | 'medium' | 'low';
}

const normalizeAccountId = (id: string) => {
  if (!id) return id;
  return id.startsWith('act_') ? id : `act_${id}`;
};

const normalizeAccounts = (accounts: FBAccount[]) => {
  const map = new Map<string, FBAccount>();
  accounts.forEach(account => {
    const normalizedId = normalizeAccountId(account.id);
    map.set(normalizedId, { ...account, id: normalizedId });
  });
  return Array.from(map.values());
};

const normalizeCampaigns = (campaigns: Campaign[]) => {
  const map = new Map<string, Campaign>();
  campaigns.forEach(campaign => {
    if (!campaign?.id) return;
    const normalizedAccountId = normalizeAccountId(campaign.ad_account_id);
    const normalized = { ...campaign, ad_account_id: normalizedAccountId };
    const existing = map.get(campaign.id);
    if (!existing) {
      map.set(campaign.id, normalized);
      return;
    }
    const existingAccountId = existing.ad_account_id || '';
    const preferCandidate = normalizedAccountId.startsWith('act_') && !existingAccountId.startsWith('act_');
    map.set(campaign.id, preferCandidate ? normalized : { ...normalized, ...existing });
  });
  return Array.from(map.values());
};

const groupCampaignsByAccount = (campaigns: Campaign[]) => {
  const grouped: Record<string, Campaign[]> = {};
  campaigns.forEach(campaign => {
    const accountId = normalizeAccountId(campaign.ad_account_id);
    if (!grouped[accountId]) grouped[accountId] = [];
    grouped[accountId].push({ ...campaign, ad_account_id: accountId });
  });
  return grouped;
};

export default function TrafficSettings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState<Record<string, boolean>>({});
  const [campaignsLoadedFromApi, setCampaignsLoadedFromApi] = useState<Record<string, boolean>>({});
  
  // Available lists (загруженные из API)
  const [availableAccounts, setAvailableAccounts] = useState<FBAccount[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Record<string, Campaign[]>>({});
  
  // Selected items (что выбрал пользователь)
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  
  // UI state
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [expandedBMs, setExpandedBMs] = useState<Set<string>>(new Set());
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');

  // 🔐 Assigned UTM (read-only, set by admin)
  const [assignedUtmSource, setAssignedUtmSource] = useState('');
  const [utmSourceEditable, setUtmSourceEditable] = useState(true);
  const [utmAssignedBy, setUtmAssignedBy] = useState<string | null>(null);
  
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
  // ✅ FIXED: Remove double auth check - TrafficGuard handles authentication
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    // ✅ No auth check here - TrafficGuard already validated the user
    const userData = localStorage.getItem('traffic_user');
    if (!userData) {
      // This should never happen if TrafficGuard is working
      console.error('No user data found - this should not happen!');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // 🔥 FIRST check Facebook token status
    checkFacebookStatus().then(() => {
      // 🔥 THEN load settings from DB
      loadSettings(parsedUser.id).then(() => {
        // 🔥 And automatically load available accounts
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
        const savedAccounts = normalizeAccounts(settings.fb_ad_accounts || []);
        if (savedAccounts.length > 0) {
          setAvailableAccounts(savedAccounts);
          setSelectedAccountIds(Array.from(new Set(savedAccounts.map((a: any) => a.id))));
        }
        
        // ✅ Если есть сохраненные кампании - показываем их
        const savedCampaigns = normalizeCampaigns(settings.tracked_campaigns || []);
        if (savedCampaigns.length > 0) {
          setAvailableCampaigns(groupCampaignsByAccount(savedCampaigns));
          setSelectedCampaignIds(Array.from(new Set(savedCampaigns.map((c: any) => c.id))));
          setCampaignsLoadedFromApi({});
        }
        
        // 🔐 Load assigned UTM (read-only)
        const assignedUtm = settings.assigned_utm_source || `fb_${userId.toLowerCase()}`;
        const isEditable = settings.utm_source_editable !== false; // Default to true if not set

        setAssignedUtmSource(assignedUtm);
        setUtmSourceEditable(isEditable);
        setUtmAssignedBy(settings.utm_source_assigned_by || null);
        
        if (!isEditable) {
          console.log(`🔒 UTM source is LOCKED: ${assignedUtm}`);
        }
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

      // 🔥 NEW: Use new Facebook API endpoint with caching
      const res = await axios.get(`${API_URL}/api/traffic-facebook/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const accounts = normalizeAccounts(res.data.accounts || []);
      
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
      
      const merged: FBAccount[] = Array.from(accountsMap.values()) as FBAccount[];
      
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
  // REFRESH AD ACCOUNTS (FORCE REFRESH - CLEAR CACHE)
  // ═══════════════════════════════════════════════════════════════

  const refreshAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const token = localStorage.getItem('traffic_token');

      // 🔥 NEW: Use POST /refresh endpoint to clear cache and fetch fresh data
      const res = await axios.post(`${API_URL}/api/traffic-facebook/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const accounts = normalizeAccounts(res.data.accounts || []);

      // Update available accounts
      setAvailableAccounts(accounts);

      console.log('✅ Refreshed', accounts.length, 'accounts from Facebook (cache cleared)');
      toast.success(`Обновлено ${accounts.length} кабинетов (кэш очищен)`);
      
    } catch (error: any) {
      console.error('Failed to refresh ad accounts:', error);
      toast.error('❌ Ошибка обновления рекламных кабинетов');
    } finally {
      setLoadingAccounts(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LOAD CAMPAIGNS FOR SPECIFIC AD ACCOUNT
  // ═══════════════════════════════════════════════════════════════
  
  const loadCampaignsForAccount = async (accountId: string) => {
    try {
      const normalizedAccountId = normalizeAccountId(accountId);
      setLoadingCampaigns(prev => ({ ...prev, [normalizedAccountId]: true }));
      const token = localStorage.getItem('traffic_token');

      // 🔥 NEW: Use new Facebook API endpoint with caching
      const res = await axios.get(`${API_URL}/api/traffic-facebook/campaigns/${accountId}?lite=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const campaigns = normalizeCampaigns(
        (res.data.campaigns || []).map((camp: Campaign) => ({
          ...camp,
          ad_account_id: normalizedAccountId,
        }))
      );
      
      setAvailableCampaigns(prev => ({
        ...prev,
        [normalizedAccountId]: normalizeCampaigns([...(prev[normalizedAccountId] || []), ...campaigns])
      }));

      setCampaignsLoadedFromApi(prev => ({ ...prev, [normalizedAccountId]: true }));
      
      toast.success(`✅ Загружено ${campaigns.length} кампаний`);
      
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
      toast.error('❌ Ошибка загрузки кампаний');
    } finally {
      const normalizedAccountId = normalizeAccountId(accountId);
      setLoadingCampaigns(prev => ({ ...prev, [normalizedAccountId]: false }));
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
    const normalizedAccountId = normalizeAccountId(accountId);
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(normalizedAccountId)) {
        newSet.delete(normalizedAccountId);
      } else {
        newSet.add(normalizedAccountId);
        // Load campaigns when expanding
        if (!campaignsLoadedFromApi[normalizedAccountId]) {
          loadCampaignsForAccount(normalizedAccountId);
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
      const uniqueCampaignsMap = new Map<string, Campaign>();
      allSelectedCampaigns.forEach(campaign => {
        if (!campaign?.id) return;
        uniqueCampaignsMap.set(campaign.id, campaign);
      });
      
      const saveData = {
        fb_ad_accounts: normalizeAccounts(selectedAccounts),
        tracked_campaigns: Array.from(uniqueCampaignsMap.values()),
        personal_utm_source: assignedUtmSource || `fb_${user?.team?.toLowerCase()}`,
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
  // GROUP ACCOUNTS BY BUSINESS MANAGER
  // ═══════════════════════════════════════════════════════════════
  
  const businessManagers: BusinessManager[] = useMemo(() => {
    const bmMap = new Map<string, BusinessManager>();
    
    availableAccounts.forEach(account => {
      const bmId = account.business_manager_id || 'unknown';
      const bmName = account.business_manager_name || 'Unknown Business Manager';
      
      if (!bmMap.has(bmId)) {
        bmMap.set(bmId, { id: bmId, name: bmName, accounts: [] });
      }
      bmMap.get(bmId)!.accounts.push(account);
    });
    
    return Array.from(bmMap.values()).sort((a, b) => b.accounts.length - a.accounts.length);
  }, [availableAccounts]);

  const toggleBMExpanded = (bmId: string) => {
    setExpandedBMs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bmId)) {
        newSet.delete(bmId);
      } else {
        newSet.add(bmId);
      }
      return newSet;
    });
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
              <OnAILogo />
              <div>
                <h1 className="text-xl font-bold text-white">Настройки</h1>
                <p className="text-sm text-white/60">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(`/traffic/cabinet/${user?.team?.toLowerCase() || 'dashboard'}`)}
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
                    <div className="text-2xl font-bold text-white">{businessManagers.length}</div>
                    <div className="text-xs text-white/60">BM</div>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
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
          {/* FACEBOOK TRACKING SETUP INSTRUCTIONS */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="bg-gradient-to-r from-[#00FF88]/10 to-blue-500/10 backdrop-blur-sm rounded-xl border border-[#00FF88]/20 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#00FF88]/20 flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#00FF88]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">⚙️ Настройка отслеживания кампаний</h3>
                <p className="text-sm text-white/60">Используйте этот формат UTM-параметров для автоматической атрибуции</p>
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4 border border-[#00FF88]/20">
              <p className="text-sm text-white/80 mb-3">
                <strong className="text-[#00FF88]">Обязательный формат URL Parameters:</strong>
              </p>
              <div className="bg-[#1a1a24] rounded-lg p-4 font-mono text-sm border border-[#00FF88]/10">
                <code className="text-[#00FF88]">
                  utm_source={assignedUtmSource || `fb_${user?.team?.toLowerCase() || 'your_team'}`}&utm_campaign={'{{campaign.name}}'}&utm_medium={'{{adset.name}}'}&utm_content={'{{ad.name}}'}
                </code>
              </div>
              <div className="mt-4 space-y-2 text-xs text-white/70">
                <p>• <span className="text-[#00FF88]">utm_source={assignedUtmSource || `fb_${user?.team?.toLowerCase() || 'your_team'}`}</span> — ваша фиксированная метка атрибуции{!utmSourceEditable && ' (🔒 назначена администратором)'}</p>
                <p>• <span className="text-white/90">utm_campaign={'{{campaign.name}}'}</span> — название кампании (динамическая переменная FB)</p>
                <p>• <span className="text-white/90">utm_medium={'{{adset.name}}'}</span> — название группы объявлений (динамическая переменная FB)</p>
                <p>• <span className="text-white/90">utm_content={'{{ad.name}}'}</span> — название объявления (динамическая переменная FB)</p>
              </div>

              {!utmSourceEditable && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-200">
                    <strong>🔒 Метка заблокирована:</strong> Ваш <code className="text-[#00FF88]">utm_source</code> назначен администратором и не может быть изменен. Это обеспечивает корректную атрибуцию всего вашего трафика.
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-200">
                  <strong>💡 Совет:</strong> Скопируйте эту строку и вставьте в раздел "URL Parameters" при настройке кампании в Facebook Ads Manager.
                </p>
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
                onClick={refreshAccounts}
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

            {/* Accounts List - Hierarchical by Business Manager */}
            <div className="space-y-4" data-tour="fb-accounts-list">
              {availableAccounts.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <Facebook className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>Нажмите "Загрузить доступные кабинеты" выше</p>
                </div>
              ) : businessManagers.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p>Ничего не найдено</p>
                </div>
              ) : (
                businessManagers.map(bm => {
                  // Filter accounts by search
                  const filteredBMAccounts = bm.accounts.filter(acc =>
                    acc.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) ||
                    acc.id.toLowerCase().includes(accountSearchQuery.toLowerCase())
                  );
                  
                  if (accountSearchQuery && filteredBMAccounts.length === 0) return null;
                  
                  const bmIsExpanded = expandedBMs.has(bm.id);
                  const bmSelectedCount = bm.accounts.filter(acc => selectedAccountIds.includes(acc.id)).length;
                  
                  return (
                    <div key={bm.id} className="rounded-xl border border-white/10 overflow-hidden">
                      {/* Business Manager Header */}
                      <div 
                        className={`p-4 cursor-pointer transition-all ${
                          bmSelectedCount > 0 ? 'bg-[#1877F2]/20' : 'bg-white/5 hover:bg-white/10'
                        }`}
                        onClick={() => toggleBMExpanded(bm.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {bmIsExpanded ? (
                              <ChevronDown className="w-5 h-5 text-[#1877F2]" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-white/60" />
                            )}
                            <div className="w-10 h-10 rounded-lg bg-[#1877F2]/20 flex items-center justify-center">
                              <Facebook className="w-5 h-5 text-[#1877F2]" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{bm.name}</h3>
                              <p className="text-sm text-white/60">
                                {bm.accounts.length} кабинетов • Выбрано: {bmSelectedCount}
                              </p>
                            </div>
                          </div>
                          {bmSelectedCount > 0 && (
                            <span className="px-3 py-1 bg-[#00FF88]/20 text-[#00FF88] rounded-full text-sm font-semibold">
                              {bmSelectedCount} выбрано
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Ad Accounts (when expanded) */}
                      {bmIsExpanded && (
                        <div className="border-t border-white/10 p-3 space-y-2 bg-black/20">
                          {(accountSearchQuery ? filteredBMAccounts : bm.accounts).map(account => (
                            <div key={account.id}>
                              {/* Account Item */}
                              <div 
                                className={`
                                  p-3 rounded-lg border transition-all cursor-pointer
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
                                        <h4 className="font-medium text-white">{account.name}</h4>
                                        {selectedAccountIds.includes(account.id) && (
                                          <CheckCircle2 className="w-4 h-4 text-[#00FF88]" />
                                        )}
                                      </div>
                                      <p className="text-xs text-white/60">
                                        ID: {account.id} • {account.currency || 'USD'}
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
                                              
                                              {/* 🔥 Targetologist Badge */}
                                              {campaign.targetologist && (
                                                <span className={`
                                                  px-2 py-0.5 rounded text-xs font-semibold
                                                  ${campaign.detectionMethod === 'database' ? 'bg-green-500/20 text-green-400 border border-green-500/40' : ''}
                                                  ${campaign.detectionMethod === 'utm' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : ''}
                                                  ${campaign.detectionMethod === 'pattern' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' : ''}
                                                  ${campaign.detectionMethod === 'manual' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/40' : ''}
                                                `}>
                                                  {campaign.detectionMethod === 'database' && '✅ '}
                                                  {campaign.detectionMethod === 'utm' && '🔗 '}
                                                  {campaign.detectionMethod === 'pattern' && '🎯 '}
                                                  {campaign.detectionMethod === 'manual' && '📝 '}
                                                  {campaign.targetologist}
                                                </span>
                                              )}
                                              
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
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>


          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* SAVE BUTTON */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => navigate(`/traffic/cabinet/${user?.team?.toLowerCase() || 'dashboard'}`)}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm text-white/60 mb-1">Кабинетов выбрано</p>
              <p className="text-2xl font-bold text-[#00FF88]">{selectedAccountIds.length}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-sm text-white/60 mb-1">Кампаний выбрано</p>
              <p className="text-2xl font-bold text-[#00FF88]">{selectedCampaignIds.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

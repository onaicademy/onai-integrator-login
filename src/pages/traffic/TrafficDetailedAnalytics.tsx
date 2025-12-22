/**
 * Traffic Detailed Analytics
 * 
 * Детальная аналитика по кампаниям, группам и объявлениям
 * Для таргетологов - видят только свои РК
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Globe, LogOut, Search, ChevronDown, ChevronRight, 
  TrendingUp, DollarSign, Target, Eye, MousePointerClick,
  BarChart3, Calendar, RefreshCw, Download, Sparkles, Loader2, Check, X
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { OnAILogo } from '@/components/OnAILogo';
import axios from 'axios';
import toast from 'react-hot-toast';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  revenue: number;
  roas: number;
  adsets?: AdSet[];
  expanded?: boolean;
}

interface AdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  ads?: Ad[];
  expanded?: boolean;
}

interface Ad {
  id: string;
  adset_id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
}

export default function TrafficDetailedAnalytics() {
  const [user, setUser] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('7d');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // AI Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  
  const analysisSteps = [
    'Loading Facebook metrics',
    'Calculating benchmarks',
    'Identifying optimization opportunities',
    'Generating recommendations'
  ];
  
  useEffect(() => {
    const userData = localStorage.getItem('traffic_user');
    if (userData) {
      setUser(JSON.parse(userData));
      fetchDetailedAnalytics(JSON.parse(userData));
    }
  }, [dateRange, statusFilter]);
  
  const fetchDetailedAnalytics = async (userData: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('traffic_token');
      
      const response = await axios.get(`${API_URL}/api/traffic-detailed-analytics`, {
        params: {
          team: userData.team,
          dateRange,
          status: statusFilter
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCampaigns(response.data.campaigns || []);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleCampaign = async (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    
    if (!campaign.expanded && !campaign.adsets) {
      // Load ad sets
      try {
        const token = localStorage.getItem('traffic_token');
        const response = await axios.get(`${API_URL}/api/traffic-detailed-analytics/campaign/${campaignId}/adsets`, {
          params: { dateRange },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        campaign.adsets = response.data.adsets || [];
      } catch (error) {
        toast.error('Ошибка загрузки групп');
        return;
      }
    }
    
    setCampaigns(campaigns.map(c => 
      c.id === campaignId ? { ...c, expanded: !c.expanded } : c
    ));
  };
  
  const toggleAdSet = async (campaignId: string, adsetId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign || !campaign.adsets) return;
    
    const adset = campaign.adsets.find(a => a.id === adsetId);
    if (!adset) return;
    
    if (!adset.expanded && !adset.ads) {
      // Load ads
      try {
        const token = localStorage.getItem('traffic_token');
        const response = await axios.get(`${API_URL}/api/traffic-detailed-analytics/adset/${adsetId}/ads`, {
          params: { dateRange },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        adset.ads = response.data.ads || [];
      } catch (error) {
        toast.error('Ошибка загрузки объявлений');
        return;
      }
    }
    
    setCampaigns(campaigns.map(c => {
      if (c.id === campaignId && c.adsets) {
        return {
          ...c,
          adsets: c.adsets.map(a => 
            a.id === adsetId ? { ...a, expanded: !a.expanded } : a
          )
        };
      }
      return c;
    }));
  };
  
  const handleLogout = () => {
    localStorage.removeItem('traffic_token');
    localStorage.removeItem('traffic_user');
    const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
    navigate(isTrafficDomain ? '/login' : '/traffic/login');
  };
  
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'archived': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };
  
  const filteredCampaigns = campaigns.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (statusFilter === 'all' || c.status.toLowerCase() === statusFilter.toLowerCase())
  );
  
  // AI Analysis handler
  const handleAIAnalysis = async () => {
    if (filteredCampaigns.length === 0) {
      toast.error('Нет кампаний для анализа');
      return;
    }
    
    setAnalyzing(true);
    setCurrentStep(0);
    setAnalysis(null);
    
    // Simulate steps (10 seconds total)
    const stepDuration = 2500; // 2.5 seconds per step = 10 seconds total
    
    for (let i = 0; i < analysisSteps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
    
    try {
      const token = localStorage.getItem('traffic_token');
      
      // Calculate team ROAS from campaigns
      const totalSpend = filteredCampaigns.reduce((sum, c) => sum + c.spend, 0);
      const totalRevenue = filteredCampaigns.reduce((sum, c) => sum + c.revenue, 0);
      const teamRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      
      const response = await axios.post(
        `${API_URL}/api/traffic-detailed-analytics/ai-analysis`, 
        { 
          campaigns: filteredCampaigns,
          team: user?.fullName || user?.team || 'Команда',
          teamRoas: teamRoas
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAnalysis(response.data.analysis);
      toast.success('AI анализ завершен');
    } catch (error: any) {
      console.error('AI analysis failed:', error);
      toast.error('Ошибка AI анализа');
    } finally {
      setAnalyzing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#030303] relative">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/60 border-b border-[#00FF88]/10 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left */}
            <div className="flex items-center gap-4">
              <OnAILogo width={120} height={35} />
              {user && (
                <div className="hidden md:flex items-center gap-3 pl-4 border-l border-[#00FF88]/10">
                  <div className="w-10 h-10 rounded-xl bg-[#00FF88]/10 flex items-center justify-center border border-[#00FF88]/20">
                    <BarChart3 className="w-5 h-5 text-[#00FF88]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{user.fullName}</p>
                    <p className="text-xs text-[#00FF88]">{t('detailedAnalytics.title')}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right */}
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
                <TrendingUp className="w-4 h-4 text-[#00FF88]" />
                <span className="hidden lg:inline ml-2 text-xs">{t('detailedAnalytics.dashboard')}</span>
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
      <div className="pt-20 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-[#00FF88]/10 to-transparent border border-[#00FF88]/20 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">📊 {t('detailedAnalytics.title')}</h1>
          <p className="text-sm text-[#00FF88]/60">
            {t('detailedAnalytics.subtitle')}
          </p>
        </div>
        
        {/* Filters & AI Analysis */}
        <div className="mb-6 bg-black/40 border border-[#00FF88]/10 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('detailedAnalytics.searchPlaceholder')}
                  className="pl-10 bg-black/50 border-[#00FF88]/20 text-white"
                />
              </div>
            </div>
            
            {/* Date Range */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full h-10 px-3 bg-black/50 border border-[#00FF88]/20 text-white rounded-md"
              >
                <option value="7d">{t('detailedAnalytics.last7days')}</option>
                <option value="14d">{t('detailedAnalytics.last14days')}</option>
                <option value="30d">{t('detailedAnalytics.last30days')}</option>
                <option value="90d">{t('detailedAnalytics.last90days')}</option>
              </select>
            </div>
            
            {/* Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 bg-black/50 border border-[#00FF88]/20 text-white rounded-md"
              >
                <option value="all">{t('detailedAnalytics.allStatuses')}</option>
                <option value="active">{t('detailedAnalytics.active')}</option>
                <option value="paused">{t('detailedAnalytics.paused')}</option>
                <option value="archived">{t('detailedAnalytics.archived')}</option>
              </select>
            </div>
          </div>
          
          {/* AI Analysis Button */}
          <div className="flex justify-end">
            <Button
              data-tour="ai-analysis-button"
              onClick={handleAIAnalysis}
              disabled={analyzing || filteredCampaigns.length === 0}
              className="bg-gradient-to-r from-[#00FF88] to-[#00DD70] text-black font-semibold hover:shadow-lg hover:shadow-[#00FF88]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Analysis
            </Button>
          </div>
        </div>
        
        {/* Campaigns List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-[#00FF88]" />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-black/40 border border-[#00FF88]/10 rounded-xl p-12">
            {/* Premium Empty State */}
            <div className="text-center max-w-2xl mx-auto">
              {/* Icon with glow */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-[#00FF88]/20 blur-3xl rounded-full" />
                <div className="relative bg-gradient-to-br from-black to-gray-900 p-6 rounded-2xl border border-[#00FF88]/30">
                  <BarChart3 className="w-16 h-16 text-[#00FF88] mx-auto" />
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-2xl font-bold text-white mb-3">
                Нет данных по кампаниям
              </h3>
              
              {/* Description */}
              <div className="space-y-4 text-left bg-black/60 border border-[#00FF88]/20 rounded-xl p-6 backdrop-blur-sm">
                <p className="text-gray-300 text-base leading-relaxed">
                  <span className="text-[#00FF88] font-semibold">Причина:</span> Facebook Ad Account не подключен или токен доступа истёк.
                </p>
                
                {/* Instructions */}
                <div className="space-y-3 mt-4">
                  <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Что нужно сделать:</p>
                  <ol className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#00FF88]/20 text-[#00FF88] rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <span>Обратитесь к <span className="text-[#00FF88] font-semibold">администратору</span> для подключения Facebook кабинета</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#00FF88]/20 text-[#00FF88] rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <span>Убедитесь что у токена есть разрешения <code className="text-[#00FF88] bg-black/50 px-2 py-0.5 rounded">ads_read</code></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#00FF88]/20 text-[#00FF88] rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <span>После настройки данные появятся автоматически</span>
                    </li>
                  </ol>
                </div>
                
                {/* Contact Admin Button */}
                <div className="pt-4">
                  <Button 
                    onClick={() => navigate('/settings')}
                    className="w-full bg-gradient-to-r from-[#00FF88] to-[#00dd77] hover:from-[#00dd77] hover:to-[#00FF88] text-black font-bold"
                  >
                    Перейти в настройки →
                  </Button>
                </div>
              </div>
              
              {/* Security Notice */}
              <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-xs text-yellow-300/80 flex items-center justify-center gap-2">
                  <span>⚠️</span>
                  <span>IP-адреса отслеживаются. Передача доступа запрещена. Конфиденциальная информация.</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-black/40 border border-[#00FF88]/10 rounded-xl overflow-hidden">
                {/* Campaign Row */}
                <div
                  className="p-4 hover:bg-black/60 cursor-pointer transition-all"
                  onClick={() => toggleCampaign(campaign.id)}
                >
                  <div className="flex items-center gap-3">
                    {/* Expand Icon */}
                    <div className="flex-shrink-0">
                      {campaign.expanded ? (
                        <ChevronDown className="w-5 h-5 text-[#00FF88]" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Name + Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-white truncate">{campaign.name}</p>
                        <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{campaign.objective}</p>
                    </div>
                    
                    {/* Metrics */}
                    <div className="hidden lg:flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <p className="text-gray-400">{t('metrics.spend')}</p>
                        <p className="font-bold text-white">{formatMoney(campaign.spend)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400">{t('metrics.impressions')}</p>
                        <p className="font-bold text-white">{formatNumber(campaign.impressions)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400">{t('metrics.clicks')}</p>
                        <p className="font-bold text-white">{formatNumber(campaign.clicks)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400">CTR</p>
                        <p className="font-bold text-[#00FF88]">{campaign.ctr.toFixed(2)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400">CPC</p>
                        <p className="font-bold text-white">{formatMoney(campaign.cpc)}</p>
                      </div>
                      {campaign.revenue > 0 && (
                        <div className="text-right">
                          <p className="text-gray-400">ROAS</p>
                          <p className="font-bold text-[#00FF88]">{campaign.roas.toFixed(2)}x</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Ad Sets (expanded) */}
                {campaign.expanded && campaign.adsets && campaign.adsets.length > 0 && (
                  <div className="bg-black/30 border-t border-[#00FF88]/10 px-4 py-2">
                    {campaign.adsets.map((adset) => (
                      <div key={adset.id} className="ml-8 my-2">
                        {/* Ad Set Row */}
                        <div
                          className="p-3 bg-black/40 rounded-lg hover:bg-black/60 cursor-pointer transition-all"
                          onClick={() => toggleAdSet(campaign.id, adset.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {adset.expanded ? (
                                <ChevronDown className="w-4 h-4 text-[#00FF88]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-white truncate">{adset.name}</p>
                                <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(adset.status)}`}>
                                  {adset.status}
                                </span>
                              </div>
                            </div>
                            
                            <div className="hidden md:flex items-center gap-3 text-xs">
                              <div className="text-right">
                                <p className="text-gray-400">{t('metrics.spend')}</p>
                                <p className="font-semibold text-white">{formatMoney(adset.spend)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-400">{t('metrics.impressions')}</p>
                                <p className="font-semibold text-white">{formatNumber(adset.impressions)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-400">{t('metrics.ctr')}</p>
                                <p className="font-semibold text-[#00FF88]">{adset.ctr.toFixed(2)}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Ads (expanded) */}
                        {adset.expanded && adset.ads && adset.ads.length > 0 && (
                          <div className="ml-8 mt-2 space-y-2">
                            {adset.ads.map((ad) => (
                              <div
                                key={ad.id}
                                className="p-3 bg-black/40 rounded-lg border border-[#00FF88]/5"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-medium text-white truncate">{ad.name}</p>
                                      <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(ad.status)}`}>
                                        {ad.status}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="hidden sm:flex items-center gap-3 text-xs">
                                    <div className="text-right">
                                      <p className="text-gray-500">{t('metrics.spend')}</p>
                                      <p className="font-medium text-white">{formatMoney(ad.spend)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-gray-500">{t('metrics.impressions')}</p>
                                      <p className="font-medium text-white">{formatNumber(ad.impressions)}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-gray-500">{t('metrics.ctr')}</p>
                                      <p className="font-medium text-[#00FF88]">{ad.ctr.toFixed(2)}%</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
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
      
      {/* AI Analysis Loader Modal */}
      {analyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black/95 border border-[#00FF88]/30 rounded-2xl p-8 max-w-md w-full text-center">
            <Loader2 className="w-12 h-12 animate-spin text-[#00FF88] mx-auto mb-4" />
            <p className="text-lg font-semibold text-white mb-2">Analyzing campaigns...</p>
            <p className="text-sm text-gray-400 mb-6">This will take about 10 seconds</p>
            <div className="space-y-2">
              {analysisSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 justify-center text-sm">
                  {i < currentStep ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : i === currentStep ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#00FF88]" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-600 rounded-full" />
                  )}
                  <span className={i <= currentStep ? 'text-white' : 'text-gray-500'}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* AI Analysis Results Modal */}
      {analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-black/95 border border-[#00FF88]/30 rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#00FF88]/20 bg-[#00FF88]/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00FF88]/20 flex items-center justify-center border border-[#00FF88]/30">
                  <Sparkles className="w-5 h-5 text-[#00FF88]" />
                </div>
                <h2 className="text-xl font-bold text-white">AI Campaign Analysis</h2>
              </div>
              <button
                onClick={() => setAnalysis(null)}
                className="p-2 hover:bg-[#00FF88]/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 leading-relaxed bg-black/50 p-4 rounded-lg border border-[#00FF88]/10">
                  {analysis}
                </pre>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#00FF88]/20 bg-[#00FF88]/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Sparkles className="w-4 h-4 text-[#00FF88]/60" />
                <span>Groq AI • Llama 3.1 70B Versatile</span>
              </div>
              <Button
                onClick={() => setAnalysis(null)}
                className="bg-[#00FF88] text-black font-semibold hover:bg-[#00DD70]"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

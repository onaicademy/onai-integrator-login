import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Search, TrendingUp, Users, Send, RefreshCw, Trash2, AlertCircle, Clock, ChevronDown, ChevronUp, DollarSign, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { landingSupabase } from '@/lib/supabase-landing'; // ✅ Use singleton instance
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getApiBaseUrl } from '@/lib/runtime-config';

interface JourneyStage {
  id: string;
  stage: string;
  source: string;
  metadata: any;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  created_at: string;
  email_sent: boolean;
  sms_sent: boolean;
  email_clicked?: boolean;
  email_clicked_at?: string;
  sms_clicked?: boolean;
  sms_clicked_at?: string;
  click_count?: number;
  metadata?: any;
  notification_status?: 'pending' | 'sent' | 'failed' | null;
  notification_error?: string | null;
  amocrm_lead_id?: string | null; // 📤 AmoCRM ID
  amocrm_synced?: boolean;
  journey_stages?: JourneyStage[]; // 🎉 NEW: Journey timeline
}

interface Stats {
  total: number;
  emailsSent: number;
  smsSent: number;
  emailClicks: number;
  smsClicks: number;
  emailClickRate: number;
  smsClickRate: number;
  bySource: Record<string, number>;
}

// 🎯 Dynamic source filter - uses real source values from database
type SourceFilter = string; // Can be 'all' or any source value like 'expresscourse', 'proftest_kenesary', etc.

// ✅ Version: 1.10.03 - Added source filtering (Dec 16, 2025)
export default function LeadsAdmin() {
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all'); // 'all' or real source value
  const [expandedSource, setExpandedSource] = useState<string | null>(null); // 🎯 Для аккордеона
  const ITEMS_PER_PAGE = 10;
  const queryClient = useQueryClient();

  // Fetch leads with notification status AND journey stages
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['landing', 'leads'],
    queryFn: async () => {
      if (!landingSupabase) {
        throw new Error('Landing Supabase client not initialized');
      }
      
      // 🎉 NEW: Get leads from view that includes journey_stages
      const { data: leadsData, error: leadsError } = await landingSupabase
        .from('leads_with_journey')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); // ✅ Увеличено с 100 до 1000!
      
      if (leadsError) {
        console.error('❌ Error fetching leads with journey:', leadsError);
        // Fallback to old query if view doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await landingSupabase
          .from('landing_leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000); // ✅ Увеличено с 100 до 1000!
        
        if (fallbackError) throw fallbackError;
        
        const leadsWithStatus = await Promise.all((fallbackData || []).map(async lead => {
          // ✅ FIX: Use maybeSingle() instead of single() to avoid 406 error
          const { data: notificationData } = await landingSupabase
            .from('scheduled_notifications')
            .select('status, error_message')
            .eq('lead_id', lead.id)
            .maybeSingle();
          
          return {
            ...lead,
            notification_status: notificationData?.status || null,
            notification_error: notificationData?.error_message || null,
            journey_stages: [],
          };
        }));
        
        return leadsWithStatus;
      }
      
      // Get notification statuses for all leads - BATCHED to avoid URL length limits
      let notificationsData: Array<{ lead_id: string; status: string; error_message: string }> = [];
      const leadIds = leadsData?.map(l => l.id) || [];
      const BATCH_SIZE = 50; // Supabase URL limit safe batch size
      
      for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
        const batchIds = leadIds.slice(i, i + BATCH_SIZE);
        try {
          const { data: batchData } = await landingSupabase
            .from('scheduled_notifications')
            .select('lead_id, status, error_message')
            .in('lead_id', batchIds);
          
          if (batchData) {
            notificationsData = [...notificationsData, ...batchData];
          }
        } catch (e) {
          console.error('Error fetching notification batch:', e);
        }
      }
      
      // Merge notification status into leads
      const leadsWithStatus = leadsData?.map(lead => {
        const notification = notificationsData?.find(n => n.lead_id === lead.id);
        
        // Parse journey_stages if it's a JSON string
        let parsedJourneyStages = lead.journey_stages || [];
        if (typeof lead.journey_stages === 'string') {
          try {
            parsedJourneyStages = JSON.parse(lead.journey_stages);
          } catch (e) {
            console.error('Failed to parse journey_stages:', e);
            parsedJourneyStages = [];
          }
        }
        
        return {
          ...lead,
          notification_status: notification?.status || null,
          notification_error: notification?.error_message || null,
          journey_stages: parsedJourneyStages,
        };
      });
      
      return leadsWithStatus || [];
    },
    enabled: !!landingSupabase,
    refetchInterval: 10000, // Refresh every 10s to show status updates
  });

  // ✅ НОВЫЙ: Получаем РЕАЛЬНОЕ количество лидов из БД (COUNT)
  const { data: totalCount } = useQuery<number>({
    queryKey: ['landing', 'leads', 'count'],
    queryFn: async () => {
      if (!landingSupabase) {
        throw new Error('Landing Supabase client not initialized');
      }
      
      const { count, error } = await landingSupabase
        .from('landing_leads')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!landingSupabase,
    refetchInterval: 10000, // Refresh every 10s
  });

  // Resend mutation
  const resendMutation = useMutation({
    mutationFn: async (leadId: string) => {
      // ✅ FIX: Use API_URL from env to ensure correct backend URL
      const apiUrl = getApiBaseUrl() || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}/api/landing/resend/${leadId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['landing', 'stats'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      // ✅ FIX: Use API_URL from env to ensure correct backend URL
      const apiUrl = getApiBaseUrl() || 'http://localhost:5000';
      const response = await axios.delete(`${apiUrl}/api/landing/delete/${leadId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['landing', 'stats'] });
    },
  });

  // 📤 AmoCRM Sync mutation
  const syncAmoCRMMutation = useMutation({
    mutationFn: async (leadId: string) => {
      // ✅ FIX: Use API_URL from env to ensure correct backend URL
      const apiUrl = getApiBaseUrl() || 'http://localhost:5000';
      const response = await axios.post(`${apiUrl}/api/landing/sync-to-amocrm/${leadId}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['landing', 'leads'] });
      if (data.alreadyExists) {
        alert(`✅ Лид уже в AmoCRM (ID: ${data.amocrm_lead_id})`);
      } else {
        alert(`✅ Сделка создана в AmoCRM (ID: ${data.amocrm_lead_id})`);
      }
    },
    onError: (error: any) => {
      alert(`❌ Ошибка: ${error.response?.data?.message || error.message}`);
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ['landing', 'stats'],
    queryFn: async () => {
      if (!landingSupabase) {
        throw new Error('Landing Supabase client not initialized');
      }
      
      const { data, error } = await landingSupabase
        .from('landing_leads')
        .select('source, email_sent, sms_sent, email_clicked, sms_clicked');
      
      if (error) throw error;
      
      const bySource: Record<string, number> = {};
      let emailsSent = 0;
      let smsSent = 0;
      let emailClicks = 0;
      let smsClicks = 0;
      
      data?.forEach(lead => {
        bySource[lead.source] = (bySource[lead.source] || 0) + 1;
        if (lead.email_sent) emailsSent++;
        if (lead.sms_sent) smsSent++;
        if (lead.email_clicked) emailClicks++;
        if (lead.sms_clicked) smsClicks++;
      });
      
      const emailClickRate = emailsSent > 0 ? (emailClicks / emailsSent) * 100 : 0;
      const smsClickRate = smsSent > 0 ? (smsClicks / smsSent) * 100 : 0;
      
      return {
        total: data?.length || 0,
        emailsSent,
        smsSent,
        emailClicks,
        smsClicks,
        emailClickRate,
        smsClickRate,
        bySource,
      };
    },
    enabled: !!landingSupabase,
  });

  // 🎯 NEW: Get unique sources and count by source (динамическая группировка)
  const sourceStats = leads?.reduce((acc, lead) => {
    const source = lead.source || 'unknown';
    if (!acc[source]) {
      acc[source] = {
        count: 0,
        emailsSent: 0,
        smsSent: 0,
        emailClicks: 0,
        smsClicks: 0,
      };
    }
    acc[source].count++;
    if (lead.email_sent) acc[source].emailsSent++;
    if (lead.sms_sent) acc[source].smsSent++;
    if (lead.email_clicked) acc[source].emailClicks++;
    if (lead.sms_clicked) acc[source].smsClicks++;
    return acc;
  }, {} as Record<string, { count: number; emailsSent: number; smsSent: number; emailClicks: number; smsClicks: number }>);

  // 🎯 Sort sources by count (descending)
  const sortedSources = Object.entries(sourceStats || {})
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([source]) => source);

  // 🎯 Apply source filter (по реальному источнику из БД)
  const sourceFilteredLeads = leads?.filter(lead => {
    if (sourceFilter === 'all') return true;
    return lead.source === sourceFilter;
  });

  // 🎯 Apply search filter
  const filteredLeads = sourceFilteredLeads?.filter(lead => 
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone?.includes(searchQuery) ||
    lead.source?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil((filteredLeads?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLeads = filteredLeads?.slice(startIndex, endIndex);

  // Reset to page 1 when search query or source filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceFilter]);

  // 🎯 Helper function to get source display name with emoji (КОРОТКИЕ названия!)
  const getSourceDisplay = (source: string): { name: string; emoji: string; color: string } => {
    const sourceMap: Record<string, { name: string; emoji: string; color: string }> = {
      'expresscourse': { name: 'Экспресс', emoji: '🎓', color: 'orange' },
      'proftest_kenesary': { name: 'Кенисары', emoji: '👨‍💼', color: 'blue' },
      'proftest_arystan': { name: 'Арыстан', emoji: '⚡', color: 'purple' },
      'proftest_test': { name: 'Тест', emoji: '🧪', color: 'cyan' },
      'proftest_cursor_debug': { name: 'Debug', emoji: '🐛', color: 'pink' },
      'proftest_journey_test': { name: 'Journey', emoji: '🗺️', color: 'green' },
      'proftest_unknown': { name: 'Неизв.', emoji: '❓', color: 'gray' },
      'TF4': { name: 'Траф4', emoji: '🚀', color: 'red' },
    };
    
    return sourceMap[source] || { name: source, emoji: '📌', color: 'gray' };
  };

  // 🎯 NEW: Группировка лидов по дням для графиков
  const getChartDataBySource = (source: string) => {
    const sourceLeads = leads?.filter(l => l.source === source) || [];
    
    // Группируем по дням (последние 7 дней)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      return date;
    });

    const chartData = last7Days.map(date => {
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayLeads = sourceLeads.filter(lead => {
        const leadTime = new Date(lead.created_at).getTime();
        return leadTime >= dayStart && leadTime < dayEnd;
      });
      
      return {
        date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
        leads: dayLeads.length,
        emailClicks: dayLeads.filter(l => l.email_clicked).length,
        smsClicks: dayLeads.filter(l => l.sms_clicked).length,
      };
    });

    return chartData;
  };

  // 🎯 NEW: Подсчет трендов (новые лиды за последние 24ч по источнику)
  const getTrend24h = (source: string) => {
    const now = Date.now();
    const yesterday = now - 24 * 60 * 60 * 1000;
    
    const sourceLeads = leads?.filter(l => l.source === source) || [];
    const last24h = sourceLeads.filter(lead => {
      const leadTime = new Date(lead.created_at).getTime();
      return leadTime >= yesterday;
    }).length;
    
    return last24h;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 🔥 NEW: Calculate notification countdown
  const calculateNotificationCountdown = (createdAt: string): { timeLeft: number; isScheduled: boolean } => {
    const NOTIFICATION_DELAY_MS = 10 * 60 * 1000; // 10 minutes
    const created = new Date(createdAt).getTime();
    const scheduledSendTime = created + NOTIFICATION_DELAY_MS;
    const now = Date.now();
    const timeLeft = scheduledSendTime - now;
    
    return {
      timeLeft: Math.max(0, timeLeft),
      isScheduled: timeLeft > 0
    };
  };

  // 🔥 NEW: Format countdown as MM:SS
  const formatCountdown = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 🔥 NEW: Real-time countdown timer component
  const NotificationCountdown = ({ createdAt, sent, error }: { createdAt: string; sent: boolean; error: boolean }) => {
    const [countdown, setCountdown] = useState(() => calculateNotificationCountdown(createdAt));

    useEffect(() => {
      // Update countdown every second
      const interval = setInterval(() => {
        setCountdown(calculateNotificationCountdown(createdAt));
      }, 1000);

      return () => clearInterval(interval);
    }, [createdAt]);

    if (sent) return null; // Already sent
    if (error) return null; // Failed
    if (!countdown.isScheduled) return null; // Past scheduled time

    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20">
        <Clock size={10} className="text-yellow-400 animate-pulse" />
        <span className="text-xs text-yellow-400 font-mono font-semibold">
          {formatCountdown(countdown.timeLeft)}
        </span>
      </div>
    );
  };

  // 🎉 NEW: Format stage labels
  const getStageLabel = (stage: string): { label: string; color: string; icon: string } => {
    const stageMap: Record<string, { label: string; color: string; icon: string }> = {
      proftest_submitted: { label: '📝 Прошел ProfTest', color: 'blue', icon: '✓' },
      expresscourse_clicked: { label: '👁️ Кликнул ExpressCourse', color: 'purple', icon: '👁️' },
      expresscourse_submitted: { label: '📩 Заявка ExpressCourse', color: 'green', icon: '✓' },
      payment_kaspi: { label: '💳 Нажал Kaspi', color: 'orange', icon: '💳' },
      payment_card: { label: '💳 Нажал Карта', color: 'cyan', icon: '💳' },
      payment_manager: { label: '💬 Нажал Чат с менеджером', color: 'pink', icon: '💬' },
    };
    
    return stageMap[stage] || { label: stage, color: 'gray', icon: '●' };
  };

  return (
    <div className="min-h-screen relative overflow-hidden rounded-3xl bg-[#030303] border border-white/5">
      {/* ✅ BACKGROUND GRID */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* ✅ HEADER - Mobile Optimized */}
      <div className="relative z-10 px-4 md:px-8 py-4 md:py-8 border-b border-white/5">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-[#00FF94] transition-colors text-sm md:text-base"
        >
          <ArrowLeft size={18} className="md:w-5 md:h-5" />
          Назад в админку
        </Link>
      </div>

      {/* ✅ CONTENT - Mobile Optimized */}
      <div className="relative z-10 px-4 md:px-8 py-4 md:py-8">
        {/* Stats Cards - Mobile Optimized: 2 cols on mobile, 3 on tablet, 6 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Users className="text-[#00FF94]" size={20} />
              <h3 className="text-[#9CA3AF] text-[10px] md:text-xs uppercase tracking-wide">Лидов</h3>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{stats?.total || 0}</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Mail className="text-blue-400" size={20} />
              <h3 className="text-[#9CA3AF] text-[10px] md:text-xs uppercase tracking-wide">Email</h3>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{stats?.emailsSent || 0}</p>
            <p className="text-[10px] md:text-xs text-[#9CA3AF] mt-0.5 md:mt-1">Отправлено</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Mail className="text-green-400" size={20} />
              <h3 className="text-[#9CA3AF] text-[10px] md:text-xs uppercase tracking-wide">Email CTR</h3>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{stats?.emailClicks || 0}</p>
            <p className="text-[10px] md:text-xs text-green-400 mt-0.5 md:mt-1">
              {stats?.emailClickRate ? Math.round(stats.emailClickRate) : 0}% кликнули
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Send className="text-purple-400" size={20} />
              <h3 className="text-[#9CA3AF] text-[10px] md:text-xs uppercase tracking-wide">SMS</h3>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{stats?.smsSent || 0}</p>
            <p className="text-[10px] md:text-xs text-[#9CA3AF] mt-0.5 md:mt-1">Отправлено</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Send className="text-green-400" size={20} />
              <h3 className="text-[#9CA3AF] text-[10px] md:text-xs uppercase tracking-wide">SMS CTR</h3>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{stats?.smsClicks || 0}</p>
            <p className="text-[10px] md:text-xs text-green-400 mt-0.5 md:mt-1">
              {stats?.smsClickRate ? Math.round(stats.smsClickRate) : 0}% кликнули
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <TrendingUp className="text-[#00FF94]" size={20} />
              <h3 className="text-[#9CA3AF] text-[10px] md:text-xs uppercase tracking-wide">Источники</h3>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white">{Object.keys(stats?.bySource || {}).length}</p>
            <p className="text-[10px] md:text-xs text-[#9CA3AF] mt-0.5 md:mt-1">Уникальных</p>
          </div>
        </div>


        {/* Header + Search - Mobile Optimized */}
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Landing заявки</h1>
            <p className="text-sm md:text-base text-[#9CA3AF]">
              {leadsLoading ? 'Загрузка...' : `Всего зарегистрировано: ${totalCount || 0}`}
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
            {/* 🔥 МАССОВАЯ СИНХРОНИЗАЦИЯ AmoCRM - Mobile Full Width */}
            <button
              onClick={async () => {
                if (!confirm(`Синхронизировать все несинхронизированные лиды с AmoCRM?\n\nСервер будет отправлять их по очереди с подтверждением от AmoCRM.`)) {
                  return;
                }
                
                try {
                  setSyncing(true);
                  const apiUrl = getApiBaseUrl() || 'http://localhost:5000';
                  
                  // 🔥 FIX: Правильный endpoint для синхронизации
                  const response = await axios.post(`${apiUrl}/api/landing/sync-all-to-amocrm`, {}, {
                    timeout: 300000 // 5 минут на batch sync
                  });
                  
                  if (response.data.success) {
                    const { total, synced, skipped, failed, errors } = response.data;
                    
                    let message = `✅ Синхронизация завершена!\n\n`;
                    message += `📊 Всего лидов: ${total}\n`;
                    message += `✅ Успешно синхронизировано: ${synced}\n`;
                    message += `⏭️  Пропущено (уже есть): ${skipped}\n`;
                    message += `❌ Ошибки: ${failed}\n`;
                    
                    if (errors && errors.length > 0) {
                      message += `\n🔍 Детали ошибок:\n`;
                      errors.slice(0, 3).forEach((err: any) => {
                        message += `- ${err.name}: ${err.error}\n`;
                      });
                      if (errors.length > 3) {
                        message += `... и ещё ${errors.length - 3} ошибок\n`;
                      }
                    }
                    
                    alert(message);
                    queryClient.invalidateQueries({ queryKey: ['landing', 'leads'] });
                    queryClient.invalidateQueries({ queryKey: ['landing', 'leads', 'count'] });
                  } else {
                    throw new Error(response.data.error || 'Failed to sync');
                  }
                } catch (error: any) {
                  console.error('❌ Sync error:', error);
                  const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message;
                  alert(`❌ Ошибка синхронизации:\n\n${errorMsg}`);
                } finally {
                  setSyncing(false);
                }
              }}
              disabled={syncing}
              className="flex items-center justify-center gap-2 px-4 py-3 md:py-2.5 rounded-xl bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] hover:bg-[#00FF94]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm md:text-base touch-manipulation"
              title="Синхронизировать все несинхронизированные лиды с AmoCRM (последовательно с очередью)"
            >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{syncing ? 'СИНХРОНИЗАЦИЯ...' : 'СИНХРОНИЗАЦИЯ С AMOCRM 🚀'}</span>
              <span className="sm:hidden">{syncing ? 'Синхронизация...' : 'AmoCRM Sync 🚀'}</span>
            </button>

            {/* Search - Mobile Full Width */}
            <div className="relative flex-1">
              <Search className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-3 md:pr-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-white text-sm md:text-base placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#00FF94]/30 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* 🎯 ПРОСТОЙ фильтр - Horizontal Scroll on Mobile */}
        <div className="mb-4 md:mb-6 -mx-4 md:mx-0 px-4 md:px-0">
          <div className="flex md:flex-wrap gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {/* "Все" Button */}
            <button
              onClick={() => setSourceFilter('all')}
              className={`flex-shrink-0 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-colors touch-manipulation ${
                sourceFilter === 'all'
                  ? 'bg-[#00FF94]/20 border border-[#00FF94]/30 text-[#00FF94]'
                  : 'bg-white/[0.02] border border-white/5 text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white active:scale-95'
              }`}
            >
              🌍 Все ({leads?.length || 0})
            </button>
            
            {/* Dynamic source buttons - Horizontal Scroll */}
            {sortedSources.map(source => {
              const display = getSourceDisplay(source);
              const count = sourceStats![source].count;
              
              const colorClasses: Record<string, string> = {
                orange: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
                blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
                purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
                cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
                pink: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
                green: 'bg-green-500/20 border-green-500/30 text-green-400',
                gray: 'bg-gray-500/20 border-gray-500/30 text-gray-400',
              };
              
              return (
                <button
                  key={source}
                  onClick={() => setSourceFilter(source)}
                  className={`flex-shrink-0 px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all touch-manipulation whitespace-nowrap ${
                    sourceFilter === source
                      ? `border ${colorClasses[display.color]}`
                      : 'bg-white/[0.02] border border-white/5 text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white active:scale-95'
                  }`}
                >
                  <span className="text-base md:text-lg">{display.emoji}</span> {display.name} · {count}
                </button>
              );
            })}
          </div>
        </div>

        {/* 🎯 ИНТЕРАКТИВНЫЙ ДАШБОРД с аккордеонами по источникам - Mobile Optimized */}
        {sourceFilter === 'all' ? (
          // Если "Все" - показываем аккордеоны для всех источников
          <div className="mb-4 md:mb-6 space-y-2 md:space-y-3">
            {sortedSources.map(source => {
              const stats = sourceStats![source];
              const display = getSourceDisplay(source);
              const isExpanded = expandedSource === source;
              const trend24h = getTrend24h(source);
              const chartData = getChartDataBySource(source);
              
              const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
                orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400' },
                blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
                purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
                cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
                pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' },
                green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400' },
                red: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
                gray: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-400' },
              };
              
              const colors = colorClasses[display.color] || colorClasses.gray;
              
              return (
                <div key={source} className={`border ${colors.border} rounded-xl overflow-hidden transition-all ${isExpanded ? colors.bg : 'bg-white/[0.02]'}`}>
                  {/* Заголовок аккордеона - Mobile Optimized (больший tap target) */}
                  <button
                    onClick={() => setExpandedSource(isExpanded ? null : source)}
                    className="w-full px-3 md:px-4 py-4 md:py-3 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors touch-manipulation"
                  >
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <span className="text-xl md:text-2xl flex-shrink-0">{display.emoji}</span>
                      <div className="text-left min-w-0 flex-1">
                        <h3 className={`font-bold text-sm md:text-base ${colors.text} truncate`}>{display.name}</h3>
                        <p className="text-[#9CA3AF] text-xs md:text-sm">
                          {stats.count} лидов
                          <span className="text-green-400 ml-1">+{trend24h} за 24ч</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      {/* Быстрые метрики - hide on mobile if expanded */}
                      <div className="text-right hidden md:block">
                        <div className="text-xs text-[#9CA3AF] whitespace-nowrap">
                          📧 {stats.emailClicks}/{stats.emailsSent} · 
                          💬 {stats.smsClicks}/{stats.smsSent}
                        </div>
                      </div>
                      
                      {isExpanded ? <ChevronUp size={20} className="text-[#9CA3AF]" /> : <ChevronDown size={20} className="text-[#9CA3AF]" />}
                    </div>
                  </button>
                  
                  {/* Развернутый контент - Mobile Optimized */}
                  {isExpanded && (
                    <div className="px-3 md:px-4 pb-3 md:pb-4 space-y-3 md:space-y-4 border-t border-white/5">
                      {/* Основные метрики - 2x2 на мобилке, 4 в ряд на десктопе */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-3 md:pt-4">
                        <div className="text-center p-2 md:p-0">
                          <div className="text-[10px] md:text-xs text-[#9CA3AF] mb-0.5 md:mb-1">📧 Email</div>
                          <div className="text-white font-bold text-lg md:text-xl">{stats.emailsSent}</div>
                          <div className="text-[9px] md:text-xs text-[#9CA3AF]">отправлено</div>
                        </div>
                        <div className="text-center p-2 md:p-0">
                          <div className="text-[10px] md:text-xs text-[#9CA3AF] mb-0.5 md:mb-1">✅ Email</div>
                          <div className={`font-bold text-lg md:text-xl ${colors.text}`}>
                            {stats.emailClicks}
                          </div>
                          <div className={`text-[9px] md:text-xs ${colors.text}`}>
                            {stats.emailsSent > 0 ? Math.round((stats.emailClicks / stats.emailsSent) * 100) : 0}% CTR
                          </div>
                        </div>
                        <div className="text-center p-2 md:p-0">
                          <div className="text-[10px] md:text-xs text-[#9CA3AF] mb-0.5 md:mb-1">💬 SMS</div>
                          <div className="text-white font-bold text-lg md:text-xl">{stats.smsSent}</div>
                          <div className="text-[9px] md:text-xs text-[#9CA3AF]">отправлено</div>
                        </div>
                        <div className="text-center p-2 md:p-0">
                          <div className="text-[10px] md:text-xs text-[#9CA3AF] mb-0.5 md:mb-1">✅ SMS</div>
                          <div className={`font-bold text-lg md:text-xl ${colors.text}`}>
                            {stats.smsClicks}
                          </div>
                          <div className={`text-[9px] md:text-xs ${colors.text}`}>
                            {stats.smsSent > 0 ? Math.round((stats.smsClicks / stats.smsSent) * 100) : 0}% CTR
                          </div>
                        </div>
                      </div>
                      
                      {/* График динамики - Responsive height */}
                      <div>
                        <h4 className="text-[10px] md:text-xs text-[#9CA3AF] mb-2 md:mb-3 uppercase tracking-wide">📈 Динамика за неделю</h4>
                        <ResponsiveContainer width="100%" height={120}>
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id={`gradient-${source}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={display.color === 'orange' ? '#fb923c' : display.color === 'blue' ? '#60a5fa' : '#a78bfa'} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={display.color === 'orange' ? '#fb923c' : display.color === 'blue' ? '#60a5fa' : '#a78bfa'} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: 9 }} tick={{ fontSize: 9 }} />
                            <YAxis stroke="#9CA3AF" style={{ fontSize: 9 }} tick={{ fontSize: 9 }} width={25} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(0,0,0,0.95)', 
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: 11,
                                padding: '6px 8px'
                              }}
                            />
                            <Area type="monotone" dataKey="leads" stroke={display.color === 'orange' ? '#fb923c' : display.color === 'blue' ? '#60a5fa' : '#a78bfa'} fill={`url(#gradient-${source})`} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* 💰 ROI Placeholders - Более компактные на мобилке */}
                      <div className="grid grid-cols-3 gap-2 md:gap-4 pt-3 md:pt-4 border-t border-white/5">
                        <div className="text-center p-2 md:p-3 bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="text-[9px] md:text-xs text-[#9CA3AF] mb-0.5 md:mb-1 flex items-center justify-center gap-0.5 md:gap-1">
                            <DollarSign size={10} className="md:w-3 md:h-3" />
                            <span className="hidden sm:inline">Расходы</span>
                            <span className="sm:hidden">₸</span>
                          </div>
                          <div className="text-white font-bold text-base md:text-lg">---</div>
                          <div className="text-[8px] md:text-xs text-[#9CA3AF] hidden md:block">Coming soon</div>
                        </div>
                        <div className="text-center p-2 md:p-3 bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="text-[9px] md:text-xs text-[#9CA3AF] mb-0.5 md:mb-1 flex items-center justify-center gap-0.5 md:gap-1">
                            <Target size={10} className="md:w-3 md:h-3" />
                            CPL
                          </div>
                          <div className="text-white font-bold text-base md:text-lg">---</div>
                          <div className="text-[8px] md:text-xs text-[#9CA3AF] hidden md:block">Coming soon</div>
                        </div>
                        <div className="text-center p-2 md:p-3 bg-white/[0.02] rounded-lg border border-white/5">
                          <div className="text-[9px] md:text-xs text-[#9CA3AF] mb-0.5 md:mb-1 flex items-center justify-center gap-0.5 md:gap-1">
                            <TrendingUp size={10} className="md:w-3 md:h-3" />
                            ROI
                          </div>
                          <div className="text-white font-bold text-base md:text-lg">---</div>
                          <div className="text-[8px] md:text-xs text-[#9CA3AF] hidden md:block">Coming soon</div>
                        </div>
                      </div>
                      
                      {/* Кнопка фильтрации - Bigger tap target */}
                      <button
                        onClick={() => setSourceFilter(source)}
                        className={`w-full py-3 md:py-2 rounded-lg border ${colors.border} ${colors.text} hover:${colors.bg} active:scale-98 transition-all text-sm md:text-base font-medium touch-manipulation`}
                      >
                        Показать только {display.name}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Если выбран конкретный источник - показываем его развернутым
          <div className="mb-6">
            <button
              onClick={() => setSourceFilter('all')}
              className="mb-3 text-xs text-[#9CA3AF] hover:text-[#00FF94] transition-colors"
            >
              ← Показать все источники
            </button>
            {/* Здесь тот же контент что в аккордеоне, но всегда развернут */}
          </div>
        )}

        {/* Table / Cards - Responsive: Cards on mobile, Table on desktop */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl md:rounded-2xl overflow-hidden backdrop-blur-sm">
          {/* DESKTOP: Table view */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-max">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Контакт
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  🎉 Journey этапы
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Статус уведомлений
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Дата создания
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {leadsLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#9CA3AF]">
                    Загрузка списка заявок...
                  </td>
                </tr>
              ) : paginatedLeads && paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    {/* Contact Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF94]/20 to-[#00FF94]/5 flex items-center justify-center border border-[#00FF94]/20">
                          <span className="text-[#00FF94] font-bold text-sm">
                            {lead.name?.charAt(0).toUpperCase() || 'L'}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{lead.name}</p>
                          <p className="text-sm text-[#9CA3AF] flex items-center gap-1">
                            <Mail size={12} />
                            {lead.email}
                          </p>
                          <p className="text-sm text-[#9CA3AF] flex items-center gap-1">
                            <Phone size={12} />
                            {lead.phone}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Journey Timeline */}
                    <td className="px-6 py-4">
                      {lead.journey_stages && lead.journey_stages.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {lead.journey_stages.map((stage, index) => {
                            const stageInfo = getStageLabel(stage.stage);
                            const colorClasses: Record<string, string> = {
                              blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                              purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                              green: 'bg-green-500/10 border-green-500/20 text-green-400',
                              orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
                              cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
                              pink: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
                              gray: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
                            };
                            
                            return (
                              <div
                                key={stage.id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${colorClasses[stageInfo.color]}`}
                                title={`${stageInfo.label} - ${new Date(stage.created_at).toLocaleString('ru-RU')}`}
                              >
                                <span className="text-sm">{index + 1}</span>
                                <span>{stageInfo.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Нет этапов</span>
                      )}
                    </td>

                    {/* Notification Status */}
                    <td className="px-6 py-4">
                      {/* ✅ СРОЧНЫЙ ФИКС: Проверяем источник И journey stages - если expresscourse, показываем LID статус */}
                      {(() => {
                        // Проверка source
                        const isExpressBySource = lead.source?.toLowerCase().includes('express') || lead.source?.startsWith('payment_');
                        
                        // Проверка journey stages (если есть payment_ этапы - это экспресс-курс!)
                        const hasPaymentJourney = lead.journey_stages?.some(stage => 
                          stage.stage?.startsWith('payment_') || 
                          stage.stage?.toLowerCase().includes('express')
                        );
                        
                        return isExpressBySource || hasPaymentJourney;
                      })() ? (
                        <div className="flex flex-col gap-2">
                          {/* LID Badge */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <span className="text-xs font-bold text-blue-400">🎯 LID</span>
                          </div>
                          
                          {/* Source Label */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20">
                            <span className="text-xs font-medium text-orange-400">
                              📌 Экспресс-курс
                            </span>
                          </div>
                          
                          {/* Email/SMS Status - NOT SENT */}
                          <div className="flex flex-col gap-1 px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/20">
                            <div className="flex items-center gap-2">
                              <Mail size={12} className="text-gray-500" />
                              <span className="text-xs text-gray-500">Email: не отправляется</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Send size={12} className="text-gray-500" />
                              <span className="text-xs text-gray-500">SMS: не отправляется</span>
                            </div>
                          </div>
                          
                          <span className="text-xs text-gray-400 italic">
                            ℹ️ Только Telegram менеджеру
                          </span>
                        </div>
                      ) : (
                        /* 🎯 PROFTEST: Показываем обычные статусы email/SMS */
                        <div className="flex flex-col gap-2">
                          {/* Queue Status Badge */}
                          {lead.notification_status === 'pending' && (
                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                              <Clock size={12} className="text-yellow-400" />
                              <span className="text-xs text-yellow-400">В очереди</span>
                            </div>
                          )}
                          
                          {/* Proftest Badge */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <span className="text-xs font-bold text-purple-400">✅ PROFTEST</span>
                          </div>
                          
                          {/* Email Status with Countdown */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Mail size={14} className={
                                lead.email_clicked ? 'text-[#00FF94]' : 
                                lead.email_sent ? 'text-green-400' : 
                                lead.notification_status === 'failed' ? 'text-red-400' :
                                calculateNotificationCountdown(lead.created_at).isScheduled ? 'text-yellow-400' :
                                'text-gray-600'
                              } />
                              <span className={`text-xs font-medium ${
                                lead.email_clicked ? 'text-[#00FF94]' : 
                                lead.email_sent ? 'text-green-400' : 
                                lead.notification_status === 'failed' ? 'text-red-400' :
                                calculateNotificationCountdown(lead.created_at).isScheduled ? 'text-yellow-400' :
                                'text-gray-600'
                              }`}>
                                Email: {
                                  lead.email_clicked ? '✓ Кликнул' : 
                                  lead.email_sent ? '✓ Отправлен' : 
                                  lead.notification_status === 'failed' ? '✗ Не удалось отправить' :
                                  calculateNotificationCountdown(lead.created_at).isScheduled ? '📤 В процессе отправки' :
                                  '○ Не отправлен'
                                }
                              </span>
                            </div>
                            {/* Countdown Timer for Email */}
                            <NotificationCountdown 
                              createdAt={lead.created_at} 
                              sent={lead.email_sent} 
                              error={lead.notification_status === 'failed'} 
                            />
                          </div>

                          {/* SMS Status with Countdown */}
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Send size={14} className={
                                lead.sms_clicked ? 'text-[#00FF94]' : 
                                lead.sms_sent ? 'text-purple-400' : 
                                lead.notification_status === 'failed' ? 'text-red-400' :
                                calculateNotificationCountdown(lead.created_at).isScheduled ? 'text-yellow-400' :
                                'text-gray-600'
                              } />
                              <span className={`text-xs font-medium ${
                                lead.sms_clicked ? 'text-[#00FF94]' : 
                                lead.sms_sent ? 'text-purple-400' : 
                                lead.notification_status === 'failed' ? 'text-red-400' :
                                calculateNotificationCountdown(lead.created_at).isScheduled ? 'text-yellow-400' :
                                'text-gray-600'
                              }`}>
                                SMS: {
                                  lead.sms_clicked ? '✓ Кликнул' : 
                                  lead.sms_sent ? '✓ Отправлен' : 
                                  lead.notification_status === 'failed' ? '✗ Не удалось отправить' :
                                  calculateNotificationCountdown(lead.created_at).isScheduled ? '📤 В процессе отправки' :
                                  '○ Не отправлен'
                                }
                              </span>
                            </div>
                            {/* Countdown Timer for SMS */}
                            <NotificationCountdown 
                              createdAt={lead.created_at} 
                              sent={lead.sms_sent} 
                              error={lead.notification_status === 'failed'} 
                            />
                          </div>

                          {/* Error Message */}
                          {lead.notification_error && (
                            <div className="flex items-start gap-2 px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 mt-1">
                              <AlertCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-red-400 break-words">
                                {lead.notification_error}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#9CA3AF] flex items-center gap-2">
                        <Calendar size={14} />
                        {formatDate(lead.created_at)}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 min-w-max overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                        {/* 📤 AmoCRM Sync Button */}
                        <button
                          onClick={() => {
                            if (confirm(`Выгрузить ${lead.name} в AmoCRM?`)) {
                              syncAmoCRMMutation.mutate(lead.id);
                            }
                          }}
                          disabled={syncAmoCRMMutation.isPending || !!lead.amocrm_lead_id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                          title={lead.amocrm_lead_id ? `Уже в AmoCRM (ID: ${lead.amocrm_lead_id})` : 'Выгрузить в AmoCRM'}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          {syncAmoCRMMutation.isPending ? 'Выгрузка...' : lead.amocrm_lead_id ? 'В AmoCRM' : 'Выгрузить'}
                        </button>

                        {/* Resend Button */}
                        {(!lead.email_sent || !lead.sms_sent) && (
                          <button
                            onClick={() => {
                              if (confirm(`Переотправить уведомления для ${lead.name}?`)) {
                                resendMutation.mutate(lead.id);
                              }
                            }}
                            disabled={resendMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] hover:bg-[#00FF94]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                            title="Переотправить только не отправленные уведомления"
                          >
                            <RefreshCw size={12} className={resendMutation.isPending ? 'animate-spin' : ''} />
                            {resendMutation.isPending ? 'Отправка...' : 'Переотправить'}
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            if (confirm(`Удалить лид ${lead.name}? Это действие нельзя отменить!`)) {
                              deleteMutation.mutate(lead.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                          title="Удалить лид полностью из базы данных"
                        >
                          <Trash2 size={12} />
                          {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#9CA3AF]">
                    {searchQuery ? 'Ничего не найдено по вашему запросу' : 'Нет заявок'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* MOBILE: Card view */}
          <div className="md:hidden divide-y divide-white/5">
            {leadsLoading ? (
              <div className="px-4 py-8 text-center text-[#9CA3AF] text-sm">
                Загрузка списка заявок...
              </div>
            ) : paginatedLeads && paginatedLeads.length > 0 ? (
              paginatedLeads.map((lead) => {
                const isExpressBySource = lead.source?.toLowerCase().includes('express') || lead.source?.startsWith('payment_');
                const hasPaymentJourney = lead.journey_stages?.some(stage => 
                  stage.stage?.startsWith('payment_') || 
                  stage.stage?.toLowerCase().includes('express')
                );
                const isExpressCourse = isExpressBySource || hasPaymentJourney;
                
                return (
                  <div key={lead.id} className="p-4 space-y-3">
                    {/* Contact Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF94]/20 to-[#00FF94]/5 flex items-center justify-center border border-[#00FF94]/20 flex-shrink-0">
                        <span className="text-[#00FF94] font-bold text-sm">
                          {lead.name?.charAt(0).toUpperCase() || 'L'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{lead.name}</p>
                        <p className="text-xs text-[#9CA3AF] flex items-center gap-1 truncate">
                          <Mail size={10} />
                          {lead.email}
                        </p>
                        <p className="text-xs text-[#9CA3AF] flex items-center gap-1">
                          <Phone size={10} />
                          {lead.phone}
                        </p>
                      </div>
                    </div>
                    
                    {/* Journey Stages */}
                    {lead.journey_stages && lead.journey_stages.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">🎉 Этапы</div>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.journey_stages.map((stage, index) => {
                            const stageInfo = getStageLabel(stage.stage);
                            const colorClasses: Record<string, string> = {
                              blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                              purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
                              green: 'bg-green-500/10 border-green-500/20 text-green-400',
                              orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
                              cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
                              pink: 'bg-pink-500/10 border-pink-500/20 text-pink-400',
                              gray: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
                            };
                            
                            return (
                              <div
                                key={stage.id}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium ${colorClasses[stageInfo.color]}`}
                              >
                                <span className="text-xs">{index + 1}</span>
                                <span className="truncate">{stageInfo.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Status Badges */}
                    <div className="space-y-2">
                      <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Статус</div>
                      
                      {isExpressCourse ? (
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                            <span className="text-xs font-bold text-blue-400">🎯 LID</span>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 ml-1.5">
                            <span className="text-xs text-orange-400">📌 Экспресс-курс</span>
                          </div>
                          <div className="text-xs text-gray-400 italic mt-1">
                            ℹ️ Только Telegram менеджеру
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
                            <span className="text-xs font-bold text-purple-400">✅ PROFTEST</span>
                          </div>
                          
                          {/* Email Status */}
                          <div className="flex items-center gap-2 text-xs">
                            <Mail size={12} className={
                              lead.email_clicked ? 'text-[#00FF94]' : 
                              lead.email_sent ? 'text-green-400' : 
                              'text-gray-600'
                            } />
                            <span className={
                              lead.email_clicked ? 'text-[#00FF94]' : 
                              lead.email_sent ? 'text-green-400' : 
                              'text-gray-600'
                            }>
                              Email: {lead.email_clicked ? '✓ Кликнул' : lead.email_sent ? '✓ Отправлен' : '○ Не отправлен'}
                            </span>
                          </div>
                          
                          {/* SMS Status */}
                          <div className="flex items-center gap-2 text-xs">
                            <Send size={12} className={
                              lead.sms_clicked ? 'text-[#00FF94]' : 
                              lead.sms_sent ? 'text-purple-400' : 
                              'text-gray-600'
                            } />
                            <span className={
                              lead.sms_clicked ? 'text-[#00FF94]' : 
                              lead.sms_sent ? 'text-purple-400' : 
                              'text-gray-600'
                            }>
                              SMS: {lead.sms_clicked ? '✓ Кликнул' : lead.sms_sent ? '✓ Отправлен' : '○ Не отправлен'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Date */}
                    <div className="text-xs text-[#9CA3AF] flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(lead.created_at)}
                    </div>
                    
                    {/* Actions - Full width buttons */}
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      {/* AmoCRM Sync */}
                      <button
                        onClick={() => {
                          if (confirm(`Выгрузить ${lead.name} в AmoCRM?`)) {
                            syncAmoCRMMutation.mutate(lead.id);
                          }
                        }}
                        disabled={syncAmoCRMMutation.isPending || !!lead.amocrm_lead_id}
                        className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium touch-manipulation"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        {syncAmoCRMMutation.isPending ? 'Выгрузка...' : lead.amocrm_lead_id ? 'Уже в AmoCRM' : 'Выгрузить в AmoCRM'}
                      </button>
                      
                      {/* Resend + Delete in row */}
                      <div className="grid grid-cols-2 gap-2">
                        {(!lead.email_sent || !lead.sms_sent) && (
                          <button
                            onClick={() => {
                              if (confirm(`Переотправить уведомления для ${lead.name}?`)) {
                                resendMutation.mutate(lead.id);
                              }
                            }}
                            disabled={resendMutation.isPending}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20 text-[#00FF94] active:scale-98 transition-all disabled:opacity-50 text-xs font-medium touch-manipulation"
                          >
                            <RefreshCw size={12} className={resendMutation.isPending ? 'animate-spin' : ''} />
                            {resendMutation.isPending ? 'Отправка...' : 'Переотправить'}
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            if (confirm(`Удалить лид ${lead.name}?`)) {
                              deleteMutation.mutate(lead.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 active:scale-98 transition-all disabled:opacity-50 text-xs font-medium touch-manipulation ${(!lead.email_sent || !lead.sms_sent) ? '' : 'col-span-2'}`}
                        >
                          <Trash2 size={12} />
                          {deleteMutation.isPending ? 'Удаление...' : 'Удалить'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-[#9CA3AF] text-sm">
                {searchQuery ? 'Ничего не найдено' : 'Нет заявок'}
              </div>
            )}
          </div>

          {/* Pagination Controls - Mobile Optimized */}
          {filteredLeads && filteredLeads.length > ITEMS_PER_PAGE && (
            <div className="px-3 md:px-6 py-3 md:py-4 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="text-xs md:text-sm text-[#9CA3AF] text-center md:text-left">
                Показано {startIndex + 1}-{Math.min(endIndex, filteredLeads.length)} из {filteredLeads.length}
              </div>
              
              <div className="flex items-center gap-1.5 md:gap-2">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 md:px-4 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm touch-manipulation"
                >
                  <span className="hidden sm:inline">← Назад</span>
                  <span className="sm:hidden">←</span>
                </button>

                {/* Page Numbers - Compact on mobile */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                    // On mobile: show only current and adjacent pages
                    const showPage = 
                      pageNum === 1 || 
                      pageNum === totalPages || 
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);
                    
                    const showEllipsis = 
                      (pageNum === 2 && currentPage > 3) ||
                      (pageNum === totalPages - 1 && currentPage < totalPages - 2);

                    if (showEllipsis) {
                      return (
                        <span key={pageNum} className="px-1 md:px-2 text-[#9CA3AF] text-xs">
                          ...
                        </span>
                      );
                    }

                    if (!showPage) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-lg text-xs md:text-sm font-medium transition-all touch-manipulation ${
                          currentPage === pageNum
                            ? 'bg-[#00FF94]/20 border border-[#00FF94]/30 text-[#00FF94]'
                            : 'bg-white/[0.02] border border-white/5 text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white active:scale-95'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 md:px-4 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-[#9CA3AF] hover:bg-white/[0.05] hover:text-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm touch-manipulation"
                >
                  <span className="hidden sm:inline">Вперёд →</span>
                  <span className="sm:hidden">→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

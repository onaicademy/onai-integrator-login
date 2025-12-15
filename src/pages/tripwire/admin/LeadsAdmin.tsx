import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Search, TrendingUp, Users, Send, RefreshCw, Trash2, AlertCircle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { landingSupabase } from '@/lib/supabase-landing'; // ✅ Use singleton instance

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

export default function LeadsAdmin() {
  const [searchQuery, setSearchQuery] = useState('');
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
        .limit(100);
      
      if (leadsError) {
        console.error('❌ Error fetching leads with journey:', leadsError);
        // Fallback to old query if view doesn't exist yet
        const { data: fallbackData, error: fallbackError } = await landingSupabase
          .from('landing_leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
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
      
      // Get notification statuses for all leads
      const { data: notificationsData } = await landingSupabase
        .from('scheduled_notifications')
        .select('lead_id, status, error_message')
        .in('lead_id', leadsData?.map(l => l.id) || []);
      
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

  // Resend mutation
  const resendMutation = useMutation({
    mutationFn: async (leadId: string) => {
      // ✅ FIX: Use API_URL from env to ensure correct backend URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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

  const filteredLeads = leads?.filter(lead => 
    lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.phone?.includes(searchQuery) ||
    lead.source?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* ✅ HEADER */}
      <div className="relative z-10 px-8 py-8 border-b border-white/5">
        <Link 
          to="/integrator/admin" 
          className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-[#00FF94] transition-colors"
        >
          <ArrowLeft size={20} />
          Назад в админку
        </Link>
      </div>

      {/* ✅ CONTENT */}
      <div className="relative z-10 px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-[#00FF94]" size={24} />
              <h3 className="text-[#9CA3AF] text-xs uppercase tracking-wide">Лидов</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.total || 0}</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="text-blue-400" size={24} />
              <h3 className="text-[#9CA3AF] text-xs uppercase tracking-wide">Email</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.emailsSent || 0}</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Отправлено</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="text-green-400" size={24} />
              <h3 className="text-[#9CA3AF] text-xs uppercase tracking-wide">Email CTR</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.emailClicks || 0}</p>
            <p className="text-xs text-green-400 mt-1">
              {stats?.emailClickRate ? Math.round(stats.emailClickRate) : 0}% кликнули
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <Send className="text-purple-400" size={24} />
              <h3 className="text-[#9CA3AF] text-xs uppercase tracking-wide">SMS</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.smsSent || 0}</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Отправлено</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <Send className="text-green-400" size={24} />
              <h3 className="text-[#9CA3AF] text-xs uppercase tracking-wide">SMS CTR</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.smsClicks || 0}</p>
            <p className="text-xs text-green-400 mt-1">
              {stats?.smsClickRate ? Math.round(stats.smsClickRate) : 0}% кликнули
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-[#00FF94]" size={24} />
              <h3 className="text-[#9CA3AF] text-xs uppercase tracking-wide">Источники</h3>
            </div>
            <p className="text-3xl font-bold text-white">{Object.keys(stats?.bySource || {}).length}</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Уникальных</p>
          </div>
        </div>

        {/* Header + Search */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Landing заявки</h1>
            <p className="text-[#9CA3AF]">
              {leadsLoading ? 'Загрузка...' : `Всего зарегистрировано: ${leads?.length || 0}`}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={20} />
            <input
              type="text"
              placeholder="Поиск по email, имени, телефону или источнику..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[400px] pl-12 pr-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#00FF94]/30 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
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
              ) : filteredLeads && filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
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
                      {/* ✅ СРОЧНЫЙ ФИКС: Проверяем источник - если expresscourse, показываем LID статус */}
                      {(lead.source?.toLowerCase().includes('express') || lead.source?.startsWith('payment_')) ? (
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
        </div>
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Search, TrendingUp, Users, Send } from 'lucide-react';
import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

// ✅ LAZY INITIALIZATION: Create client only when component mounts and env vars exist
function useLandingSupabase() {
  return useMemo(() => {
    const url = import.meta.env.VITE_LANDING_SUPABASE_URL;
    const key = import.meta.env.VITE_LANDING_SUPABASE_ANON_KEY;
    
    // Only create client if env vars exist
    if (!url || !key) {
      console.warn('⚠️ Landing Supabase env vars not found');
      return null;
    }
    
    return createClient(url, key);
  }, []);
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
  const landingSupabase = useLandingSupabase();

  // Fetch leads
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ['landing', 'leads'],
    queryFn: async () => {
      if (!landingSupabase) {
        throw new Error('Landing Supabase client not initialized');
      }
      
      const { data, error } = await landingSupabase
        .from('landing_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!landingSupabase,
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Контакт
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Источник
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Статус уведомлений
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
                  Дата создания
                </th>
              </tr>
            </thead>
            <tbody>
              {leadsLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#9CA3AF]">
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

                    {/* Source */}
                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {lead.source}
                      </span>
                    </td>

                    {/* Notification Status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className={
                            lead.email_clicked ? 'text-[#00FF94]' : 
                            lead.email_sent ? 'text-green-400' : 
                            'text-gray-600'
                          } />
                          <span className={`text-xs ${
                            lead.email_clicked ? 'text-[#00FF94]' : 
                            lead.email_sent ? 'text-green-400' : 
                            'text-gray-600'
                          }`}>
                            Email: {
                              lead.email_clicked ? '✓ Кликнул' : 
                              lead.email_sent ? 'Отправлен' : 
                              'Не отправлен'
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Send size={14} className={
                            lead.sms_clicked ? 'text-[#00FF94]' : 
                            lead.sms_sent ? 'text-purple-400' : 
                            'text-gray-600'
                          } />
                          <span className={`text-xs ${
                            lead.sms_clicked ? 'text-[#00FF94]' : 
                            lead.sms_sent ? 'text-purple-400' : 
                            'text-gray-600'
                          }`}>
                            SMS: {
                              lead.sms_clicked ? '✓ Кликнул' : 
                              lead.sms_sent ? 'Отправлен' : 
                              'Не отправлен'
                            }
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-[#9CA3AF] flex items-center gap-2">
                        <Calendar size={14} />
                        {formatDate(lead.created_at)}
                      </p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#9CA3AF]">
                    {searchQuery ? 'Ничего не найдено по вашему запросу' : 'Нет заявок'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

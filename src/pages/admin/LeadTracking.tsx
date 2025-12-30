import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Mail, MessageSquare, RefreshCw, AlertCircle, Trash2, BarChart3 } from 'lucide-react';
import axios from 'axios';
import LeadSyncModal from './components/LeadSyncModal';
import { getApiBaseUrl } from '@/lib/runtime-config';

interface LeadData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  amocrm_deal_id: string | null;
  amocrm_contact_id: string | null;
  amocrm_status: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  email_opened: boolean;
  email_opened_at: string | null;
  email_clicked: boolean;
  email_clicked_at: string | null;
  email_error: string | null;
  sms_sent: boolean;
  sms_sent_at: string | null;
  sms_delivered: boolean;
  sms_delivered_at: string | null;
  sms_error: string | null;
  // UTM и отслеживание переходов
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_visited: boolean;
  landing_visited_at: string | null;
  landing_visits_count: number;
  email_link_clicked: boolean;
  email_link_clicked_at: string | null;
  sms_link_clicked: boolean;
  sms_link_clicked_at: string | null;
  traffic_source: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface StatsData {
  total_leads: number;
  email_sent: number;
  email_opened: number;
  sms_sent: number;
  sms_delivered: number;
  in_amocrm: number;
  landing_visited: number;
  email_link_clicked: number;
  sms_link_clicked: number;
  from_email: number;
  from_sms: number;
}

export default function LeadTracking() {
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const API_URL = getApiBaseUrl() || 'https://api.onai.academy';

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_URL}/api/lead-tracking/leads`);
      
      if (response.data.success) {
        setLeads(response.data.leads);
        setStats(response.data.stats);
      } else {
        throw new Error(response.data.error || 'Failed to fetch leads');
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const syncWithAmoCRM = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      console.log('🚀 Starting batch sync to AmoCRM...');
      
      // ✅ Используем новый endpoint для поэтапной синхронизации
      const response = await axios.post(`${API_URL}/api/landing/sync-all-to-amocrm`);
      
      if (response.data.success) {
        const { synced, skipped, failed, total } = response.data;
        console.log(`✅ Sync completed: ${synced} synced, ${skipped} skipped, ${failed} failed out of ${total} total`);
        
        // Показываем результаты пользователю
        alert(`✅ Синхронизация завершена!\n\n` +
              `Всего лидов: ${total}\n` +
              `✅ Синхронизировано: ${synced}\n` +
              `⏭️  Пропущено (уже есть): ${skipped}\n` +
              `❌ Ошибки: ${failed}`);
        
        // Обновляем данные после синхронизации
        await fetchLeads();
      } else {
        throw new Error(response.data.error || 'Failed to sync with AmoCRM');
      }
    } catch (err: any) {
      console.error('Error syncing with AmoCRM:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to sync with AmoCRM';
      setError(errorMessage);
      alert(`❌ Ошибка синхронизации:\n\n${errorMessage}`);
    } finally {
      setSyncing(false);
    }
  };

  const deleteLead = async (leadId: string, leadName: string) => {
    if (!confirm(`Вы уверены что хотите удалить лид "${leadName}"?\n\nЭто действие НЕОБРАТИМО!`)) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/api/lead-tracking/${leadId}`);
      
      if (response.data.success) {
        alert(`✅ Лид "${leadName}" успешно удален!`);
        await fetchLeads(); // Refresh leads after deletion
      } else {
        throw new Error(response.data.error || 'Failed to delete lead');
      }
    } catch (err: any) {
      console.error('Error deleting lead:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete lead';
      alert(`❌ Ошибка удаления:\n\n${errorMessage}`);
    }
  };

  useEffect(() => {
    fetchLeads();
    
    // Автообновление каждые 30 секунд
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (sent: boolean, delivered?: boolean, error?: string | null) => {
    if (error) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (delivered) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    if (sent) {
      return <Clock className="w-5 h-5 text-yellow-500" />;
    }
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  if (loading && leads.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-[#00FF94] animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">📊 Отслеживание Лидов</h1>
            <p className="text-gray-400">Мониторинг статусов Email и SMS отправки</p>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </button>
            
            <button
              onClick={syncWithAmoCRM}
              disabled={syncing}
              className="flex items-center gap-2 px-6 py-3 bg-[#00FF94] text-black rounded-lg hover:bg-[#00DD82] transition-colors disabled:opacity-50 font-bold"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              Синхронизировать с AmoCRM
            </button>

            <button
              onClick={() => setShowSyncModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600/20 hover:bg-purple-600/30 
                       text-purple-400 border border-purple-500/30 font-bold rounded-lg 
                       hover:scale-105 transition-transform"
            >
              <BarChart3 className="w-5 h-5" />
              Детальная Синхронизация
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <p className="text-red-500">{error}</p>
          </motion.div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-white mb-1">{stats.total_leads}</div>
              <div className="text-sm text-gray-400">Всего лидов</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-[#00FF94] mb-1">{stats.in_amocrm}</div>
              <div className="text-sm text-gray-400">В AmoCRM</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-blue-400 mb-1">{stats.email_sent}</div>
              <div className="text-sm text-gray-400">Email отправлено</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-green-400 mb-1">{stats.email_opened}</div>
              <div className="text-sm text-gray-400">Email открыто</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-yellow-400 mb-1">{stats.sms_sent}</div>
              <div className="text-sm text-gray-400">SMS отправлено</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-green-400 mb-1">{stats.sms_delivered}</div>
              <div className="text-sm text-gray-400">SMS доставлено</div>
            </motion.div>
          </div>
        )}

        {/* Дополнительные метрики - Переходы и клики */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-purple-900/30 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-purple-400 mb-1">{stats.landing_visited}</div>
              <div className="text-sm text-gray-400">Посетили лендинг</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-blue-900/30 backdrop-blur-sm border border-blue-500/30 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-blue-400 mb-1">{stats.email_link_clicked}</div>
              <div className="text-sm text-gray-400">Клики из Email</div>
              {stats.email_sent > 0 && (
                <div className="text-xs text-blue-300 mt-1">
                  {((stats.email_link_clicked / stats.email_sent) * 100).toFixed(1)}% CTR
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-yellow-900/30 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-yellow-400 mb-1">{stats.sms_link_clicked}</div>
              <div className="text-sm text-gray-400">Клики из SMS</div>
              {stats.sms_sent > 0 && (
                <div className="text-xs text-yellow-300 mt-1">
                  {((stats.sms_link_clicked / stats.sms_sent) * 100).toFixed(1)}% CTR
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="bg-cyan-900/30 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-cyan-400 mb-1">{stats.from_email}</div>
              <div className="text-sm text-gray-400">Пришли с Email</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-green-900/30 backdrop-blur-sm border border-green-500/30 rounded-lg p-6"
            >
              <div className="text-3xl font-bold text-green-400 mb-1">{stats.from_sms}</div>
              <div className="text-sm text-gray-400">Пришли с SMS</div>
            </motion.div>
          </div>
        )}

        {/* Leads Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Имя</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Email / Телефон</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                    <Mail className="w-5 h-5 mx-auto" title="Email статус" />
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                    <MessageSquare className="w-5 h-5 mx-auto" title="SMS статус" />
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">🔗 Переход</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Источник</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">AmoCRM</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">Дата</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leads.map((lead, index) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-900/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{lead.full_name}</div>
                      {lead.utm_campaign && (
                        <div className="text-xs text-gray-500 mt-1">📢 {lead.utm_campaign}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 text-sm">{lead.email || '—'}</div>
                      <div className="text-gray-300 text-sm mt-1">{lead.phone || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusIcon(lead.email_sent, lead.email_opened, lead.email_error)}
                        {lead.email_opened && (
                          <span className="text-xs text-green-400">Открыт</span>
                        )}
                        {lead.email_error && (
                          <span className="text-xs text-red-400" title={lead.email_error}>Ошибка</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusIcon(lead.sms_sent, lead.sms_delivered, lead.sms_error)}
                        {lead.sms_delivered && (
                          <span className="text-xs text-green-400">Доставлено</span>
                        )}
                        {lead.sms_error && (
                          <span className="text-xs text-red-400" title={lead.sms_error}>Ошибка</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-1">
                        {lead.landing_visited ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-xs text-green-400">
                              {lead.landing_visits_count > 1 ? `${lead.landing_visits_count}x` : 'Да'}
                            </span>
                            {lead.landing_visited_at && (
                              <span className="text-xs text-gray-500">
                                {formatDate(lead.landing_visited_at)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-gray-500" />
                            <span className="text-xs text-gray-500">Нет</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {lead.traffic_source ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-sm font-medium ${
                            lead.traffic_source === 'email' ? 'text-blue-400' :
                            lead.traffic_source === 'sms' ? 'text-yellow-400' :
                            'text-gray-400'
                          }`}>
                            {lead.traffic_source === 'email' && '📧 Email'}
                            {lead.traffic_source === 'sms' && '📱 SMS'}
                            {lead.traffic_source === 'direct' && '🔗 Прямой'}
                            {!['email', 'sms', 'direct'].includes(lead.traffic_source) && lead.traffic_source}
                          </span>
                          {lead.utm_source && (
                            <span className="text-xs text-gray-500">{lead.utm_source}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {lead.amocrm_deal_id ? (
                        <div>
                          <div className="text-sm text-green-400 font-medium">#{lead.amocrm_deal_id}</div>
                          {lead.amocrm_status && (
                            <div className="text-xs text-gray-500 mt-1">{lead.amocrm_status}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400">
                        {formatDate(lead.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => deleteLead(lead.id, lead.full_name)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 transition-all group"
                        title="Удалить лид"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 group-hover:text-red-300" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {leads.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Нет данных о лидах</p>
              <p className="text-gray-600 text-sm mt-2">Нажмите "Синхронизировать с AmoCRM" для загрузки данных</p>
            </div>
          )}
        </motion.div>

        {/* Auto-refresh indicator */}
        <div className="mt-4 text-center text-sm text-gray-500">
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Автообновление каждые 30 секунд
        </div>
      </div>

      {/* Lead Sync Modal */}
      {showSyncModal && (
        <LeadSyncModal onClose={() => setShowSyncModal(false)} />
      )}
    </div>
  );
}


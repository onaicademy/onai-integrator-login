import { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle, XCircle, Mail, MessageSquare, AlertCircle, Clock } from 'lucide-react';
import { api } from '@/utils/apiClient';
import { useBulkSyncProgress } from '@/hooks/useBulkSyncProgress';
import { toast } from 'react-hot-toast';

interface LeadSyncResult {
  total_landing_leads: number;
  total_amocrm_leads: number;
  synced: SyncedLead[];
  not_synced: SyncedLead[];
  email_sent: number;
  email_failed: number;
  sms_sent: number;
  sms_failed: number;
}

interface SyncedLead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  source: string;
  created_at: string;
  in_amocrm: boolean;
  amocrm_lead_id?: string;
  amocrm_synced: boolean;
  email_sent: boolean;
  email_sent_at?: string;
  email_error?: string;
  sms_sent: boolean;
  sms_sent_at?: string;
  sms_error?: string;
  email_opened: boolean;
  email_clicked: boolean;
  sms_clicked: boolean;
}

interface Props {
  onClose: () => void;
}

export default function LeadSyncModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [result, setResult] = useState<LeadSyncResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<'synced' | 'not_synced'>('synced');
  
  // Use SSE hook for real-time progress
  const { progress, error: progressError, isConnected } = useBulkSyncProgress(syncId);

  // Handle new bulk sync
  const handleSync = async () => {
    setLoading(true);
    setResult(null);
    setSyncId(null);
    
    try {
      console.log('🚀 Starting bulk sync...');
      
      // Start bulk sync (new API)
      const response = await api.post('/api/bulk-sync/sync-all', {
        source: null, // Sync all sources
      });
      
      if (response.data.success && response.data.syncId) {
        setSyncId(response.data.syncId);
        toast.success(`✅ Синхронизация запущена! (${response.data.totalLeads} лидов)`);
      } else {
        toast.info('ℹ️ Нет лидов для синхронизации');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Ошибка запуска синхронизации');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch detailed results when sync completes
  useEffect(() => {
    if (progress?.status === 'completed' && syncId) {
      fetchResults(syncId);
    }
  }, [progress?.status, syncId]);
  
  const fetchResults = async (id: string) => {
    try {
      const response = await api.get(`/api/bulk-sync/results/${id}`);
      
      if (response.data.success) {
        const summary = response.data.summary;
        
        // Transform to old format for compatibility
        setResult({
          total_landing_leads: summary.totalLeads,
          total_amocrm_leads: summary.totalLeads,
          synced: summary.results.filter((r: any) => r.status === 'success').map((r: any) => ({
            id: r.lead_id,
            name: '',
            phone: '',
            source: '',
            created_at: r.created_at,
            in_amocrm: true,
            amocrm_lead_id: r.deal_id?.toString(),
            amocrm_synced: true,
            email_sent: false,
            sms_sent: false,
            email_opened: false,
            email_clicked: false,
            sms_clicked: false,
          })),
          not_synced: summary.results.filter((r: any) => r.status === 'failed').map((r: any) => ({
            id: r.lead_id,
            name: '',
            phone: '',
            source: '',
            created_at: r.created_at,
            in_amocrm: false,
            amocrm_synced: false,
            email_sent: false,
            sms_sent: false,
            email_opened: false,
            email_clicked: false,
            sms_clicked: false,
          })),
          email_sent: 0,
          email_failed: 0,
          sms_sent: 0,
          sms_failed: 0,
        });
      }
    } catch (error: any) {
      console.error('Error fetching results:', error);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      proftest: '📝 ПРОФТЕСТ',
      expresscourse: '🎓 ЭКСПРЕСС КУРС',
      proftest_kenesary: '📝 ПРОФТЕСТ (Kenesary)',
      proftest_arystan: '📝 ПРОФТЕСТ (Arystan)',
      twland: '🔥 TRIPWIRE LANDING',
    };
    return labels[source] || source.toUpperCase();
  };

  const displayedLeads = selectedTab === 'synced' ? result?.synced : result?.not_synced;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 text-[#00FF94]" />
            <h2 className="text-2xl font-bold text-white font-['JetBrains_Mono']">
              Синхронизация с AmoCRM
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!syncId && !result ? (
            // Initial State
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <RefreshCw className="w-16 h-16 text-[#00FF94]/50" />
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-white font-['JetBrains_Mono']">
                  Запустить синхронизацию
                </h3>
                <p className="text-white/60 max-w-md">
                  Bulk синхронизация с AmoCRM через очередь с автоматическими повторными попытками
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-[#00FF94] to-[#00D9FF] 
                         text-black font-bold rounded-xl hover:scale-105 transition-transform
                         disabled:opacity-50 disabled:cursor-not-allowed font-['JetBrains_Mono']"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Запуск...
                  </span>
                ) : (
                  'ЗАПУСТИТЬ СИНХРОНИЗАЦИЮ'
                )}
              </button>
            </div>
          ) : syncId && progress && !result ? (
            // Real-time Progress
            <div className="space-y-6">
              {/* Progress Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-6 h-6 text-[#00FF94] ${progress.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  <div>
                    <h3 className="text-xl font-bold text-white font-['JetBrains_Mono']">
                      {progress.status === 'completed' ? '✅ Завершено' : 
                       progress.status === 'failed' ? '❌ Ошибка' : 
                       '🔄 Синхронизация...'}
                    </h3>
                    <p className="text-white/60 text-sm">ID: {syncId.slice(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-sm">
                  {isConnected ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>Live</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span>Polling</span>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/80 font-['JetBrains_Mono']">
                  <span>{progress.processed} / {progress.totalLeads} лидов</span>
                  <span>{progress.progress}%</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#00FF94] to-[#00D9FF] transition-all duration-500 ease-out"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                {progress.estimatedTimeRemaining && progress.estimatedTimeRemaining > 0 && (
                  <div className="flex items-center gap-2 text-white/60 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Осталось ~{Math.ceil(progress.estimatedTimeRemaining / 60)} мин</span>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-3">
                  <div className="text-white/60 text-xs mb-1">✅ Успешно</div>
                  <div className="text-2xl font-bold text-green-400">{progress.successful}</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-3">
                  <div className="text-white/60 text-xs mb-1">⚙️ Процесс</div>
                  <div className="text-2xl font-bold text-blue-400">{progress.in_progress}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-3">
                  <div className="text-white/60 text-xs mb-1">⏳ Очередь</div>
                  <div className="text-2xl font-bold text-purple-400">{progress.queued}</div>
                </div>

                <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl p-3">
                  <div className="text-white/60 text-xs mb-1">❌ Ошибки</div>
                  <div className="text-2xl font-bold text-red-400">{progress.failed}</div>
                </div>
              </div>

              {/* Error Message */}
              {progressError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Ошибка подключения</span>
                  </div>
                  <p className="text-white/60 text-sm mt-1">{progressError}</p>
                </div>
              )}

              {/* Completion Message */}
              {progress.status === 'completed' && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-bold">Синхронизация завершена!</p>
                  <p className="text-white/60 text-sm mt-1">
                    {progress.successful} из {progress.totalLeads} лидов успешно синхронизированы
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Results
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="text-white/60 text-sm mb-1">Всего лидов</div>
                  <div className="text-3xl font-bold text-white">{result.total_landing_leads}</div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-4">
                  <div className="text-white/60 text-sm mb-1">В AmoCRM</div>
                  <div className="text-3xl font-bold text-white">{result.synced.length}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="text-white/60 text-sm mb-1">Email отправлено</div>
                  <div className="text-3xl font-bold text-white">{result.email_sent}</div>
                  {result.email_failed > 0 && (
                    <div className="text-red-400 text-xs mt-1">
                      Ошибок: {result.email_failed}
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-4">
                  <div className="text-white/60 text-sm mb-1">SMS отправлено</div>
                  <div className="text-3xl font-bold text-white">{result.sms_sent}</div>
                  {result.sms_failed > 0 && (
                    <div className="text-red-400 text-xs mt-1">
                      Ошибок: {result.sms_failed}
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-white/10">
                <button
                  onClick={() => setSelectedTab('synced')}
                  className={`px-6 py-3 font-['JetBrains_Mono'] transition-colors ${
                    selectedTab === 'synced'
                      ? 'text-[#00FF94] border-b-2 border-[#00FF94]'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  ✅ СИНХРОНИЗИРОВАНЫ ({result.synced.length})
                </button>
                <button
                  onClick={() => setSelectedTab('not_synced')}
                  className={`px-6 py-3 font-['JetBrains_Mono'] transition-colors ${
                    selectedTab === 'not_synced'
                      ? 'text-[#00FF94] border-b-2 border-[#00FF94]'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  ⚠️ НЕ СИНХРОНИЗИРОВАНЫ ({result.not_synced.length})
                </button>
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-white/60 font-['JetBrains_Mono'] text-sm">Имя</th>
                      <th className="text-left p-3 text-white/60 font-['JetBrains_Mono'] text-sm">Контакт</th>
                      <th className="text-left p-3 text-white/60 font-['JetBrains_Mono'] text-sm">Источник</th>
                      <th className="text-left p-3 text-white/60 font-['JetBrains_Mono'] text-sm">Дата</th>
                      <th className="text-center p-3 text-white/60 font-['JetBrains_Mono'] text-sm">Email</th>
                      <th className="text-center p-3 text-white/60 font-['JetBrains_Mono'] text-sm">SMS</th>
                      {selectedTab === 'synced' && (
                        <th className="text-left p-3 text-white/60 font-['JetBrains_Mono'] text-sm">AmoCRM ID</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLeads?.map((lead) => (
                      <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 text-white font-medium">{lead.name}</td>
                        <td className="p-3 text-white/80 text-sm">
                          {lead.email && <div>{lead.email}</div>}
                          <div className="text-white/60">{lead.phone}</div>
                        </td>
                        <td className="p-3">
                          <span className="text-xs px-2 py-1 bg-white/10 rounded-lg">
                            {getSourceLabel(lead.source)}
                          </span>
                        </td>
                        <td className="p-3 text-white/60 text-sm">
                          {formatDate(lead.created_at)}
                        </td>
                        
                        {/* Email Status */}
                        <td className="p-3">
                          <div className="flex flex-col items-center gap-1">
                            {lead.email_sent ? (
                              <>
                                <div className="flex items-center gap-1 text-green-400">
                                  <CheckCircle className="w-4 h-4" />
                                  <Mail className="w-4 h-4" />
                                </div>
                                {lead.email_opened && (
                                  <span className="text-xs text-blue-400">👀 Открыт</span>
                                )}
                                {lead.email_clicked && (
                                  <span className="text-xs text-purple-400">🔗 Клик</span>
                                )}
                              </>
                            ) : lead.email_error ? (
                              <div className="flex items-center gap-1 text-red-400" title={lead.email_error}>
                                <XCircle className="w-4 h-4" />
                                <Mail className="w-4 h-4" />
                              </div>
                            ) : (
                              <span className="text-white/40">—</span>
                            )}
                          </div>
                        </td>

                        {/* SMS Status */}
                        <td className="p-3">
                          <div className="flex flex-col items-center gap-1">
                            {lead.sms_sent ? (
                              <>
                                <div className="flex items-center gap-1 text-green-400">
                                  <CheckCircle className="w-4 h-4" />
                                  <MessageSquare className="w-4 h-4" />
                                </div>
                                {lead.sms_clicked && (
                                  <span className="text-xs text-purple-400">🔗 Клик</span>
                                )}
                              </>
                            ) : lead.sms_error ? (
                              <div className="flex items-center gap-1 text-red-400" title={lead.sms_error}>
                                <XCircle className="w-4 h-4" />
                                <MessageSquare className="w-4 h-4" />
                              </div>
                            ) : (
                              <span className="text-white/40">—</span>
                            )}
                          </div>
                        </td>

                        {selectedTab === 'synced' && (
                          <td className="p-3 text-white/60 text-sm font-['JetBrains_Mono']">
                            {lead.amocrm_lead_id || '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {displayedLeads?.length === 0 && (
                  <div className="text-center py-12 text-white/40">
                    {selectedTab === 'synced' 
                      ? 'Нет синхронизированных лидов'
                      : 'Все лиды синхронизированы с AmoCRM!'}
                  </div>
                )}
              </div>

              {/* Re-sync Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleSync}
                  disabled={loading}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white 
                           font-['JetBrains_Mono'] rounded-xl transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Синхронизация...' : 'ПОВТОРИТЬ СИНХРОНИЗАЦИЮ'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}




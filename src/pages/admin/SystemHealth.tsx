import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { trackError } from '@/lib/error-tracker';

interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface HealthLog {
  id: number;
  event_type: 'INFO' | 'WARNING' | 'ERROR' | 'SWITCH';
  message: string;
  metadata?: any;
  created_at: string;
}

export default function SystemHealth() {
  const [mode, setMode] = useState<'async_queue' | 'sync_direct'>('async_queue');
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    try {
      const [modeData, metricsData, logsData] = await Promise.all([
        api.get('/api/tripwire/system/mode'),
        api.get('/api/tripwire/system/metrics'),
        api.get('/api/tripwire/system/logs?limit=50'),
      ]);

      setMode(modeData.mode);
      setMetrics(metricsData);
      setLogs(logsData.logs || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load system health:', error);
      trackError(error, { component: 'SystemHealth', action: 'loadHealth' });
      setLoading(false);
    }
  }

  async function toggleMode() {
    const newMode = mode === 'async_queue' ? 'sync_direct' : 'async_queue';

    const confirmation = confirm(
      `🔄 Вы уверены что хотите переключить систему в ${
        newMode === 'async_queue' ? 'ASYNC режим (очередь)' : 'SYNC режим (прямой)'
      }?\n\n${
        newMode === 'async_queue'
          ? '✅ Создание пользователей будет асинхронным через очередь Redis (быстрее, устойчивее)'
          : '⚠️ Создание пользователей будет синхронным (медленнее, но без зависимости от Redis)'
      }`
    );

    if (confirmation) {
      setSwitching(true);
      try {
        await api.post('/api/tripwire/system/mode', { mode: newMode });
        setMode(newMode);
        await loadHealth(); // Refresh logs
      } catch (error: any) {
        alert(`❌ Ошибка переключения режима: ${error.message}`);
      } finally {
        setSwitching(false);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF88] mx-auto mb-4"></div>
          <p className="text-white/70 font-['Space_Grotesk',sans-serif]">Загрузка данных о системе...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={36} className="text-[#00FF88]" />
            <h1 className="text-4xl font-bold text-white tracking-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              System Health
            </h1>
          </div>
          <p className="text-white/60 text-lg">
            Мониторинг очереди задач и состояния системы Tripwire Sales Manager
          </p>
        </div>

        {/* Kill Switch Card */}
        <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-[#00FF88] rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
          
          <div className="relative">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <RefreshCw size={28} className="text-[#00FF88]" />
              Режим работы системы
              {switching && <span className="text-sm text-white/50 font-normal">(переключение...)</span>}
            </h2>
            <div className="flex items-center gap-4">
              <Switch
                checked={mode === 'async_queue'}
                onCheckedChange={toggleMode}
                disabled={switching}
                className="data-[state=checked]:bg-[#00FF88]"
              />
              <div className="flex-1">
                <div className={`text-lg font-semibold ${mode === 'async_queue' ? 'text-[#00FF88]' : 'text-amber-400'}`}>
                  {mode === 'async_queue' ? '✅ Async Queue Mode (Очередь)' : '⚠️ Sync Direct Mode (Прямой)'}
                </div>
                <p className="text-sm text-white/60 mt-1">
                  {mode === 'async_queue'
                    ? 'Создание пользователей через очередь Redis + BullMQ. Ответ API мгновенный (50-100ms), обработка в фоне.'
                    : 'Создание пользователей синхронное (без очереди). Ответ API медленный (2-6 секунд), но без зависимости от Redis.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Queue Metrics (only in async mode) */}
        {mode === 'async_queue' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="Ожидают" value={metrics.waiting} color="blue" icon={<Clock size={24} />} />
            <MetricCard label="Обрабатываются" value={metrics.active} color="yellow" icon={<Activity size={24} />} />
            <MetricCard label="Выполнено" value={metrics.completed} color="green" icon={<CheckCircle size={24} />} />
            <MetricCard label="Ошибки" value={metrics.failed} color="red" icon={<XCircle size={24} />} />
          </div>
        )}

        {/* Health Logs */}
        <Card className="relative group bg-[#0A0A0A] border border-white/10 backdrop-blur-xl p-6">
          {/* Glow effect */}
          <div className="absolute -inset-0.5 bg-[#00FF88] rounded-xl opacity-0 group-hover:opacity-10 blur-xl transition-all duration-500" />
          
          <div className="relative">
            <h2 className="text-2xl font-bold mb-4 text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              System Logs (Last 50)
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-white/50 py-8">
                  <p>Нет логов системы</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-4 items-start p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm border-l-4 transition-colors"
                    style={{
                      borderLeftColor:
                        log.event_type === 'ERROR'
                          ? '#ef4444'
                          : log.event_type === 'WARNING'
                          ? '#f59e0b'
                          : log.event_type === 'SWITCH'
                          ? '#3b82f6'
                          : '#00FF88',
                    }}
                  >
                    <span className="text-white/40 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('ru-RU')}
                    </span>
                    <Badge
                      className={`text-xs ${
                        log.event_type === 'ERROR'
                          ? 'bg-red-600/30 text-red-300 border border-red-600/50'
                          : log.event_type === 'WARNING'
                          ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-600/50'
                          : log.event_type === 'SWITCH'
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-600/50'
                          : 'bg-[#00FF88]/30 text-[#00FF88] border border-[#00FF88]/50'
                      }`}
                    >
                      {log.event_type}
                    </Badge>
                    <span className="flex-1 text-white/90">{log.message}</span>
                    {log.metadata && (
                      <details className="text-xs text-white/50 cursor-pointer">
                        <summary>Подробнее</summary>
                        <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-x-auto border border-white/10">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  color: 'blue' | 'yellow' | 'green' | 'red';
  icon: React.ReactNode;
}

function MetricCard({ label, value, color, icon }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    green: 'bg-[#00FF88]/10 border-[#00FF88]/30 text-[#00FF88]',
    red: 'bg-red-500/10 border-red-500/30 text-red-300',
  };

  return (
    <Card className={`relative group p-4 border-2 backdrop-blur-xl ${colorClasses[color]}`}
          style={{ background: 'rgba(10, 10, 10, 0.6)' }}>
      {/* Glow effect */}
      <div className={`absolute -inset-0.5 ${color === 'green' ? 'bg-[#00FF88]' : `bg-${color}-500`} rounded-xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`} />
      
      <div className="relative">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <div className="text-sm font-medium">{label}</div>
        </div>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
      </div>
    </Card>
  );
}

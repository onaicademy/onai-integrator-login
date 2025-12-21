import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
        api.get('/api/admin/system/mode'),
        api.get('/api/admin/system/metrics'),
        api.get('/api/admin/system/logs?limit=50'),
      ]);

      setMode(modeData.mode);
      setMetrics(metricsData);
      setLogs(logsData.logs || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load system health:', error);
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
        await api.post('/api/admin/system/mode', { mode: newMode });
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных о системе...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚀 System Health</h1>
          <p className="text-gray-600">
            Мониторинг очереди задач и состояния системы Tripwire Sales Manager
          </p>
        </div>

        {/* Kill Switch Card */}
        <Card className="p-6 bg-white shadow-md">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            🔄 Режим работы системы
            {switching && <span className="text-sm text-gray-500">(переключение...)</span>}
          </h2>
          <div className="flex items-center gap-4">
            <Switch
              checked={mode === 'async_queue'}
              onCheckedChange={toggleMode}
              disabled={switching}
              className="data-[state=checked]:bg-green-600"
            />
            <div className="flex-1">
              <div className={`text-lg font-semibold ${mode === 'async_queue' ? 'text-green-600' : 'text-amber-600'}`}>
                {mode === 'async_queue' ? '✅ Async Queue Mode (Очередь)' : '⚠️ Sync Direct Mode (Прямой)'}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {mode === 'async_queue'
                  ? 'Создание пользователей через очередь Redis + BullMQ. Ответ API мгновенный (50-100ms), обработка в фоне.'
                  : 'Создание пользователей синхронное (без очереди). Ответ API медленный (2-6 секунд), но без зависимости от Redis.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Queue Metrics (only in async mode) */}
        {mode === 'async_queue' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard label="⏳ Ожидают" value={metrics.waiting} color="blue" />
            <MetricCard label="⚡ Обрабатываются" value={metrics.active} color="yellow" />
            <MetricCard label="✅ Выполнено" value={metrics.completed} color="green" />
            <MetricCard label="❌ Ошибки" value={metrics.failed} color="red" />
          </div>
        )}

        {/* Health Logs */}
        <Card className="p-6 bg-white shadow-md">
          <h2 className="text-2xl font-bold mb-4">📋 System Logs (Last 50)</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>Нет логов системы</p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-4 items-start p-3 rounded-lg hover:bg-gray-50 text-sm border-l-4"
                  style={{
                    borderLeftColor:
                      log.event_type === 'ERROR'
                        ? '#ef4444'
                        : log.event_type === 'WARNING'
                        ? '#f59e0b'
                        : log.event_type === 'SWITCH'
                        ? '#3b82f6'
                        : '#10b981',
                  }}
                >
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('ru-RU')}
                  </span>
                  <Badge
                    className={`text-xs ${
                      log.event_type === 'ERROR'
                        ? 'bg-red-100 text-red-700'
                        : log.event_type === 'WARNING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : log.event_type === 'SWITCH'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {log.event_type}
                  </Badge>
                  <span className="flex-1">{log.message}</span>
                  {log.metadata && (
                    <details className="text-xs text-gray-500 cursor-pointer">
                      <summary>Подробнее</summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
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
}

function MetricCard({ label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <Card className={`p-4 border-2 ${colorClasses[color]}`}>
      <div className="text-sm font-medium mb-1">{label}</div>
      <div className="text-3xl font-bold">{value.toLocaleString()}</div>
    </Card>
  );
}

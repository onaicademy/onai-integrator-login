import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DebugStats {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  error_rate: number;
  avg_response_time: number;
  errors_by_type: { [key: string]: number };
  slowest_endpoints: Array<{
    path: string;
    avg_time: number;
    count: number;
  }>;
}

interface ErrorLog {
  id: number;
  event_type: string;
  message: string;
  metadata: any;
  created_at: string;
}

export default function DebugPanel() {
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [allLogs, setAllLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [filterType, setFilterType] = useState<'ALL' | 'ERROR' | 'INFO' | 'WARNING'>('ALL');
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  useEffect(() => {
    loadDebugData();
    const interval = setInterval(loadDebugData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [period, filterType]);

  async function loadDebugData() {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === '24h') {
        startDate.setHours(startDate.getHours() - 24);
      } else if (period === '7d') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      }

      const [statsData, errorsData, logsData] = await Promise.all([
        api.get(`/api/admin/debug/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        api.get(`/api/admin/debug/errors?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=50`),
        api.get(`/api/admin/debug/logs?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=100${filterType !== 'ALL' ? `&eventType=${filterType}` : ''}`),
      ]);

      setStats(statsData);
      setErrors(errorsData.errors || []);
      setAllLogs(logsData.logs || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to load debug data:', error);
      setLoading(false);
    }
  }

  async function handleCleanup() {
    if (!confirm('Удалить все логи старше 7 дней?')) return;

    try {
      await api.post('/api/admin/debug/cleanup');
      alert('✅ Старые логи удалены');
      loadDebugData();
    } catch (error: any) {
      alert(`❌ Ошибка: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка Debug панели...</p>
        </div>
      </div>
    );
  }

  const successRate = stats ? ((stats.successful_operations / stats.total_operations) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🚔 Debug Panel</h1>
          <p className="text-gray-600">
            Полицейский следит за всеми операциями. Auto-cleanup: 7 дней.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as const).map((p) => (
              <Button
                key={p}
                onClick={() => setPeriod(p)}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
              >
                {p === '24h' ? 'Последние 24 часа' : p === '7d' ? 'Последние 7 дней' : 'Последние 30 дней'}
              </Button>
            ))}
          </div>
          
          <Button onClick={handleCleanup} variant="destructive" size="sm">
            🗑️ Очистить старые логи (7+ дней)
          </Button>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Всего операций"
            value={stats?.total_operations || 0}
            icon="📊"
            color="blue"
          />
          <StatCard
            label="Успешно"
            value={stats?.successful_operations || 0}
            icon="✅"
            color="green"
            subtitle={`${successRate}%`}
          />
          <StatCard
            label="Ошибки"
            value={stats?.failed_operations || 0}
            icon="❌"
            color="red"
            subtitle={`${stats?.error_rate.toFixed(2)}%`}
          />
          <StatCard
            label="Avg время"
            value={`${stats?.avg_response_time || 0}ms`}
            icon="⏱️"
            color="yellow"
          />
        </div>

        {/* Errors by Type */}
        {stats && Object.keys(stats.errors_by_type).length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">❌ Ошибки по типам</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(stats.errors_by_type)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <span className="font-medium text-red-900">{type}</span>
                    <Badge className="bg-red-600 text-white">{count}</Badge>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* Slowest Endpoints */}
        {stats && stats.slowest_endpoints.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">🐌 Самые медленные endpoints</h2>
            <div className="space-y-2">
              {stats.slowest_endpoints.map((endpoint, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <span className="font-mono text-sm">{endpoint.path}</span>
                  <div className="flex gap-3 items-center">
                    <span className="text-sm text-gray-600">{endpoint.count} req</span>
                    <Badge className="bg-yellow-600 text-white">{Math.round(endpoint.avg_time)}ms</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Errors */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">🔥 Последние ошибки (Top 20)</h2>
          {errors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>✅ Нет ошибок за выбранный период</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {errors.slice(0, 20).map((error) => (
                <div
                  key={error.id}
                  className="p-3 rounded-lg border-l-4 hover:bg-gray-50 cursor-pointer"
                  style={{
                    borderLeftColor: error.event_type === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  }}
                  onClick={() => setExpandedLog(expandedLog === error.id ? null : error.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex gap-2 items-center mb-1">
                        <Badge
                          className={`text-xs ${
                            error.event_type === 'CRITICAL'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {error.event_type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(error.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{error.message}</p>
                    </div>
                  </div>
                  
                  {expandedLog === error.id && error.metadata && (
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                      {JSON.stringify(error.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* All Logs */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">📋 Все логи (Last 100)</h2>
            
            <div className="flex gap-2">
              {(['ALL', 'ERROR', 'WARNING', 'INFO'] as const).map((type) => (
                <Button
                  key={type}
                  onClick={() => setFilterType(type)}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          {allLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>Нет логов за выбранный период</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {allLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-4 items-start p-3 rounded-lg hover:bg-gray-50 text-sm border-l-4"
                  style={{
                    borderLeftColor:
                      log.event_type === 'ERROR' || log.event_type === 'CRITICAL'
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
                      log.event_type === 'ERROR' || log.event_type === 'CRITICAL'
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
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
  subtitle?: string;
}

function StatCard({ label, value, icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  return (
    <Card className={`p-4 border-2 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <div className="text-sm font-medium">{label}</div>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      {subtitle && <div className="text-sm mt-1">{subtitle}</div>}
    </Card>
  );
}

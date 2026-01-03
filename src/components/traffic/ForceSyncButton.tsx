/**
 * Force Sync Button Component
 * Кнопка принудительной синхронизации данных
 */

import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface SyncStatus {
  last_sync: {
    timestamp: string;
    status: 'success' | 'failed';
    duration_ms: number;
    error?: string;
  } | null;
}

export function ForceSyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load last sync status
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const response = await axios.get('/api/traffic-dashboard/sync-status');
      if (response.data.success) {
        setSyncStatus(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    const startTime = Date.now();

    try {
      const response = await axios.post('/api/traffic-dashboard/force-sync', {
        sources: ['amocrm', 'database'],
        recalculate: true
      });

      const duration = ((response.data.data?.duration_ms || (Date.now() - startTime)) / 1000).toFixed(1);

      if (response.data.success) {
        toast.success(`✅ Синхронизация завершена за ${duration}с!`, {
          duration: 4000,
          icon: '🔄'
        });

        // Reload sync status
        await loadSyncStatus();

        // Reload page data after short delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(`⚠️ Синхронизация завершена с ошибками (${duration}с)`, {
          duration: 6000
        });
      }
    } catch (error: any) {
      console.error('Force sync error:', error);
      toast.error(`❌ Ошибка синхронизации: ${error.response?.data?.message || error.message}`, {
        duration: 6000
      });
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = () => {
    if (!syncStatus?.last_sync) return 'Нет данных';

    const timestamp = new Date(syncStatus.last_sync.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - timestamp.getTime()) / 60000);

    if (diffMinutes < 1) return 'Только что';
    if (diffMinutes < 60) return `${diffMinutes} мин назад`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} дн назад`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleForceSync}
          disabled={syncing}
          variant="outline"
          size="sm"
          className="border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] transition-all"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Синхронизация...' : 'Принудительная синхронизация'}
        </Button>

        {syncStatus?.last_sync && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {formatLastSync()}
          </button>
        )}
      </div>

      {showDetails && syncStatus?.last_sync && (
        <div className="bg-black/40 border border-[#00FF88]/20 rounded-lg p-3 text-xs">
          <div className="flex items-center gap-2 mb-2">
            {syncStatus.last_sync.status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span className="font-bold text-white">
              Последняя синхронизация
            </span>
          </div>

          <div className="space-y-1 text-gray-400">
            <div>
              <span className="text-gray-500">Статус:</span>{' '}
              <span className={syncStatus.last_sync.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                {syncStatus.last_sync.status === 'success' ? 'Успешно' : 'Ошибка'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Время:</span>{' '}
              {new Date(syncStatus.last_sync.timestamp).toLocaleString('ru-RU')}
            </div>
            <div>
              <span className="text-gray-500">Длительность:</span>{' '}
              {(syncStatus.last_sync.duration_ms / 1000).toFixed(1)}с
            </div>
            {syncStatus.last_sync.error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                <span className="text-red-400">{syncStatus.last_sync.error}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {syncing && (
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <div className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse" />
          Обновляем данные из AmoCRM и базы данных...
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '@/utils/apiClient';

interface AmoCRMStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  queueLength: number;
  averageWaitTime: number;
  lastSyncTime: Date | null;
  requestsThisSecond: number;
  maxRequestsPerSecond: number;
  status: 'idle' | 'syncing';
  eta: number;
}

export function AmoCRMSyncStatus() {
  const [stats, setStats] = useState<AmoCRMStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/api/amocrm/stats');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch AmoCRM stats:', error);
      }
    };

    // Fetch immediately
    fetchStats();

    // Then fetch every 2 seconds
    const interval = setInterval(fetchStats, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!stats || stats.status === 'idle') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg z-50">
      <div className="flex items-center gap-3">
        <div className="animate-spin">⏳</div>
        <div>
          <p className="font-bold">Синхронизация с AmoCRM</p>
          <p className="text-sm">
            В очереди: {stats.queueLength} запросов (~{stats.eta} сек)
          </p>
        </div>
      </div>
    </div>
  );
}

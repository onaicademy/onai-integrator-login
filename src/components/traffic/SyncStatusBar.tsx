/**
 * Sync Status Bar Component
 *
 * Displays:
 * - Last sync time
 * - Sync in progress indicator
 * - Manual refresh button
 * - Data freshness status
 */

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { TRAFFIC_API_URL } from '@/config/traffic-api';
import { AuthManager } from '@/lib/auth';
import toast from 'react-hot-toast';

interface SyncStatus {
  inProgress: boolean;
  lastSync: string | null;
  lastError: string | null;
  nextSync: string | null;
  stats: {
    usersProcessed: number;
    metricsUpdated: number;
    duration: number;
  };
}

interface SyncStatusBarProps {
  onRefreshComplete?: () => void;
  compact?: boolean;
}

export function SyncStatusBar({ onRefreshComplete, compact = false }: SyncStatusBarProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = AuthManager.isAdmin();

  // Fetch sync status
  const fetchStatus = async () => {
    try {
      const token = AuthManager.getAccessToken();
      const response = await axios.get(`${TRAFFIC_API_URL}/api/traffic-aggregation/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus();

    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (!isAdmin) {
      toast.error('Only admins can trigger manual refresh');
      return;
    }

    setRefreshing(true);

    try {
      const token = AuthManager.getAccessToken();
      const response = await axios.post(
        `${TRAFFIC_API_URL}/api/traffic-aggregation/refresh`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Sync started in background');
        // Poll more frequently while syncing
        setTimeout(fetchStatus, 2000);
        setTimeout(fetchStatus, 5000);
        setTimeout(fetchStatus, 10000);
        setTimeout(() => {
          fetchStatus();
          onRefreshComplete?.();
        }, 15000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start refresh');
    } finally {
      setRefreshing(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('ru-RU');
  };

  // Determine freshness status
  const getFreshnessStatus = (): { icon: React.ReactNode; text: string; color: string } => {
    if (!status?.lastSync) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        text: 'No data',
        color: 'text-yellow-500'
      };
    }

    const lastSync = new Date(status.lastSync);
    const diffMs = Date.now() - lastSync.getTime();
    const diffMins = diffMs / 60000;

    if (status.inProgress) {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: 'Syncing...',
        color: 'text-blue-500'
      };
    }

    if (diffMins < 15) {
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        text: 'Fresh',
        color: 'text-green-500'
      };
    }

    if (diffMins < 30) {
      return {
        icon: <Clock className="w-4 h-4" />,
        text: 'Slightly stale',
        color: 'text-yellow-500'
      };
    }

    return {
      icon: <AlertTriangle className="w-4 h-4" />,
      text: 'Stale data',
      color: 'text-red-500'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading sync status...</span>
      </div>
    );
  }

  const freshness = getFreshnessStatus();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1 ${freshness.color}`}>
          {freshness.icon}
          <span className="text-xs">{formatRelativeTime(status?.lastSync ?? null)}</span>
        </div>
        {isAdmin && (
          <Button
            onClick={handleRefresh}
            disabled={refreshing || status?.inProgress}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-black/40 border border-[#00FF88]/10 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Freshness indicator */}
          <div className={`flex items-center gap-2 ${freshness.color}`}>
            {freshness.icon}
            <span className="text-sm font-medium">{freshness.text}</span>
          </div>

          {/* Last sync time */}
          <div className="text-sm text-gray-400">
            Last sync: {formatRelativeTime(status?.lastSync ?? null)}
          </div>

          {/* Stats (if available) */}
          {status?.stats && status.stats.metricsUpdated > 0 && (
            <div className="text-xs text-gray-500">
              {status.stats.metricsUpdated} metrics updated
            </div>
          )}
        </div>

        {/* Manual refresh button (admin only) */}
        {isAdmin && (
          <Button
            onClick={handleRefresh}
            disabled={refreshing || status?.inProgress}
            variant="outline"
            size="sm"
            className="border-[#00FF88]/20 text-[#00FF88] hover:bg-[#00FF88]/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Syncing...' : 'Refresh Now'}
          </Button>
        )}
      </div>

      {/* Error message */}
      {status?.lastError && (
        <div className="mt-2 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Last sync error: {status.lastError}
        </div>
      )}

      {/* Next sync info */}
      {status?.nextSync && (
        <div className="mt-1 text-xs text-gray-500">
          Next auto-sync: {formatRelativeTime(status.nextSync)}
        </div>
      )}
    </div>
  );
}

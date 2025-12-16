/**
 * Custom hook for real-time bulk sync progress tracking via SSE
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface SyncProgress {
  syncId: string;
  totalLeads: number;
  processed: number;
  successful: number;
  failed: number;
  in_progress: number;
  queued: number;
  progress: number; // 0-100
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number; // seconds
}

interface UseBulkSyncProgressResult {
  progress: SyncProgress | null;
  error: string | null;
  isConnected: boolean;
  retry: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

export function useBulkSyncProgress(syncId: string | null): UseBulkSyncProgressResult {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Polling fallback
  const startPolling = useCallback(async (id: string) => {
    if (isPollingRef.current) return;
    
    isPollingRef.current = true;
    console.log('📊 Starting polling fallback for sync:', id);

    const poll = async () => {
      try {
        const response = await fetch(`${API_URL}/api/bulk-sync/progress/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.progress) {
          setProgress(data.progress);
          setError(null);
          setIsConnected(true);

          // Stop polling if completed
          if (data.progress.status === 'completed' || data.progress.status === 'failed') {
            cleanup();
            isPollingRef.current = false;
          }
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        setError(err.message);
        setIsConnected(false);
      }
    };

    // Poll immediately
    await poll();

    // Then poll every 500ms
    pollingIntervalRef.current = setInterval(poll, 500);
  }, [cleanup]);

  // SSE connection
  const connectSSE = useCallback((id: string) => {
    console.log('📡 Connecting to SSE for sync:', id);

    const eventSource = new EventSource(`${API_URL}/api/bulk-sync/progress-stream/${id}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('✅ SSE connected:', data.syncId);
          return;
        }

        if (data.type === 'error') {
          console.error('❌ SSE error:', data.error);
          setError(data.error);
          cleanup();
          // Fallback to polling
          startPolling(id);
          return;
        }

        // Progress update
        setProgress(data);
        setError(null);

        // Close connection if sync completed
        if (data.status === 'completed' || data.status === 'failed') {
          console.log(`✅ Sync ${data.status}, closing SSE`);
          setTimeout(() => cleanup(), 1000);
        }
      } catch (err: any) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('❌ SSE connection error, falling back to polling');
      setError('Connection error, using polling');
      setIsConnected(false);
      cleanup();
      
      // Fallback to polling
      startPolling(id);
    };
  }, [cleanup, startPolling]);

  // Retry connection
  const retry = useCallback(() => {
    if (!syncId) return;
    
    cleanup();
    setError(null);
    isPollingRef.current = false;
    
    // Try SSE first
    connectSSE(syncId);
  }, [syncId, cleanup, connectSSE]);

  // Main effect
  useEffect(() => {
    if (!syncId) {
      cleanup();
      return;
    }

    // Try SSE connection first
    connectSSE(syncId);

    // Cleanup on unmount
    return cleanup;
  }, [syncId, connectSSE, cleanup]);

  return {
    progress,
    error,
    isConnected,
    retry,
  };
}

export default useBulkSyncProgress;


// src/components/traffic/WebhookLogsViewer.tsx
// 🔍 Webhook Logs Viewer for Debugging AmoCRM Integration

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, RefreshCw, Filter } from 'lucide-react';
import axios from 'axios';

interface WebhookLog {
  id: number;
  received_at: string;
  source: string;
  pipeline_id: number | null;
  lead_id: number;
  deal_data: any;
  utm_source: string | null;
  utm_campaign: string | null;
  routing_decision: string;
  processing_status: string;
  error_message: string | null;
  processed_at: string;
}

export default function WebhookLogsViewer() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRouting, setFilterRouting] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterRouting !== 'all') params.routing = filterRouting;

      const response = await axios.get('/api/admin/webhook-logs', { params });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterStatus, filterRouting]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">Success</Badge>;
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500">Partial</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getRoutingBadge = (routing: string) => {
    switch (routing) {
      case 'referral':
        return <Badge className="bg-blue-500">🔗 Referral</Badge>;
      case 'traffic':
        return <Badge className="bg-purple-500">🎯 Traffic</Badge>;
      case 'both':
        return <Badge className="bg-orange-500">🔀 Both</Badge>;
      case 'unknown':
        return <Badge className="bg-gray-500">❓ Unknown</Badge>;
      default:
        return <Badge>{routing}</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>🔍 Webhook Logs (AmoCRM)</CardTitle>
          <Button
            onClick={fetchLogs}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="partial">Partial</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Routing:</span>
            <select
              value={filterRouting}
              onChange={(e) => setFilterRouting(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="all">All</option>
              <option value="referral">Referral</option>
              <option value="traffic">Traffic</option>
              <option value="both">Both</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Loading webhook logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No webhook logs found
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold">
                      Lead #{log.lead_id}
                    </span>
                    {getRoutingBadge(log.routing_decision)}
                    {getStatusBadge(log.processing_status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {new Date(log.received_at).toLocaleString('ru-RU')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      {expandedLog === log.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">UTM Source:</span>
                    <span className="ml-2 font-medium">
                      {log.utm_source || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">UTM Campaign:</span>
                    <span className="ml-2 font-medium">
                      {log.utm_campaign || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pipeline:</span>
                    <span className="ml-2 font-medium">
                      {log.pipeline_id || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {log.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    <strong>Error:</strong> {log.error_message}
                  </div>
                )}

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold mb-2">Full Deal Data (JSON):</h4>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(log.deal_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

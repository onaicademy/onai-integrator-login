/**
 * Debug Panel - In-App Debug Dashboard
 * Self-Validating UI Architecture
 * 
 * Accessible via: Ctrl/Cmd + Shift + D or Admin Panel
 */

import { useState, useEffect } from 'react';
import { X, Activity, AlertTriangle, CheckCircle, XCircle, Download, Trash2, RefreshCw, Terminal } from 'lucide-react';
import { debugSystem, type ActionLog, type SystemModule, type SystemStatus } from '@/lib/debug-system';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [overall, setOverall] = useState<SystemStatus>('unknown');
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'modules'>('overview');
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const updateData = () => {
      const report = debugSystem.getHealthReport();
      setModules(report.modules);
      setOverall(report.overall);
      setUptime(report.uptime);
      setLogs(debugSystem.getActionLogs(100));
    };

    updateData();
    const unsubscribe = debugSystem.subscribe(updateData);

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = () => {
    const report = debugSystem.exportHealthReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `health-check-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLogs = () => {
    if (confirm('Clear all logs?')) {
      debugSystem.clearLogs();
    }
  };

  const getStatusColor = (status: SystemStatus) => {
    switch (status) {
      case 'operational':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: SystemStatus) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-4 h-4" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4" />;
      case 'down':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'success':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'warn':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'action':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-gradient-to-br from-[#0a0e17] to-[#121a2b] border border-[#00ff88]/30 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#00ff88]/20 bg-black/40">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-[#00ff88]" />
            <div>
              <h2 className="text-xl font-bold text-white">Debug & Health Check</h2>
              <p className="text-xs text-gray-400">System Diagnostics Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getStatusColor(overall)} border-current`}>
              <Activity className="w-3 h-3 mr-1" />
              {overall.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-[#00ff88]/10">
          {(['overview', 'logs', 'modules'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                activeTab === tab
                  ? 'bg-[#00ff88]/10 text-[#00ff88] border-b-2 border-[#00ff88]'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* System Status */}
              <div className="bg-black/40 rounded-lg p-6 border border-[#00ff88]/10">
                <h3 className="text-lg font-semibold text-white mb-4">System Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Overall</div>
                    <div className={`text-2xl font-bold ${getStatusColor(overall)}`}>
                      {overall}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Uptime</div>
                    <div className="text-2xl font-bold text-[#00ff88]">
                      {formatUptime(uptime)}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Modules</div>
                    <div className="text-2xl font-bold text-white">
                      {modules.filter(m => m.status === 'operational').length}/{modules.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Modules View */}
              <div className="bg-black/40 rounded-lg p-6 border border-[#00ff88]/10">
                <h3 className="text-lg font-semibold text-white mb-4">Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modules.map(module => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={getStatusColor(module.status)}>
                          {getStatusIcon(module.status)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{module.name}</div>
                          <div className="text-xs text-gray-400">{module.message || 'No data'}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${getStatusColor(module.status)} border-current text-xs`}>
                        {module.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-black/40 rounded-lg p-6 border border-[#00ff88]/10">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-2">
                  {logs.slice(0, 5).map(log => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between bg-white/5 rounded-lg p-3 text-xs"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getLogLevelColor(log.level)}>
                            {log.level}
                          </Badge>
                          <span className="text-white font-medium">{log.action}</span>
                        </div>
                        <div className="text-gray-400">{log.target}</div>
                        {log.request && (
                          <div className="text-gray-500 mt-1">
                            {log.request.method} {log.request.url}
                          </div>
                        )}
                      </div>
                      <div className="text-gray-500 text-right">
                        <div>{log.timestamp.toLocaleTimeString()}</div>
                        {log.response && (
                          <div className={log.response.status < 400 ? 'text-green-500' : 'text-red-500'}>
                            {log.response.status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-3">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="bg-black/40 rounded-lg p-4 border border-[#00ff88]/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getLogLevelColor(log.level)}>
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-white font-medium">{log.action}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-300 mb-2">{log.target}</div>
                  
                  {log.request && (
                    <div className="bg-white/5 rounded p-3 mb-2 space-y-1">
                      <div className="text-xs font-mono">
                        <span className="text-blue-400">[REQUEST]</span>{' '}
                        <span className="text-yellow-400">{log.request.method}</span>{' '}
                        <span className="text-gray-300">{log.request.url}</span>
                      </div>
                      {log.request.payload && (
                        <details className="text-xs">
                          <summary className="text-gray-400 cursor-pointer">Payload</summary>
                          <pre className="mt-1 text-gray-300 overflow-x-auto">
                            {JSON.stringify(log.request.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                  
                  {log.response && (
                    <div className="bg-white/5 rounded p-3 space-y-1">
                      <div className="text-xs font-mono">
                        <span className="text-green-400">[RESPONSE]</span>{' '}
                        <span className={log.response.status < 400 ? 'text-green-500' : 'text-red-500'}>
                          {log.response.status}
                        </span>
                        {log.duration && (
                          <span className="text-gray-400 ml-2">
                            ({formatDuration(log.duration)})
                          </span>
                        )}
                      </div>
                      {log.response.error && (
                        <div className="text-xs text-red-400">{log.response.error}</div>
                      )}
                      {log.response.data && (
                        <details className="text-xs">
                          <summary className="text-gray-400 cursor-pointer">Response Data</summary>
                          <pre className="mt-1 text-gray-300 overflow-x-auto">
                            {JSON.stringify(log.response.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No logs available
                </div>
              )}
            </div>
          )}

          {activeTab === 'modules' && (
            <div className="space-y-4">
              {modules.map(module => (
                <div
                  key={module.id}
                  className="bg-black/40 rounded-lg p-6 border border-[#00ff88]/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(module.status)}>
                        {getStatusIcon(module.status)}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{module.name}</h4>
                        <p className="text-sm text-gray-400">{module.id}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${getStatusColor(module.status)} border-current`}>
                      {module.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Check:</span>
                      <span className="text-white">{module.lastCheck.toLocaleString()}</span>
                    </div>
                    {module.message && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Message:</span>
                        <span className="text-white">{module.message}</span>
                      </div>
                    )}
                    {module.details && (
                      <div className="bg-white/5 rounded p-3 mt-2">
                        <pre className="text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(module.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#00ff88]/20 bg-black/40">
          <div className="text-xs text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClearLogs}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Logs
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload
            </Button>
            <Button size="sm" onClick={handleExport} className="bg-[#00ff88] text-black hover:bg-[#00ff88]/90">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Traffic API Integrations Panel
 *
 * Управление и мониторинг внешних API:
 * - Facebook Ads API
 * - AmoCRM API
 * - Supabase connections
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Facebook,
  Database,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

interface ApiHealthStatus {
  service: string;
  status: 'online' | 'offline' | 'error';
  message: string;
  details?: any;
  lastChecked: string;
}

interface AllApiStatus {
  facebook: ApiHealthStatus;
  amocrm: ApiHealthStatus;
  supabase: ApiHealthStatus;
  overall: {
    status: 'online' | 'error';
    lastChecked: string;
  };
}

export default function TrafficAPIIntegrations() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<AllApiStatus | null>(null);

  const fetchAllStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/integrations/all');
      setApiStatus(response.data);
    } catch (error: any) {
      console.error('❌ Failed to fetch API status:', error);
      toast.error('Не удалось загрузить статус API');
    } finally {
      setLoading(false);
    }
  };

  const refreshSingleApi = async (apiName: 'facebook' | 'amocrm' | 'supabase') => {
    setRefreshing(apiName);
    try {
      const response = await axios.get(`/api/integrations/${apiName}`);

      setApiStatus(prev => {
        if (!prev) return null;
        return {
          ...prev,
          [apiName]: response.data
        };
      });

      toast.success(`${response.data.service} - статус обновлен`);
    } catch (error: any) {
      console.error(`❌ Failed to refresh ${apiName}:`, error);
      toast.error(`Не удалось обновить статус ${apiName}`);
    } finally {
      setRefreshing(null);
    }
  };

  useEffect(() => {
    fetchAllStatus();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchAllStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: 'online' | 'offline' | 'error') => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'offline':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: 'online' | 'offline' | 'error') => {
    switch (status) {
      case 'online':
        return 'bg-green-500/20 border-green-500/30 text-green-500';
      case 'offline':
        return 'bg-red-500/20 border-red-500/30 text-red-500';
      case 'error':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-500';
    }
  };

  const getServiceIcon = (service: string) => {
    if (service.includes('Facebook')) return <Facebook className="w-6 h-6" />;
    if (service.includes('AmoCRM')) return <Activity className="w-6 h-6" />;
    if (service.includes('Supabase')) return <Database className="w-6 h-6" />;
    return <Activity className="w-6 h-6" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#00FF88] mx-auto mb-4" />
          <p className="text-white">Загрузка статуса API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Button
              onClick={() => navigate('/traffic/admin/dashboard')}
              variant="outline"
              className="border-white/10 hover:border-[#00FF88]/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">API Интеграции</h1>
          <p className="text-gray-400">Мониторинг и управление внешними сервисами</p>
        </motion.div>

        {/* Overall Status */}
        {apiStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-6 rounded-xl border ${
              apiStatus.overall.status === 'online'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(apiStatus.overall.status)}
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {apiStatus.overall.status === 'online' ? 'Все системы работают' : 'Обнаружены проблемы'}
                  </h2>
                  <p className="text-sm text-gray-400">
                    Последняя проверка: {new Date(apiStatus.overall.lastChecked).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
              <Button
                onClick={fetchAllStatus}
                variant="outline"
                className="border-white/10 hover:border-[#00FF88]/30"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить все
              </Button>
            </div>
          </motion.div>
        )}

        {/* API Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Facebook Ads API */}
          {apiStatus?.facebook && (
            <ApiCard
              data={apiStatus.facebook}
              onRefresh={() => refreshSingleApi('facebook')}
              isRefreshing={refreshing === 'facebook'}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
              getServiceIcon={getServiceIcon}
            />
          )}

          {/* AmoCRM API */}
          {apiStatus?.amocrm && (
            <ApiCard
              data={apiStatus.amocrm}
              onRefresh={() => refreshSingleApi('amocrm')}
              isRefreshing={refreshing === 'amocrm'}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
              getServiceIcon={getServiceIcon}
            />
          )}

          {/* Supabase */}
          {apiStatus?.supabase && (
            <ApiCard
              data={apiStatus.supabase}
              onRefresh={() => refreshSingleApi('supabase')}
              isRefreshing={refreshing === 'supabase'}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
              getServiceIcon={getServiceIcon}
              fullWidth
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface ApiCardProps {
  data: ApiHealthStatus;
  onRefresh: () => void;
  isRefreshing: boolean;
  getStatusIcon: (status: 'online' | 'offline' | 'error') => JSX.Element;
  getStatusColor: (status: 'online' | 'offline' | 'error') => string;
  getServiceIcon: (service: string) => JSX.Element;
  fullWidth?: boolean;
}

function ApiCard({
  data,
  onRefresh,
  isRefreshing,
  getStatusIcon,
  getStatusColor,
  getServiceIcon,
  fullWidth = false
}: ApiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-black/40 border border-white/10 rounded-xl p-6 backdrop-blur-xl ${
        fullWidth ? 'lg:col-span-2' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center">
            {getServiceIcon(data.service)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{data.service}</h3>
            <p className="text-xs text-gray-400">
              {new Date(data.lastChecked).toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
        <Button
          onClick={onRefresh}
          disabled={isRefreshing}
          variant="ghost"
          size="icon"
          className="hover:bg-white/5"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-4 ${getStatusColor(data.status)}`}>
        {getStatusIcon(data.status)}
        <span className="text-sm font-semibold uppercase">
          {data.status === 'online' ? 'Работает' : data.status === 'offline' ? 'Не работает' : 'Ошибка'}
        </span>
      </div>

      {/* Message */}
      <p className="text-gray-300 mb-4">{data.message}</p>

      {/* Details */}
      {data.details && (
        <div className="mt-4 p-4 bg-black/40 rounded-lg border border-white/5">
          <h4 className="text-sm font-semibold text-gray-400 mb-2">Детали:</h4>
          <div className="space-y-1">
            {typeof data.details === 'object' && !Array.isArray(data.details) ? (
              Object.entries(data.details).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-500">{key}:</span>
                  <span className="text-gray-300 font-mono">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))
            ) : Array.isArray(data.details) ? (
              <div className="space-y-2">
                {data.details.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-black/20 rounded">
                    <span className="text-gray-300">{item.name}</span>
                    <span className={`text-sm font-semibold ${
                      item.status === 'online' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {item.status === 'online' ? '✓' : '✗'} {item.message}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="text-xs text-gray-400 overflow-auto">{JSON.stringify(data.details, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Traffic Admin Panel
 * 
 * Admin interface for managing:
 * - AI settings (growth %, prompt template)
 * - User management
 * - Plan generation for all teams
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrafficCabinetLayout } from '@/components/traffic/TrafficCabinetLayout';
import { Settings, Users, Sparkles, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

export default function TrafficAdminPanel() {
  const [activeTab, setActiveTab] = useState<'settings' | 'users' | 'generate'>('settings');
  const queryClient = useQueryClient();
  
  return (
    <TrafficCabinetLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Админ Панель</h1>
          <p className="text-gray-400">Управление системой Traffic Dashboard</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#00FF88]/10">
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
            icon={<Settings className="w-4 h-4" />}
            label="Настройки AI"
          />
          <TabButton
            active={activeTab === 'users'}
            onClick={() => setActiveTab('users')}
            icon={<Users className="w-4 h-4" />}
            label="Пользователи"
          />
          <TabButton
            active={activeTab === 'generate'}
            onClick={() => setActiveTab('generate')}
            icon={<Sparkles className="w-4 h-4" />}
            label="Генерация планов"
          />
        </div>
        
        {/* Content */}
        {activeTab === 'settings' && <SettingsPanel />}
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'generate' && <GeneratePanel />}
      </div>
    </TrafficCabinetLayout>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-3 transition-all
        ${active 
          ? 'text-[#00FF88] border-b-2 border-[#00FF88]' 
          : 'text-gray-400 hover:text-white'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function SettingsPanel() {
  const token = localStorage.getItem('traffic_token');
  
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/traffic-admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.settings;
    }
  });
  
  const [growthPercentage, setGrowthPercentage] = useState('10.0');
  const [minRoas, setMinRoas] = useState('1.5');
  const [maxCpa, setMaxCpa] = useState('60.0');
  
  const updateMutation = useMutation({
    mutationFn: async (data: { key: string; value: any }) => {
      await axios.put(
        `${API_URL}/api/traffic-admin/settings/${data.key}`,
        { value: data.value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      toast.success('Настройка обновлена');
    },
    onError: () => {
      toast.error('Ошибка обновления');
    }
  });
  
  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 text-[#00FF88] animate-spin mx-auto" /></div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Настройки Groq AI</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Процент роста (%)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={growthPercentage}
                onChange={(e) => setGrowthPercentage(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
              />
              <Button
                onClick={() => updateMutation.mutate({ 
                  key: 'ai_growth_percentage', 
                  value: growthPercentage 
                })}
                className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
              >
                Сохранить
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Целевой % роста для еженедельных планов</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Минимальный ROAS
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={minRoas}
                onChange={(e) => setMinRoas(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
              />
              <Button
                onClick={() => updateMutation.mutate({ 
                  key: 'min_roas_target', 
                  value: minRoas 
                })}
                className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
              >
                Сохранить
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Максимальный CPA ($)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="1"
                value={maxCpa}
                onChange={(e) => setMaxCpa(e.target.value)}
                className="bg-black/50 border-[#00FF88]/20 text-white"
              />
              <Button
                onClick={() => updateMutation.mutate({ 
                  key: 'max_cpa_target', 
                  value: maxCpa 
                })}
                className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black"
              >
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {settingsData && (
        <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Все настройки</h3>
          <div className="space-y-2">
            {settingsData.map((setting: any) => (
              <div key={setting.id} className="flex justify-between items-center p-3 bg-black/40 rounded-lg">
                <div>
                  <p className="text-white font-medium">{setting.setting_key}</p>
                  <p className="text-xs text-gray-400">{setting.description}</p>
                </div>
                <span className="text-[#00FF88] font-mono text-sm">
                  {String(setting.setting_value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsersPanel() {
  const token = localStorage.getItem('traffic_token');
  
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/traffic-admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.users;
    }
  });
  
  if (isLoading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 text-[#00FF88] animate-spin mx-auto" /></div>;
  }
  
  return (
    <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">Пользователи системы</h2>
      
      <div className="space-y-2">
        {usersData?.map((user: any) => (
          <div key={user.id} className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-[#00FF88]/10">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-[#00FF88]' : 'bg-gray-500'}`} />
              <div>
                <p className="text-white font-bold">{user.full_name}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                user.role === 'admin' 
                  ? 'bg-[#00FF88]/20 text-[#00FF88]' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {user.role === 'admin' ? 'Админ' : user.team_name}
              </span>
              <span className="text-xs text-gray-500">
                {user.last_login_at 
                  ? new Date(user.last_login_at).toLocaleDateString('ru-RU')
                  : 'Не входил'
                }
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneratePanel() {
  const token = localStorage.getItem('traffic_token');
  const [results, setResults] = useState<any>(null);
  
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_URL}/api/traffic-admin/generate-all-plans`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: (data) => {
      setResults(data);
      toast.success(`Создано ${data.summary.successful} из ${data.summary.total} планов`);
    },
    onError: () => {
      toast.error('Ошибка генерации планов');
    }
  });
  
  return (
    <div className="space-y-6">
      <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Генерация планов для всех команд</h2>
        <p className="text-gray-400 mb-6">
          Создание еженедельных планов с использованием Groq AI для всех 4 команд
        </p>
        
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="bg-[#00FF88] hover:bg-[#00FF88]/90 text-black font-bold px-8 py-6 text-lg"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Генерация...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Создать планы для всех
            </>
          )}
        </Button>
      </div>
      
      {results && (
        <div className="bg-black/40 border border-[#00FF88]/20 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Результаты генерации</h3>
          
          <div className="space-y-3">
            {results.results.map((result: any) => (
              <div 
                key={result.team}
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  result.success 
                    ? 'bg-[#00FF88]/10 border border-[#00FF88]/20' 
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-[#00FF88]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <div className="flex-1">
                  <p className="font-bold text-white">{result.team}</p>
                  {result.success ? (
                    <p className="text-sm text-gray-400">
                      План создан: Week {result.plan.week_number}
                    </p>
                  ) : (
                    <p className="text-sm text-red-400">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


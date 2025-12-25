/**
 * Attribution Manager Panel
 * Manages unassigned traffic and ad account mappings
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertCircle, CheckCircle, Loader2, GitBranch, DollarSign,
  TrendingUp, Calendar, Target, Settings as SettingsIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('traffic_token');
  return token || '';
};

// API client with auth
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function AttributionPanel() {
  const [selectedTeam, setSelectedTeam] = useState<Record<string, string>>({});
  const [newAccountId, setNewAccountId] = useState('');
  const [newAccountTeam, setNewAccountTeam] = useState('');
  const queryClient = useQueryClient();

  // Available teams (from known teams in system)
  const teams = ['Kenesary', 'Ksenia', 'Akhmet', 'Asel', 'Akmaral', 'Nazym', 'Zhanar', 'Dinara'];

  // Fetch unassigned traffic
  const { data: unassignedData, isLoading: loadingUnassigned } = useQuery({
    queryKey: ['attribution-unassigned'],
    queryFn: async () => {
      const response = await apiClient.get('/attribution/unassigned');
      return response.data;
    },
  });

  // Fetch ad accounts mapping
  const { data: adAccountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['attribution-ad-accounts'],
    queryFn: async () => {
      const response = await apiClient.get('/attribution/ad-accounts');
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['attribution-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/attribution/stats');
      return response.data;
    },
  });

  // Assign campaign mutation
  const assignMutation = useMutation({
    mutationFn: async ({ campaignId, teamName }: { campaignId: string; teamName: string }) => {
      const response = await apiClient.post('/attribution/assign', {
        campaignId,
        teamName,
        reason: 'Manual assignment via Attribution Manager',
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      queryClient.invalidateQueries({ queryKey: ['attribution-unassigned'] });
      queryClient.invalidateQueries({ queryKey: ['attribution-stats'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.error || error.message}`);
    },
  });

  // Add ad account mapping mutation
  const addAccountMutation = useMutation({
    mutationFn: async ({ accountId, teamName }: { accountId: string; teamName: string }) => {
      const response = await apiClient.post('/attribution/ad-accounts', {
        accountId,
        teamName,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      setNewAccountId('');
      setNewAccountTeam('');
      queryClient.invalidateQueries({ queryKey: ['attribution-ad-accounts'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.error || error.message}`);
    },
  });

  // Delete ad account mapping mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const response = await apiClient.delete(`/attribution/ad-accounts/${accountId}`);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`✅ ${data.message}`);
      queryClient.invalidateQueries({ queryKey: ['attribution-ad-accounts'] });
    },
    onError: (error: any) => {
      toast.error(`❌ ${error.response?.data?.error || error.message}`);
    },
  });

  const handleAssign = (campaignId: string) => {
    const teamName = selectedTeam[campaignId];
    if (!teamName) {
      toast.error('Выберите команду');
      return;
    }
    assignMutation.mutate({ campaignId, teamName });
  };

  const handleAddAccount = () => {
    if (!newAccountId || !newAccountTeam) {
      toast.error('Заполните все поля');
      return;
    }
    addAccountMutation.mutate({ accountId: newAccountId, teamName: newAccountTeam });
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a1a24] border border-[#00FF88]/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00FF88]/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-[#00FF88]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Распределено</p>
              <p className="text-2xl font-bold text-white">
                ${statsData?.stats?.assigned_spend_usd?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Не распределено</p>
              <p className="text-2xl font-bold text-white">
                ${statsData?.stats?.unassigned_spend_usd?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-[#00FF88]/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00FF88]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#00FF88]" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Кампаний без команды</p>
              <p className="text-2xl font-bold text-white">
                {unassignedData?.data?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unassigned Traffic Section */}
      <div className="bg-[#1a1a24] border border-[#00FF88]/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <GitBranch className="w-6 h-6 text-[#00FF88]" />
          <h2 className="text-xl font-bold text-white">Нераспределенный трафик</h2>
        </div>

        {loadingUnassigned ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#00FF88] animate-spin" />
          </div>
        ) : unassignedData?.data?.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-[#00FF88] mx-auto mb-3" />
            <p className="text-gray-400">Весь трафик распределён!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {unassignedData?.data?.map((campaign: any) => (
              <div
                key={campaign.campaign_id}
                className="bg-[#0a0a12] border border-[#00FF88]/10 rounded-lg p-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Кампания</p>
                    <p className="font-bold text-white truncate">{campaign.campaign_name}</p>
                    <p className="text-xs text-gray-500 mt-1">ID: {campaign.campaign_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Аккаунт</p>
                    <p className="font-mono text-sm text-white">{campaign.ad_account_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-[#1a1a24] rounded p-2">
                    <p className="text-xs text-gray-400">Spend USD</p>
                    <p className="font-bold text-white">${campaign.total_spend_usd?.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#1a1a24] rounded p-2">
                    <p className="text-xs text-gray-400">Spend KZT</p>
                    <p className="font-bold text-white">₸{campaign.total_spend_kzt?.toFixed(0)}</p>
                  </div>
                  <div className="bg-[#1a1a24] rounded p-2">
                    <p className="text-xs text-gray-400">Показы</p>
                    <p className="font-bold text-white">{campaign.total_impressions?.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#1a1a24] rounded p-2">
                    <p className="text-xs text-gray-400">Клики</p>
                    <p className="font-bold text-white">{campaign.total_clicks?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <select
                    value={selectedTeam[campaign.campaign_id] || ''}
                    onChange={(e) =>
                      setSelectedTeam({ ...selectedTeam, [campaign.campaign_id]: e.target.value })
                    }
                    className="flex-1 bg-[#1a1a24] border border-[#00FF88]/20 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#00FF88]"
                  >
                    <option value="">Выберите команду</option>
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => handleAssign(campaign.campaign_id)}
                    disabled={!selectedTeam[campaign.campaign_id] || assignMutation.isPending}
                    className="bg-[#00FF88] text-black hover:bg-[#00cc88] px-6"
                  >
                    {assignMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Назначить'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ad Account Mapping Section */}
      <div className="bg-[#1a1a24] border border-[#00FF88]/20 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-[#00FF88]" />
          <h2 className="text-xl font-bold text-white">Привязка рекламных аккаунтов</h2>
        </div>

        {/* Add new mapping */}
        <div className="bg-[#0a0a12] border border-[#00FF88]/10 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-400 mb-3">Добавить новую привязку</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              placeholder="act_123456789"
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              className="bg-[#1a1a24] border-[#00FF88]/20 text-white"
            />
            <select
              value={newAccountTeam}
              onChange={(e) => setNewAccountTeam(e.target.value)}
              className="bg-[#1a1a24] border border-[#00FF88]/20 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#00FF88]"
            >
              <option value="">Выберите команду</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <Button
              onClick={handleAddAccount}
              disabled={!newAccountId || !newAccountTeam || addAccountMutation.isPending}
              className="bg-[#00FF88] text-black hover:bg-[#00cc88]"
            >
              {addAccountMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Добавить'
              )}
            </Button>
          </div>
        </div>

        {/* Existing mappings */}
        {loadingAccounts ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#00FF88] animate-spin" />
          </div>
        ) : adAccountsData?.data?.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Нет привязанных аккаунтов</p>
        ) : (
          <div className="space-y-3">
            {adAccountsData?.data?.map((account: any) => (
              <div
                key={account.account_id}
                className="flex items-center justify-between bg-[#0a0a12] border border-[#00FF88]/10 rounded-lg p-4"
              >
                <div className="flex-1">
                  <p className="font-mono text-white">{account.account_id}</p>
                  <p className="text-sm text-gray-400">→ {account.team_name}</p>
                </div>
                <Button
                  onClick={() => deleteAccountMutation.mutate(account.account_id)}
                  disabled={deleteAccountMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

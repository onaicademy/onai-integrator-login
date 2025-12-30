import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { getApiBaseUrl } from '@/lib/runtime-config';

const API_URL = getApiBaseUrl() || 'https://api.onai.academy';

function getEmailStatusDisplay(lead: any) {
  if (lead.email_failed || lead.email_error) {
    return <span className="text-red-600 font-semibold">❌ Ошибка</span>;
  }
  if (lead.email_sent && lead.email_opened) {
    return <span className="text-green-600 font-semibold">👀 Открыто</span>;
  }
  if (lead.email_sent && lead.email_clicked) {
    return <span className="text-green-600 font-semibold">🔗 Клик</span>;
  }
  if (lead.email_sent) {
    return <span className="text-blue-600 font-semibold">📤 Отправлено</span>;
  }
  return <span className="text-gray-400">—</span>;
}

function getSMSStatusDisplay(lead: any) {
  if (lead.sms_failed || lead.sms_error) {
    return <span className="text-red-600 font-semibold">❌ Ошибка</span>;
  }
  if (lead.sms_sent && lead.sms_delivered && lead.sms_clicked) {
    return <span className="text-green-600 font-semibold">🔗 Клик</span>;
  }
  if (lead.sms_sent && lead.sms_delivered) {
    return <span className="text-green-600 font-semibold">✅ Доставлено</span>;
  }
  if (lead.sms_sent) {
    return <span className="text-blue-600 font-semibold">📤 Отправлено</span>;
  }
  return <span className="text-gray-400">—</span>;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="text-3xl">{icon || '📊'}</div>
      <div className="text-4xl font-bold mt-2">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
}

export default function UnifiedDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['unified-leads'],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/unified-tracking/leads`);
      return response.data;
    },
    refetchInterval: autoRefresh ? 60000 : false, // 60 seconds
  });

  const stats = data?.stats;
  const leads = data?.leads || [];

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Ошибка загрузки дашборда: {(error as Error).message}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              📊 Трекинг Лидов
            </h1>
            <p className="text-gray-600 mt-1">
              Мониторинг Email & SMS уведомлений в реальном времени
            </p>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm bg-white px-4 py-2 rounded-lg shadow">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Авто-обновление (60сек)
            </label>
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 shadow font-semibold"
            >
              {isLoading ? '⏳ Обновляем...' : '🔄 Обновить'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Всего Лидов" value={stats.total_leads} icon="👥" />
            <StatCard label="Email Отправлено" value={stats.email_sent} icon="📧" />
            <StatCard label="Email Открыто" value={stats.email_opened} icon="👀" />
            <StatCard label="SMS Отправлено" value={stats.sms_sent} icon="📱" />
            <StatCard
              label="SMS Доставлено"
              value={stats.sms_delivered}
              icon="✅"
            />
            <StatCard
              label="Визиты на Лендинг"
              value={stats.landing_visited}
              icon="🌐"
            />
            <StatCard label="Email Ошибки" value={stats.email_failed} icon="❌" />
            <StatCard label="SMS Ошибки" value={stats.sms_failed} icon="❌" />
            <StatCard
              label="Лиды с Профтеста"
              value={stats.proftest_leads}
              icon="📝"
            />
          </div>
        )}

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-800">
              Лиды ({leads.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              ⏳ Загрузка лидов...
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Лидов пока нет. Ожидаем завершения профтестов...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b text-sm font-semibold text-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">Имя</th>
                    <th className="px-6 py-4 text-left">Email</th>
                    <th className="px-6 py-4 text-left">Телефон</th>
                    <th className="px-6 py-4 text-center">Статус Email</th>
                    <th className="px-6 py-4 text-center">Статус SMS</th>
                    <th className="px-6 py-4 text-center">Лендинг</th>
                    <th className="px-6 py-4 text-center">Источник</th>
                    <th className="px-6 py-4 text-center">Создано</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead: any) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50 transition text-sm"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {lead.full_name}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{lead.email}</td>
                      <td className="px-6 py-4 text-gray-600">{lead.phone}</td>
                      <td className="px-6 py-4 text-center">
                        {getEmailStatusDisplay(lead)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getSMSStatusDisplay(lead)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {lead.landing_visited ? (
                          <span className="text-blue-600 font-semibold">
                            🌐 {lead.landing_visit_count}x
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {new Date(lead.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

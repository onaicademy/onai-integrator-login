import { useState, useEffect } from 'react';
import { Eye, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TripwireUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  modules_completed: number;
  created_at: string;
  first_login_at: string | null;
  last_active_at: string | null;
  welcome_email_sent: boolean;
}

interface UsersTableProps {
  refreshTrigger: number;
  managerId?: string;
}

export default function UsersTable({ refreshTrigger, managerId }: UsersTableProps) {
  const [users, setUsers] = useState<TripwireUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const statusConfig: Record<
    string,
    { label: string; color: string; bg: string; border: string }
  > = {
    active: {
      label: 'АКТИВЕН',
      color: '#00FF94',
      bg: 'bg-green-500/20',
      border: 'border-green-500/30',
    },
    completed: {
      label: 'ЗАВЕРШИЛ',
      color: '#F59E0B',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/30',
    },
    inactive: {
      label: 'НЕАКТИВЕН',
      color: '#9CA3AF',
      bg: 'bg-gray-500/20',
      border: 'border-gray-500/30',
    },
    blocked: {
      label: 'ЗАБЛОКИРОВАН',
      color: '#EF4444',
      bg: 'bg-red-500/20',
      border: 'border-red-500/30',
    },
  };

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          console.error('No access token');
          return;
        }

        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (managerId) {
          params.append('manager_id', managerId);
        }

        const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
        const response = await fetch(
          `${API_URL}/api/admin/tripwire/users?${params}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setUsers(data.users || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [page, refreshTrigger, managerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#00FF94] text-xl font-['JetBrains_Mono']">
          ЗАГРУЗКА УЧЕНИКОВ...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider"
          style={{ textShadow: '0 0 20px rgba(0, 255, 148, 0.3)' }}
        >
          МОИ УЧЕНИКИ
        </h2>
        <span className="text-sm font-['JetBrains_Mono'] text-[#9CA3AF]">
          /// ВСЕГО: {total}
        </span>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Нет созданных учеников</p>
          <p className="text-sm text-gray-500 mt-2">
            Нажмите "ДОБАВИТЬ УЧЕНИКА" чтобы создать первого пользователя
          </p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4 text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    ФИО
                  </th>
                  <th className="text-left py-4 px-4 text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    EMAIL
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    СТАТУС
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    МОДУЛИ
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    EMAIL ОТПРАВЛЕН
                  </th>
                  <th className="text-center py-4 px-4 text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    ДОБАВЛЕН
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const statusInfo = statusConfig[user.status] || statusConfig.inactive;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">{user.full_name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[#9CA3AF] font-['JetBrains_Mono'] text-sm">
                          {user.email}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-['JetBrains_Mono'] uppercase 
                                     ${statusInfo.bg} border ${statusInfo.border}`}
                            style={{ color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-lg font-bold text-white font-['Space_Grotesk']">
                          {user.modules_completed}
                          <span className="text-[#00FF94]">/3</span>
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {user.welcome_email_sent ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-[#9CA3AF]">
                          {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                НАЗАД
              </button>
              <span className="text-sm text-[#9CA3AF] font-['JetBrains_Mono']">
                Страница {page} из {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ВПЕРЁД
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}


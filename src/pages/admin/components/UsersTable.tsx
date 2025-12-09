import { useState, useEffect } from 'react';
import { Eye, Mail, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { api } from '@/utils/apiClient';
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // 🔥 Get current user email

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
  dateRange?: { from: Date; to: Date };
}

export default function UsersTable({ refreshTrigger, managerId, dateRange }: UsersTableProps) {
  const [users, setUsers] = useState<TripwireUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filteredManagerName, setFilteredManagerName] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null); // 🔥 Current user email
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // User ID being deleted
  const limit = 20;

  // 🔥 Load current user email
  useEffect(() => {
    tripwireSupabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserEmail(session?.user?.email || null);
    });
  }, []);

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
        const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
        if (managerId) {
          params.append('manager_id', managerId);
        }
        if (dateRange) {
          params.append('startDate', dateRange.from.toISOString());
          params.append('endDate', dateRange.to.toISOString());
        }

        const data = await api.get(`/api/admin/tripwire/users?${params}`);
        setUsers(data.users || []);
        setTotal(data.total || 0);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [page, refreshTrigger, managerId, dateRange]);

  // 🔥 DELETE HANDLER (только для smmmcwin@gmail.com)
  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`Удалить студента ${email}?\n\nЭто действие нельзя отменить!`)) {
      return;
    }

    try {
      setIsDeleting(userId);
      console.log(`🗑️ Deleting user: ${userId}`);
      
      await api.delete(`/api/admin/tripwire/users/${userId}`);
      
      console.log('✅ User deleted successfully');
      
      // Обновляем список (удаляем из UI мгновенно)
      setUsers(users.filter(u => u.id !== userId));
      setTotal(total - 1);
      
      // Показываем success message
      alert(`Студент ${email} успешно удален!`);
    } catch (error: any) {
      console.error('❌ Error deleting user:', error);
      alert(`Ошибка при удалении: ${error.message || 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

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
    <div className="space-y-6" id="users-table-section">
      {/* 🎯 ARCHITECT SOLUTION #2: Visual feedback при фильтрации */}
      {managerId && (
        <div className="flex items-center justify-between bg-[#00FF94]/10 border border-[#00FF94]/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-[#00FF94]" />
            <span className="text-white font-['JetBrains_Mono']">
              Показаны ученики выбранного менеджера
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2
          className="text-xl md:text-2xl font-bold text-white font-['JetBrains_Mono'] uppercase tracking-wider break-words"
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
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden">
                <table className="min-w-full w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase whitespace-nowrap">
                        ФИО
                      </th>
                      <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase whitespace-nowrap">
                        EMAIL
                      </th>
                      <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase whitespace-nowrap">
                        СТАТУС
                      </th>
                      <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase whitespace-nowrap">
                        МОДУЛИ
                      </th>
                      <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase whitespace-nowrap hidden md:table-cell">
                        EMAIL ОТПРАВЛЕН
                      </th>
                      <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase whitespace-nowrap">
                        ДОБАВЛЕН
                      </th>
                      {/* 🔥 ДЕЙСТВИЯ - только для admin */}
                      {currentUserEmail === 'smmmcwin@gmail.com' && (
                        <th className="text-center py-3 sm:py-4 px-2 sm:px-4 text-[10px] sm:text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase whitespace-nowrap">
                          ДЕЙСТВИЯ
                        </th>
                      )}
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
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <span className="text-white font-medium text-sm sm:text-base truncate block max-w-[150px] sm:max-w-none">{user.full_name}</span>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <span className="text-[#9CA3AF] font-['JetBrains_Mono'] text-xs sm:text-sm truncate block max-w-[180px] sm:max-w-none">
                          {user.email}
                        </span>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4">
                        <div className="flex justify-center">
                          <span
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-['JetBrains_Mono'] uppercase whitespace-nowrap
                                     ${statusInfo.bg} border ${statusInfo.border}`}
                            style={{ color: statusInfo.color }}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                        <span className="text-base sm:text-lg font-bold text-white font-['JetBrains_Mono']">
                          {user.modules_completed}
                          <span className="text-[#00FF94]">/3</span>
                        </span>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 hidden md:table-cell">
                        <div className="flex justify-center">
                          {user.welcome_email_sent ? (
                            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-2 sm:px-4 text-center">
                        <span className="text-xs sm:text-sm text-[#9CA3AF] whitespace-nowrap">
                          {new Date(user.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </td>
                      {/* 🔥 DELETE BUTTON - только для smmmcwin@gmail.com */}
                      {currentUserEmail === 'smmmcwin@gmail.com' && (
                        <td className="py-4 px-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleDelete(user.id, user.email)}
                              disabled={isDeleting === user.id}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 
                                       hover:border-red-500/60 transition-all duration-200 disabled:opacity-50
                                       disabled:cursor-not-allowed group"
                              title={`Удалить ${user.email}`}
                            >
                              {isDeleting === user.id ? (
                                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-red-500 group-hover:text-red-400 transition-colors" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            </div>
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


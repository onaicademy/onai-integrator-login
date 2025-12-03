import { useState, useEffect } from 'react';
import { Activity, UserPlus, Mail, Edit, Trash2 } from 'lucide-react';
import { Icon } from '@iconify/react';
import { api } from '@/utils/apiClient';

interface ActivityItem {
  id: string;
  action_type: string;
  details: any;
  created_at: string;
}

interface ActivityLogProps {
  refreshTrigger: number;
}

export default function ActivityLog({ refreshTrigger }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const actionConfig: Record<
    string,
    { label: string; icon: any; iconifyIcon: string; color: string }
  > = {
    user_created: {
      label: 'Создан пользователь',
      icon: UserPlus,
      iconifyIcon: 'solar:user-plus-rounded-bold',
      color: '#00FF94',
    },
    email_sent: {
      label: 'Отправлен email',
      icon: Mail,
      iconifyIcon: 'solar:letter-bold',
      color: '#3B82F6',
    },
    status_changed: {
      label: 'Изменен статус',
      icon: Edit,
      iconifyIcon: 'solar:pen-new-square-bold',
      color: '#F59E0B',
    },
    password_reset: {
      label: 'Сброшен пароль',
      icon: Edit,
      iconifyIcon: 'solar:key-minimalistic-square-bold',
      color: '#8B5CF6',
    },
    user_deleted: {
      label: 'Удален пользователь',
      icon: Trash2,
      iconifyIcon: 'solar:trash-bin-trash-bold',
      color: '#EF4444',
    },
  };

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        const data = await api.get('/api/admin/tripwire/activity?limit=20');
        setActivities(data || []);
      } catch (error) {
        console.error('Error loading activity:', error);
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#00FF94] text-xl font-['JetBrains_Mono']">
          ЗАГРУЗКА ИСТОРИИ...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-[#00FF94]" />
        <h2
          className="text-2xl font-bold text-white font-['Space_Grotesk'] uppercase tracking-wider"
          style={{ textShadow: '0 0 20px rgba(0, 255, 148, 0.3)' }}
        >
          ИСТОРИЯ ДЕЙСТВИЙ
        </h2>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Нет записей</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const config =
              actionConfig[activity.action_type] || actionConfig.user_created;

            return (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 bg-white/5 hover:bg-white/10 
                           rounded-xl border border-white/10 transition-all duration-200"
              >
                {/* Icon */}
                <div className="relative mt-1">
                  <div
                    className="absolute inset-0 blur-lg opacity-50"
                    style={{ backgroundColor: config.color }}
                  />
                  <div
                    className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-white/5 to-white/0
                                flex items-center justify-center border border-white/10"
                  >
                    <Icon
                      icon={config.iconifyIcon}
                      style={{ fontSize: '20px', color: config.color }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-white font-medium font-['Space_Grotesk']">
                        {config.label}
                      </p>
                      <div className="mt-1 text-sm text-[#9CA3AF]">
                        {activity.details?.full_name && (
                          <span className="font-['JetBrains_Mono']">
                            {activity.details.full_name}
                          </span>
                        )}
                        {activity.details?.email && (
                          <span className="ml-2 text-xs">
                            ({activity.details.email})
                          </span>
                        )}
                        {activity.details?.new_status && (
                          <span className="ml-2 text-xs">
                            → {activity.details.new_status}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs text-[#9CA3AF] font-['JetBrains_Mono'] whitespace-nowrap">
                      {new Date(activity.created_at).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



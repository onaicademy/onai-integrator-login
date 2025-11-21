# 🔔 ДИЗАЙН СИСТЕМЫ ПУШ-УВЕДОМЛЕНИЙ ДЛЯ AI-НАСТАВНИКА

**Дата:** 21 ноября 2025
**Проект:** onAI Academy - Пуш-уведомления в веб-приложении

---

## 🎯 ЦЕЛЬ СИСТЕМЫ

AI-наставник должен **инициировать диалог** с студентом когда:
- Студент много раз перематывает видео (сложный материал)
- Студент долго не был активен
- Студент близок к достижению
- Streak под угрозой
- Есть новая миссия

---

## 🏗️ АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (Триггеры)                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Событие: Студент пересмотрел урок 5 раз          │ │
│  │  ↓                                                  │ │
│  │  Функция: detect_video_struggle()                  │ │
│  │  ↓                                                  │ │
│  │  Создание задачи в ai_mentor_tasks                 │ │
│  │  ↓                                                  │ │
│  │  Создание уведомления в push_notifications         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↓ Supabase Realtime
┌─────────────────────────────────────────────────────────┐
│                  FRONTEND (React)                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Компонент: NotificationCenter                      │ │
│  │  ↓                                                  │ │
│  │  Подписка на push_notifications (Realtime)         │ │
│  │  ↓                                                  │ │
│  │  Получение уведомления                             │ │
│  │  ↓                                                  │ │
│  │  Показ Toast + Badge + Звук                        │ │
│  │  ↓                                                  │ │
│  │  Клик → Открытие NeuroHub + Чат с AI              │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 ТАБЛИЦА БД: push_notifications

```sql
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип уведомления
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'video_struggle',      -- Студент пересматривает урок
    'inactivity_alert',    -- Долго не был активен
    'achievement_near',    -- Близко к достижению
    'streak_warning',      -- Streak под угрозой
    'new_mission',         -- Новая миссия
    'ai_mentor_message'    -- Общее сообщение от наставника
  )),

  -- Содержимое
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon TEXT, -- Emoji или URL

  -- Действие
  action_type TEXT CHECK (action_type IN ('open_chat', 'open_lesson', 'open_achievements', 'none')),
  action_url TEXT, -- URL для перехода (например, /neurohub?chat=open)

  -- Приоритет
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Статус
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Метаданные
  context_data JSONB, -- { lesson_id, achievement_id, etc }
  ai_mentor_task_id UUID REFERENCES ai_mentor_tasks(id),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_push_notifications_user ON push_notifications(user_id);
CREATE INDEX idx_push_notifications_unread ON push_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_push_notifications_created ON push_notifications(user_id, created_at DESC);

-- RLS политики
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON push_notifications;
CREATE POLICY "Users can view own notifications"
  ON push_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON push_notifications;
CREATE POLICY "Users can update own notifications"
  ON push_notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

---

## 🔧 BACKEND: Создание уведомления при событии

### SQL Функция: create_push_notification

```sql
CREATE OR REPLACE FUNCTION create_push_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_type TEXT DEFAULT 'open_chat',
  p_action_url TEXT DEFAULT '/neurohub',
  p_priority TEXT DEFAULT 'medium',
  p_context_data JSONB DEFAULT NULL,
  p_task_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO push_notifications (
    user_id,
    notification_type,
    title,
    message,
    action_type,
    action_url,
    priority,
    context_data,
    ai_mentor_task_id
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_action_type,
    p_action_url,
    p_priority,
    p_context_data,
    p_task_id
  )
  RETURNING id INTO v_notification_id;

  RAISE NOTICE 'Создано уведомление: %', v_notification_id;
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;
```

### Обновление функции detect_video_struggle:

```sql
CREATE OR REPLACE FUNCTION detect_video_struggle()
RETURNS TRIGGER AS $$
DECLARE
  v_task_id UUID;
  v_notification_id UUID;
  v_lesson_title TEXT;
BEGIN
  -- Если студент перемотал назад 5+ раз
  IF NEW.seeks_count >= 5 THEN
    -- Получаем название урока
    SELECT title INTO v_lesson_title
    FROM lessons
    WHERE id = NEW.lesson_id;

    -- Создаем задачу для AI-наставника
    v_task_id := create_mentor_task_from_video_struggle(
      NEW.user_id,
      NEW.lesson_id,
      NEW.seeks_count,
      NEW.max_second_reached
    );

    -- Создаем пуш-уведомление
    v_notification_id := create_push_notification(
      p_user_id := NEW.user_id,
      p_type := 'video_struggle',
      p_title := '💡 Вижу, урок кажется сложным?',
      p_message := format(
        'Ты пересматривал "%s" несколько раз. Давай я помогу разобраться! 🤝',
        v_lesson_title
      ),
      p_action_type := 'open_chat',
      p_action_url := '/neurohub?chat=open&context=video_struggle',
      p_priority := CASE
        WHEN NEW.seeks_count >= 10 THEN 'high'
        WHEN NEW.seeks_count >= 7 THEN 'medium'
        ELSE 'low'
      END,
      p_context_data := jsonb_build_object(
        'lesson_id', NEW.lesson_id,
        'lesson_title', v_lesson_title,
        'seeks_count', NEW.seeks_count,
        'struggling_at_second', NEW.max_second_reached
      ),
      p_task_id := v_task_id
    );

    RAISE NOTICE 'Создано уведомление о сложности урока: %', v_notification_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## ⚛️ FRONTEND: Компонент NotificationCenter

### 1. Компонент: NotificationCenter.tsx

```typescript
// src/components/NotificationCenter.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface PushNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  icon?: string;
  action_type: string;
  action_url: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_read: boolean;
  context_data?: any;
  created_at: string;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    // Загружаем существующие уведомления
    loadNotifications();

    // Подписываемся на новые уведомления через Realtime
    const subscription = supabase
      .channel('push_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'push_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as PushNotification;

          // Добавляем в список
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Показываем toast
          showNotificationToast(newNotification);

          // Воспроизводим звук
          playNotificationSound(newNotification.priority);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('push_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Ошибка загрузки уведомлений:', error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  };

  const showNotificationToast = (notification: PushNotification) => {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <span className="text-2xl">{notification.icon || '🔔'}</span>
          <span>{notification.title}</span>
        </div>
      ),
      description: notification.message,
      action: notification.action_type === 'open_chat' ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleNotificationClick(notification)}
        >
          Открыть чат
        </Button>
      ) : undefined,
      duration: notification.priority === 'urgent' ? 10000 : 5000,
    });
  };

  const playNotificationSound = (priority: string) => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = priority === 'urgent' ? 0.8 : 0.5;
    audio.play().catch(err => console.log('Звук отключен:', err));
  };

  const handleNotificationClick = async (notification: PushNotification) => {
    // Отмечаем как прочитанное
    await supabase
      .from('push_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notification.id);

    // Обновляем локальное состояние
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Переходим по ссылке
    if (notification.action_url) {
      navigate(notification.action_url);
    }

    setIsOpen(false);
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    await supabase
      .from('push_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      {/* Кнопка уведомлений */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </Button>

      {/* Панель уведомлений */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-zinc-900 border-2 border-[#00ff00]/30 rounded-xl shadow-2xl z-50 max-h-[500px] overflow-hidden"
          >
            {/* Заголовок */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-white font-bold">Уведомления</h3>
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Прочитать все
                </Button>
              )}
            </div>

            {/* Список уведомлений */}
            <div className="overflow-y-auto max-h-96">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Нет уведомлений</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors ${
                      !notification.is_read ? 'bg-[#00ff00]/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {notification.icon || '🔔'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-white font-semibold text-sm">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-[#00ff00] rounded-full" />
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mb-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
  return `${Math.floor(diffMins / 1440)} дн назад`;
}
```

---

### 2. Интеграция в Layout

```typescript
// src/components/Layout.tsx
import { NotificationCenter } from '@/components/NotificationCenter';

export const Layout = ({ children }) => {
  return (
    <div>
      <header className="flex items-center justify-between p-4">
        <Logo />
        <div className="flex items-center gap-4">
          <NotificationCenter /> {/* ← Добавляем сюда */}
          <UserMenu />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
};
```

---

## 🎨 ДИЗАЙН УВЕДОМЛЕНИЙ

### Типы уведомлений с иконками:

| Тип | Иконка | Заголовок | Пример сообщения |
|-----|--------|-----------|------------------|
| **video_struggle** | 💡 | Вижу, урок кажется сложным? | Ты пересматривал "Настройка вебхука" несколько раз. Давай я помогу! |
| **inactivity_alert** | 😢 | Мы скучаем! | Ты не заходил уже 3 дня. Как дела? Могу помочь вернуться к обучению! |
| **achievement_near** | 🏆 | Почти готово! | Осталось всего 2 урока до достижения "Марафонец"! Давай финишируем! |
| **streak_warning** | 🔥 | Не потеряй свой streak! | Сегодня последний день! Пройди хотя бы 1 урок, чтобы сохранить 7-дневный streak. |
| **new_mission** | 🎯 | Новая миссия! | Доступна новая миссия "Завершить модуль 2" (+150 XP). Поехали! |
| **ai_mentor_message** | 🤖 | Сообщение от наставника | Привет! Заметил что ты отлично справляешься. Продолжай в том же духе! |

---

## 🔊 ЗВУКИ

Добавьте файлы звуков в `public/sounds/`:

- `notification.mp3` - Обычное уведомление
- `urgent.mp3` - Срочное уведомление (для streak_warning)
- `achievement.mp3` - При разблокировке достижения

---

## 📊 ПРИМЕРЫ ТРИГГЕРОВ

### 1. Студент не был активен 3 дня

```sql
-- Cron задача (запускается раз в день)
CREATE OR REPLACE FUNCTION check_inactive_students()
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT id, full_name, last_activity_at
    FROM profiles
    WHERE last_activity_at < NOW() - INTERVAL '3 days'
      AND last_activity_at > NOW() - INTERVAL '4 days' -- Отправляем только один раз
  LOOP
    PERFORM create_push_notification(
      p_user_id := v_user.id,
      p_type := 'inactivity_alert',
      p_title := '😢 Мы скучаем!',
      p_message := format('Привет, %s! Ты не заходил уже 3 дня. Как дела? Могу помочь вернуться к обучению!', v_user.full_name),
      p_priority := 'medium'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 2. Студент близок к достижению

```sql
CREATE OR REPLACE FUNCTION check_near_achievements()
RETURNS VOID AS $$
DECLARE
  v_achievement RECORD;
BEGIN
  FOR v_achievement IN
    SELECT
      ua.user_id,
      ua.achievement_id,
      ua.current_value,
      ua.required_value
    FROM user_achievements ua
    WHERE ua.is_completed = false
      AND ua.current_value >= (ua.required_value * 0.9) -- 90% прогресс
      AND ua.current_value < ua.required_value
  LOOP
    PERFORM create_push_notification(
      p_user_id := v_achievement.user_id,
      p_type := 'achievement_near',
      p_title := '🏆 Почти готово!',
      p_message := format(
        'Осталось всего %s до достижения "%s"! Давай финишируем!',
        v_achievement.required_value - v_achievement.current_value,
        v_achievement.achievement_id
      ),
      p_priority := 'high',
      p_action_url := '/neurohub#achievements'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ ИТОГОВЫЙ ЧЕКЛИСТ

### Backend:
- [ ] Применить SQL миграцию для таблицы `push_notifications`
- [ ] Обновить функцию `detect_video_struggle()`
- [ ] Создать функцию `check_inactive_students()`
- [ ] Создать функцию `check_near_achievements()`
- [ ] Настроить cron задачи

### Frontend:
- [ ] Создать компонент `NotificationCenter.tsx`
- [ ] Интегрировать в Layout
- [ ] Добавить звуки в `public/sounds/`
- [ ] Настроить Supabase Realtime подписку
- [ ] Протестировать на разных устройствах

### Тестирование:
- [ ] Пересмотреть урок 5+ раз → должно прийти уведомление
- [ ] Проверить что уведомление кликабельно
- [ ] Проверить что открывается чат
- [ ] Проверить звук
- [ ] Проверить badge с количеством

---

## 🎉 ГОТОВО!

Теперь у вас есть полноценная система пуш-уведомлений! 🚀

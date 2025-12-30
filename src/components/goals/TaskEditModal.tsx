/**
 * Task Edit Modal - Todoist Style
 * ✅ Working priority selector with beautiful flags
 * ✅ Fixed Calendar popover positioning
 * ✅ Working time picker (select dropdown)
 * ✅ Fixed Telegram reminder select (multiple options)
 * ✅ Auto-save with debounce
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar as CalendarIcon, Trash2, Bell, Flag, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/runtime-config';

// 🚩 Priority Levels with Beautiful Flag Icons
export const TASK_PRIORITIES = {
  none: {
    value: 'none',
    label: 'Без приоритета',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    hoverBg: 'hover:bg-gray-500/20',
    icon: '⚪',
    flagColor: 'text-gray-400'
  },
  low: {
    value: 'low',
    label: 'Несрочное',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hoverBg: 'hover:bg-blue-500/20',
    icon: '🔵',
    flagColor: 'text-blue-500'
  },
  medium: {
    value: 'medium',
    label: 'Важно',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    hoverBg: 'hover:bg-yellow-500/20',
    icon: '🟡',
    flagColor: 'text-yellow-500'
  },
  high: {
    value: 'high',
    label: 'Очень важно',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    hoverBg: 'hover:bg-orange-500/20',
    icon: '🟠',
    flagColor: 'text-orange-500'
  },
  urgent: {
    value: 'urgent',
    label: 'Критично',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    hoverBg: 'hover:bg-red-500/20',
    icon: '🔴',
    flagColor: 'text-red-500'
  }
} as const;

// ⏰ Time picker options (every 30 minutes)
const TIME_OPTIONS = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', 
  '03:00', '03:30', '04:00', '04:30', '05:00', '05:30',
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
];

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    priority?: string;
    telegram_reminder?: boolean;
    reminder_before?: number;
    status: 'todo' | 'in_progress' | 'done';
  };
  onUpdate: (taskId: string, updates: any) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

const BACKEND_URL = getApiBaseUrl() || 'http://localhost:3000';
const TELEGRAM_BOT_USERNAME = 'onaimentor_bot';

export function TaskEditModal({ isOpen, onClose, task, onUpdate, onDelete }: TaskEditModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'none');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [dueTime, setDueTime] = useState(
    task.due_date ? format(new Date(task.due_date), 'HH:mm') : '12:00'
  );
  const [telegramReminder, setTelegramReminder] = useState(task.telegram_reminder || false);
  const [reminderBefore, setReminderBefore] = useState(String(task.reminder_before || 30));
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [telegramConnected, setTelegramConnected] = useState(false);

  // 🔄 SYNC STATE WITH PROPS (when task updates from parent)
  useEffect(() => {
    console.log('🔄 Syncing state with task prop:', task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'none');
    setDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setDueTime(task.due_date ? format(new Date(task.due_date), 'HH:mm') : '12:00');
    setTelegramReminder(task.telegram_reminder || false);
    setReminderBefore(String(task.reminder_before || 30));
    setHasChanges(false);
  }, [task.id, isOpen]); // Re-sync when task changes or modal opens

  // Check Telegram connection status
  useEffect(() => {
    if (user?.id && isOpen) {
      // Сразу проверяем статус при открытии
      checkTelegramStatus();
      
      // Затем проверяем каждые 3 секунды (только если модал открыт)
      const interval = setInterval(checkTelegramStatus, 3000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id, isOpen]);

  async function checkTelegramStatus() {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/telegram/status/${user.id}`);
      const data = await res.json();
      console.log('🤖 Telegram status:', data);
      setTelegramConnected(data.connected || false);
    } catch (err) {
      console.error('Failed to fetch Telegram status:', err);
    }
  }

  // Handle Telegram connection
  async function handleTelegramConnect() {
    if (!user?.id) {
      toast.error('Необходимо войти в систему');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/telegram/generate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const { token } = await response.json();
      const telegramUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`;
      window.open(telegramUrl, '_blank');
      toast.success('🤖 Откроется Telegram бот! Нажми START для подключения.');
      
      // 🚀 БЫСТРАЯ ПРОВЕРКА: каждую 1 секунду первые 10 секунд
      let attempts = 0;
      const quickCheck = setInterval(async () => {
        await checkTelegramStatus();
        attempts++;
        if (attempts >= 10 || telegramConnected) {
          clearInterval(quickCheck);
        }
      }, 1000);
    } catch (error) {
      console.error('Ошибка подключения Telegram:', error);
      toast.error('Не удалось подключить Telegram');
    }
  }

  // Track changes
  useEffect(() => {
    const changed = 
      title !== task.title ||
      description !== (task.description || '') ||
      priority !== (task.priority || 'none') ||
      telegramReminder !== (task.telegram_reminder || false) ||
      reminderBefore !== String(task.reminder_before || 30);
    
    console.log('🔍 Tracking changes:', {
      title: title !== task.title,
      description: description !== (task.description || ''),
      priority: priority !== (task.priority || 'none'),
      telegramReminder: telegramReminder !== (task.telegram_reminder || false),
      reminderBefore: reminderBefore !== String(task.reminder_before || 30),
      currentReminderBefore: reminderBefore,
      taskReminderBefore: task.reminder_before,
      hasChanges: changed
    });
    
    setHasChanges(changed);
  }, [title, description, priority, telegramReminder, reminderBefore, task]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasChanges) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 1500); // Save after 1.5 seconds

    return () => clearTimeout(timer);
  }, [title, description, priority, dueDate, dueTime, telegramReminder, reminderBefore, hasChanges]);

  async function handleSave() {
    if (isSaving || !title.trim()) return;

    setIsSaving(true);
    try {
      // Combine date and time
      let finalDueDate: string | null = null;
      if (dueDate) {
        const [hours, minutes] = dueTime.split(':');
        const combinedDate = new Date(dueDate);
        combinedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        finalDueDate = combinedDate.toISOString();
        console.log('💾 Сохраняем дату:', finalDueDate, 'Дата:', dueDate, 'Время:', dueTime);
      }

      const updates = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: finalDueDate,
        telegram_reminder: telegramReminder,
        reminder_before: parseInt(reminderBefore)
      };

      console.log('💾 Сохраняем обновления:', updates);
      await onUpdate(task.id, updates);

      setHasChanges(false);
      toast.success('✅ Сохранено', { duration: 1000 });
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('❌ Ошибка сохранения');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Удалить задачу?')) return;

    try {
      await onDelete(task.id);
      onClose();
      toast.success('🗑️ Удалено');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Ошибка удаления');
    }
  }

  const currentPriority = TASK_PRIORITIES[priority as keyof typeof TASK_PRIORITIES] || TASK_PRIORITIES.none;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Flag 
              className={`w-5 h-5 ${currentPriority.flagColor}`}
              fill="currentColor"
            />
            {task.title}
            {isSaving && (
              <span className="flex items-center gap-1 text-sm text-yellow-400 ml-auto">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                Сохранение...
              </span>
            )}
          </DialogTitle>
          {/* ✅ УБРАН ДУБЛИРУЮЩИЙСЯ КРЕСТИК - используется встроенный из DialogContent */}
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название задачи..."
              className="text-lg font-medium bg-transparent border-0 border-b border-zinc-800 rounded-none px-0 focus-visible:ring-0 focus-visible:border-[#00FF88] text-white placeholder:text-gray-600 transition-colors"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание (опционально)"
              className="min-h-[80px] bg-zinc-900/50 border-zinc-800 text-white placeholder:text-gray-600 focus-visible:border-[#00FF88] resize-none"
              rows={3}
            />
          </div>

          {/* Priority Selector - FIXED! */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <Flag className="w-4 h-4" />
              Приоритет
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(TASK_PRIORITIES).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    console.log('Priority clicked:', p.value);
                    setPriority(p.value);
                    setHasChanges(true);
                  }}
                  className={`
                    p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-2
                    ${priority === p.value 
                      ? `${p.bgColor} ${p.borderColor} ${p.color} scale-105` 
                      : `bg-zinc-900/30 border-zinc-800 text-gray-500 ${p.hoverBg} hover:border-zinc-700`
                    }
                  `}
                >
                  <Flag className={`w-4 h-4 ${priority === p.value ? p.flagColor : 'text-gray-600'}`} />
                  <span className="text-sm font-medium">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time - FIXED! */}
          <div className="grid grid-cols-2 gap-3">
            {/* Date Picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Дата
              </Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${
                      dueDate ? 'text-white bg-zinc-900' : 'text-gray-500 bg-zinc-900/30'
                    } border-zinc-800 hover:bg-zinc-800 hover:border-[#00FF88]/50 transition-colors`}
                  >
                    {dueDate ? format(dueDate, 'd MMM', { locale: ru }) : 'Выбрать'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-auto p-3 bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-zinc-800 shadow-2xl shadow-[#00FF88]/10" 
                  align="start"
                  sideOffset={8}
                  style={{ zIndex: 100001, pointerEvents: 'auto' }}
                >
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      console.log('📅 Дата выбрана:', date);
                      setDueDate(date);
                      setIsCalendarOpen(false);
                      setHasChanges(true);
                      toast.success(`📅 Дата: ${date ? format(date, 'd MMMM', { locale: ru }) : ''}`, { duration: 1500 });
                    }}
                    locale={ru}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-lg border-0"
                    classNames={{
                      months: "space-y-4",
                      month: "space-y-4",
                      caption: "flex justify-center pt-1 relative items-center text-[#00FF88]",
                      caption_label: "text-sm font-medium",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent hover:bg-zinc-800 rounded-md transition-colors",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      table: "w-full border-collapse space-y-1",
                      head_row: "flex",
                      head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                      row: "flex w-full mt-2",
                      cell: "text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                      day: "h-9 w-9 p-0 font-normal hover:bg-zinc-800 hover:text-[#00FF88] rounded-md transition-all",
                      day_selected: "bg-[#00FF88] text-black hover:bg-[#00FF88] hover:text-black font-bold",
                      day_today: "bg-zinc-800 text-white font-semibold",
                      day_outside: "text-gray-600 opacity-50",
                      day_disabled: "text-gray-700 opacity-30",
                      day_hidden: "invisible"
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time Picker - FIXED! */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300">Время</Label>
              <Select 
                value={dueTime} 
                onValueChange={(value) => {
                  console.log('🕐 Время выбрано:', value);
                  setDueTime(value);
                  setHasChanges(true);
                  toast.success(`🕐 Время: ${value}`, { duration: 1000 });
                }}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:border-[#00FF88]/50 transition-all">
                  <SelectValue placeholder="12:00" />
                </SelectTrigger>
                <SelectContent 
                  className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-zinc-800 shadow-xl max-h-[200px]"
                  style={{ zIndex: 100002 }}
                >
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem 
                      key={time} 
                      value={time} 
                      className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors"
                    >
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Telegram Reminder - FIXED! */}
          <div className="space-y-3 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            {!telegramConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Bell className="w-4 h-4" />
                    <span className="text-sm">Telegram напоминание</span>
                  </div>
                  <span className="text-xs text-red-400">❌ Не подключен</span>
                </div>
                <Button
                  type="button"
                  onClick={handleTelegramConnect}
                  className="w-full bg-[#0088cc] hover:bg-[#006699] text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Подключить Telegram бота
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Нажми кнопку → Откроется Telegram → Нажми START
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="telegram"
                    checked={telegramReminder}
                    onCheckedChange={(checked) => {
                      setTelegramReminder(checked as boolean);
                      setHasChanges(true);
                    }}
                    disabled={!telegramConnected}
                    className="border-zinc-700 data-[state=checked]:bg-[#00FF88] data-[state=checked]:border-[#00FF88]"
                  />
                  <Label htmlFor="telegram" className="text-sm text-gray-300 cursor-pointer flex items-center gap-2 flex-1">
                    <Bell className="w-4 h-4" />
                    Telegram напоминание
                  </Label>
                  <span className="text-xs text-[#00FF88]">✓ Подключен</span>
                </div>
              </div>
            )}

            {telegramReminder && (
              <div className="ml-7 space-y-2 animate-in slide-in-from-top-2 duration-300">
                <Label className="text-xs text-gray-400">Напомнить за:</Label>
                <Select 
                  value={reminderBefore} 
                  onValueChange={(value) => {
                    console.log('⏰ Напоминание за:', value, 'минут');
                    setReminderBefore(value);
                    setHasChanges(true);
                    const label = value === '5' ? '5 минут' : value === '10' ? '10 минут' : value === '15' ? '15 минут' : value === '30' ? '30 минут' : value === '60' ? '1 час' : value === '120' ? '2 часа' : '1 день';
                    toast.success(`⏰ Напомнить за: ${label}`, { duration: 1000 });
                  }}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:border-[#00FF88]/50 transition-all">
                    <SelectValue placeholder="30 минут" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-zinc-800 shadow-xl"
                    style={{ zIndex: 100003 }}
                  >
                    <SelectItem value="5" className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors">5 минут</SelectItem>
                    <SelectItem value="10" className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors">10 минут</SelectItem>
                    <SelectItem value="15" className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors">15 минут</SelectItem>
                    <SelectItem value="30" className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors">30 минут</SelectItem>
                    <SelectItem value="60" className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors">1 час</SelectItem>
                    <SelectItem value="120" className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors">2 часа</SelectItem>
                    <SelectItem value="1440" className="text-white focus:bg-zinc-800 focus:text-[#00FF88] cursor-pointer hover:bg-zinc-800/50 transition-colors">1 день</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-zinc-800">
            <Button
              onClick={handleDelete}
              variant="ghost"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить
            </Button>
            <div className="flex-1" />
            <Button
              onClick={onClose}
              className="bg-[#00FF88] hover:bg-[#00cc88] text-black font-medium"
            >
              Готово
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

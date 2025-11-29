import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Star,
  Plus,
  X,
  CheckCircle,
  Clock,
  Circle,
  GripVertical,
  Maximize2,
  Loader2,
  Check,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGoals, createGoal, updateGoal, deleteGoal, completeGoal, Goal, CompleteGoalResponse } from '@/lib/goals-api';
import { toast } from 'sonner';
import { TaskEditModal } from './TaskEditModal';

// ⏰ Time picker options (every 30 minutes) - same as TaskEditModal
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

// ===== DroppableColumn component =====
function DroppableColumn({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}

function SortableTask({ task, isCompact, onDelete, onComplete, onMoveNext, onEdit }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id,
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const statusConfig = {
    todo: { icon: Circle, color: 'text-gray-400', bg: 'bg-zinc-900/70', border: 'border-gray-600', glow: '' },
    in_progress: { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/40', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
    done: { icon: CheckCircle, color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/15', border: 'border-[#00FF88]/60', glow: 'shadow-[0_0_20px_rgba(0,255,136,0.2)]' },
  };

  // ✅ Защита от undefined: используем 'todo' как default
  const config = statusConfig[task?.status as keyof typeof statusConfig] || statusConfig.todo;
  const Icon = config.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onEdit && onEdit(task)}
      className={`
        group p-3 rounded-lg border-2 ${config.border} ${config.bg} ${config.glow}
        hover:border-[#00FF88]/60 transition-all duration-200 cursor-pointer
        ${isDragging ? 'shadow-2xl shadow-[#00FF88]/40 z-50' : ''}
        ${isCompact ? 'flex items-center gap-3' : ''}
        backdrop-blur-sm
      `}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing relative"
          {...attributes}
          {...listeners}
        >
          <GripVertical
            className={`w-5 h-5 transition-all duration-300 ${
              isDragging 
                ? 'text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.8)] scale-110' 
                : 'text-gray-400 group-hover:text-[#00FF88] group-hover:drop-shadow-[0_0_6px_rgba(0,255,136,0.5)]'
            }`}
            strokeWidth={2.5}
          />
          {/* Digital elite dot indicators */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none ${
            isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
          }`}>
            <div className="w-0.5 h-0.5 bg-[#00FF88] rounded-full shadow-[0_0_3px_rgba(0,255,136,0.8)]" />
            <div className="w-0.5 h-0.5 bg-[#00FF88] rounded-full shadow-[0_0_3px_rgba(0,255,136,0.8)]" />
            <div className="w-0.5 h-0.5 bg-[#00FF88] rounded-full shadow-[0_0_3px_rgba(0,255,136,0.8)]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 ${task.status === 'in_progress' ? 'animate-pulse' : ''}`} />
            <span className={`text-white flex-1 truncate ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
              {task.title}
            </span>
            {task.due_date && (
              <span className="text-xs text-gray-400 flex-shrink-0 bg-black/30 px-2 py-1 rounded">
                📅 {new Date(task.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                {' '}🕐 {new Date(task.due_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 ml-7 truncate">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {task.status !== 'done' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              // todo → in_progress → done
              if (task.status === 'in_progress') {
                onComplete(task.id, e);
              } else {
                onMoveNext(task.id);
              }
            }}
            className="h-7 w-7 p-0 text-[#00FF88] hover:bg-[#00FF88]/20 hover:scale-110 transition-all"
            title={task.status === 'todo' ? 'Начать работу' : 'Завершить'}
          >
            <Check className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="h-7 w-7 p-0 text-red-400 hover:bg-red-400/20 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function GoalsTodoSystemDB() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isKanbanOpen, setIsKanbanOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [activeTask, setActiveTask] = useState<Goal | null>(null);
  const [xpAnimation, setXpAnimation] = useState<{ x: number; y: number; amount: number } | null>(null);
  
  // 📅 Для календаря и времени
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState<string>('12:00');
  // ❌ Telegram настройки убраны из формы создания - теперь только в TaskEditModal!
  const [editingTask, setEditingTask] = useState<Goal | null>(null); // For edit modal
  
  // ❌ Telegram настройки убраны из формы создания - теперь только в TaskEditModal!

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user?.id) {
      loadGoals();
    }
  }, [user?.id]);

  async function loadGoals() {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const loadedGoals = await getUserGoals(user.id);
      setGoals(loadedGoals);
    } catch (error) {
      console.error('Ошибка загрузки целей:', error);
      toast.error('Не удалось загрузить цели');
    } finally {
      setIsLoading(false);
    }
  }

  async function addGoal() {
    if (!newGoalTitle.trim() || !user?.id) return;

    try {
      // Объединяем дату и время
      let finalDueDate = undefined;
      if (dueDate && dueTime) {
        const [hours, minutes] = dueTime.split(':');
        const combinedDate = new Date(dueDate);
        combinedDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        finalDueDate = combinedDate.toISOString();
      }

      const newGoal = await createGoal({
        user_id: user.id,
        title: newGoalTitle,
        status: 'todo',
        due_date: finalDueDate,
        // ❌ Telegram настройки не передаются при создании (будут в TaskEditModal)
      });
      
      setGoals([newGoal, ...goals]);
      setNewGoalTitle('');
      setDueDate(undefined);
      setDueTime('12:00');
      // ❌ Telegram настройки убраны (теперь только в TaskEditModal)
      
      toast.success('Цель создана!');
    } catch (error) {
      console.error('Ошибка создания цели:', error);
      toast.error('Не удалось создать цель');
    }
  }

  async function deleteGoalById(id: string) {
    try {
      await deleteGoal(id);
      setGoals(goals.filter(g => g.id !== id));
      toast.success('Цель удалена');
    } catch (error) {
      console.error('Ошибка удаления цели:', error);
      toast.error('Не удалось удалить цель');
    }
  }

  async function moveGoalToNext(id: string) {
    try {
      const goal = goals.find(g => g.id === id);
      if (!goal) return;

      const nextStatus = goal.status === 'todo' ? 'in_progress' : 'done';
      
      if (nextStatus === 'done') {
        await completeGoalById(id);
      } else {
        const updatedGoal = await updateGoal(id, { status: nextStatus });
        setGoals(goals.map(g => g.id === id ? updatedGoal : g));
        toast.success(nextStatus === 'in_progress' ? '⚡ В работе!' : 'Статус обновлен');
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      toast.error('Не удалось обновить статус');
    }
  }

  async function completeGoalById(id: string, event?: React.MouseEvent) {
    try {
      const response = await completeGoal(id);
      setGoals(goals.map(g => g.id === id ? response.goal : g));
      
      // Показываем XP анимацию ТОЛЬКО если это первое использование Kanban
      if (response.is_first_use_bonus && event) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setXpAnimation({
          x: rect.left + rect.width / 2,
          y: rect.top,
          amount: response.xp_awarded
        });
        setTimeout(() => setXpAnimation(null), 2000);
      }
      
      // Показываем разные сообщения
      if (response.is_first_use_bonus) {
        toast.success(`🎉 Первая цель выполнена! Бонус: +${response.xp_awarded} XP за использование Kanban!`);
      } else {
        toast.success('✅ Цель выполнена!');
      }
    } catch (error) {
      console.error('Ошибка выполнения цели:', error);
      toast.error('Не удалось выполнить цель');
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    setActiveTask(goals.find(g => g.id === active.id) || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    console.log('🎯 handleDragEnd:', { activeId: active.id, overId: over?.id, overData: over?.data });
    setActiveTask(null);

    if (!over) {
      console.warn('❌ over is null - не удалось определить целевую колонку');
      return;
    }

    const activeId = active.id as string;
    const activeGoal = goals.find(g => g.id === activeId);
    
    if (!activeGoal) return;

    let newStatus = activeGoal.status;
    
    if (over.id === 'todo' || over.id === 'in_progress' || over.id === 'done') {
      newStatus = over.id as 'todo' | 'in_progress' | 'done';
    } else {
      const overGoal = goals.find(g => g.id === over.id);
      if (overGoal) {
        newStatus = overGoal.status;
      }
    }

    if (activeGoal.status === newStatus) return;

    // 🚀 OPTIMISTIC UPDATE: Мгновенное обновление UI перед API запросом
    const previousGoals = [...goals]; // Сохраняем для rollback
    const optimisticGoal = { ...activeGoal, status: newStatus };
    setGoals(goals.map(g => g.id === activeId ? optimisticGoal : g));

    try {
      if (newStatus === 'done') {
        await completeGoalById(activeId);
        // toast уже показан в completeGoalById
      } else {
        await updateGoal(activeId, { status: newStatus });
        toast.success(newStatus === 'in_progress' ? '⚡ В работе!' : '📝 Запланировано');
      }
    } catch (error) {
      // ⏪ ROLLBACK: Возвращаем предыдущее состояние при ошибке
      console.error('Ошибка обновления статуса:', error);
      setGoals(previousGoals);
      toast.error('Не удалось обновить статус');
    }
  }

  const tasksByStatus = {
    todo: goals.filter(g => g.status === 'todo'),
    in_progress: goals.filter(g => g.status === 'in_progress'),
    done: goals.filter(g => g.status === 'done'),
  };

  if (isLoading) {
    return (
      <Card className="border-[#00FF88]/30 bg-black/50 backdrop-blur-md h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00FF88] animate-spin" />
      </Card>
    );
  }

  return (
    <>
      <Card className="border-[#00FF88]/30 bg-black/50 backdrop-blur-md relative overflow-hidden h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-[#00FF88]" />
              Мои цели
              <span className="text-xs text-gray-500 font-normal ml-2">
                ({goals.filter(g => g.status !== 'done').length} активных)
              </span>
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsKanbanOpen(true)}
              className="text-[#00FF88] hover:bg-[#00FF88]/10 flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Канбан</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-2">
              <SortableContext items={goals.map(g => g.id)} strategy={verticalListSortingStrategy}>
                {goals.slice(0, 3).map(goal => (
                  <SortableTask
                    key={goal.id}
                    task={goal}
                    isCompact={true}
                    onDelete={deleteGoalById}
                    onComplete={(id: string, e: React.MouseEvent) => completeGoalById(id, e)}
                    onMoveNext={moveGoalToNext}
                    onEdit={(task: Goal) => setEditingTask(task)}
                  />
                ))}
              </SortableContext>

              {goals.length > 3 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  +{goals.length - 3} еще... <button onClick={() => setIsKanbanOpen(true)} className="text-[#00FF88] hover:underline">Открыть все</button>
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Добавить новую цель..."
                  className="flex-1 bg-zinc-900/50 border-[#00FF88]/30 text-white text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                />
                <Button
                  size="icon"
                  onClick={addGoal}
                  className="bg-[#00FF88] hover:bg-[#00cc88] text-black h-9 w-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="p-3 rounded-lg border border-[#00FF88]/50 bg-zinc-900 shadow-2xl shadow-[#00FF88]/30">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]" strokeWidth={2.5} />
                    <p className="text-white">{activeTask.title}</p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>

      {xpAnimation && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -100, scale: 1.5 }}
          className="fixed z-[9999] pointer-events-none text-[#00FF88] font-bold text-3xl"
          style={{ left: xpAnimation.x, top: xpAnimation.y }}
        >
          +{xpAnimation.amount} XP
        </motion.div>
      )}

      <Dialog open={isKanbanOpen} onOpenChange={setIsKanbanOpen}>
        <DialogContent className="max-w-7xl h-[90vh] bg-gradient-to-br from-black via-zinc-950 to-black border-[#00FF88]/30 text-white overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b border-[#00FF88]/20 bg-gradient-to-r from-[#00FF88]/5 to-transparent">
            <DialogTitle className="text-white flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-[#00FF88] animate-pulse" />
                <span className="text-xl font-bold">Мои цели - Канбан доска</span>
                <span className="text-sm text-gray-500 font-normal">
                  ({goals.length} задач)
                </span>
              </div>
              <div className="text-sm text-gray-400 font-normal bg-zinc-900/50 p-3 rounded-lg border border-[#00FF88]/20">
                <p className="mb-2">
                  <span className="text-[#00FF88] font-semibold">📋 Что это?</span> Канбан - это твой личный планировщик задач!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-gray-400" />
                    <span><b>Запланировано</b> - новые задачи</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-[#00FF88]" />
                    <span><b>В работе</b> - делаешь сейчас</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-[#00FF88]" />
                    <span><b>Завершено</b> - готово! ✅</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  💡 <b>Как пользоваться:</b> Перетаскивай задачи между колонками или нажми галочку для завершения. За первое использование Kanban получишь <span className="text-[#00FF88]">+20 XP</span>!
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 overflow-y-auto h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="mb-6 space-y-3 p-4 rounded-lg bg-zinc-900/30 border border-[#00FF88]/20">
                <div className="flex gap-2">
                  <Input
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="Название цели..."
                    className="flex-1 bg-zinc-900/50 border-[#00FF88]/30 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                  />
                  <Button
                    size="icon"
                    onClick={addGoal}
                    className="bg-[#00FF88] hover:bg-[#00cc88] text-black"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-3 items-center flex-wrap">
                  {/* Календарь - PREMIUM STYLE */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`text-sm h-9 ${
                          dueDate 
                            ? 'text-white bg-zinc-900 border-[#00FF88]/50' 
                            : 'text-gray-400 bg-zinc-900/50 border-zinc-800 hover:border-[#00FF88]/30'
                        } transition-all`}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {dueDate ? format(dueDate, 'dd.MM.yyyy', { locale: ru }) : 'Дата'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-3 bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-zinc-800 shadow-2xl shadow-[#00FF88]/10 pointer-events-auto" 
                      style={{ zIndex: 150000, pointerEvents: 'auto' }}
                      sideOffset={8}
                      align="start"
                      avoidCollisions={false}
                    >
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(date) => {
                          setDueDate(date);
                          toast.success(`📅 Дата: ${date ? format(date, 'd MMMM', { locale: ru }) : ''}`, { duration: 1500 });
                        }}
                        locale={ru}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-lg border-0 pointer-events-auto"
                        style={{ pointerEvents: 'auto' }}
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
                          day_today: "bg-cyan-500 text-black font-bold",
                          day_outside: "text-gray-600 opacity-50",
                          day_disabled: "text-gray-700 opacity-30",
                          day_range_middle: "aria-selected:bg-zinc-800 aria-selected:text-white",
                          day_hidden: "invisible",
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Time picker - PREMIUM SELECT */}
                  <Select 
                    value={dueTime} 
                    onValueChange={(value) => {
                      setDueTime(value);
                      toast.success(`🕐 Время: ${value}`, { duration: 1000 });
                    }}
                  >
                    <SelectTrigger className="w-32 h-9 text-sm bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:border-[#00FF88]/50 transition-all">
                      <Clock className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="12:00" />
                    </SelectTrigger>
                    <SelectContent 
                      className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-zinc-800 shadow-xl max-h-[200px]"
                      style={{ zIndex: 150001 }}
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

              <div className="block lg:hidden">
                <Tabs defaultValue="in_progress" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50">
                    <TabsTrigger value="todo" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black">
                      <Circle className="w-3 h-3 mr-1.5" />
                      TODO ({tasksByStatus.todo.length})
                    </TabsTrigger>
                    <TabsTrigger value="in_progress" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black">
                      <Clock className="w-3 h-3 mr-1.5" />
                      В работе ({tasksByStatus.in_progress.length})
                    </TabsTrigger>
                    <TabsTrigger value="done" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black">
                      <CheckCircle className="w-3 h-3 mr-1.5" />
                      Done ({tasksByStatus.done.length})
                    </TabsTrigger>
                  </TabsList>

                  {(['todo', 'in_progress', 'done'] as const).map(status => (
                    <TabsContent key={status} value={status} className="mt-4 space-y-2">
                      <SortableContext items={tasksByStatus[status].map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tasksByStatus[status].map(goal => (
                          <SortableTask
                            key={goal.id}
                            task={goal}
                            isCompact={false}
                            onDelete={deleteGoalById}
                            onComplete={(id: string, e: React.MouseEvent) => completeGoalById(id, e)}
                            onMoveNext={moveGoalToNext}
                            onEdit={(task: Goal) => setEditingTask(task)}
                          />
                        ))}
                      </SortableContext>
                      {tasksByStatus[status].length === 0 && (
                        <p className="text-center text-gray-500 py-8">Нет задач</p>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="hidden lg:grid lg:grid-cols-3 gap-6">
                {(['todo', 'in_progress', 'done'] as const).map((status) => {
                  const configs = {
                    todo: { 
                      title: 'Запланировано', 
                      icon: Circle, 
                      color: 'text-gray-400', 
                      border: 'border-gray-700', 
                      bg: 'bg-gradient-to-b from-zinc-900/50 to-zinc-900/30',
                      headerBg: 'bg-gradient-to-r from-zinc-800 to-zinc-900',
                      emoji: '📝'
                    },
                    in_progress: { 
                      title: 'В работе', 
                      icon: Clock, 
                      color: 'text-orange-500', 
                      border: 'border-orange-500/30', 
                      bg: 'bg-gradient-to-b from-orange-500/10 to-orange-500/5',
                      headerBg: 'bg-gradient-to-r from-orange-500/20 to-orange-500/10',
                      emoji: '🔥'
                    },
                    done: { 
                      title: 'Завершено', 
                      icon: CheckCircle, 
                      color: 'text-[#00FF88]', 
                      border: 'border-[#00FF88]/50', 
                      bg: 'bg-gradient-to-b from-[#00FF88]/15 to-[#00FF88]/10',
                      headerBg: 'bg-gradient-to-r from-[#00FF88]/30 to-[#00FF88]/20',
                      emoji: '🎉'
                    },
                  };
                  const config = configs[status];
                  const Icon = config.icon;

                  return (
                    <motion.div 
                      key={status} 
                      className="space-y-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: status === 'todo' ? 0 : status === 'in_progress' ? 0.1 : 0.2 }}
                    >
                      <div className={`rounded-lg p-3 sticky top-0 z-10 backdrop-blur-sm ${config.headerBg} border ${config.border}`}>
                        <h3 className={`text-sm font-bold ${config.color} flex items-center justify-between`}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {config.emoji} {config.title}
                          </span>
                          <span className="text-xs bg-black/30 px-2 py-1 rounded-full">
                            {tasksByStatus[status].length}
                          </span>
                        </h3>
                      </div>
                      <DroppableColumn
                        id={status}
                        className={`min-h-[450px] p-4 rounded-xl border-2 border-dashed ${config.border} ${config.bg} space-y-3 backdrop-blur-sm transition-all duration-300 hover:border-[#00FF88]/50`}
                      >
                        <SortableContext items={tasksByStatus[status].map(t => t.id)} strategy={verticalListSortingStrategy}>
                          <AnimatePresence>
                            {tasksByStatus[status].map((goal, idx) => (
                              <motion.div
                                key={goal.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <SortableTask
                                  task={goal}
                                  isCompact={false}
                                  onDelete={deleteGoalById}
                                  onComplete={(id: string, e: React.MouseEvent) => completeGoalById(id, e)}
                                  onMoveNext={moveGoalToNext}
                                  onEdit={(task: Goal) => setEditingTask(task)}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </SortableContext>
                        {tasksByStatus[status].length === 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-[200px] text-gray-500"
                          >
                            <Icon className="w-12 h-12 mb-2 opacity-30" />
                            <p className="text-sm">Нет задач</p>
                          </motion.div>
                        )}
                      </DroppableColumn>
                    </motion.div>
                  );
                })}
              </div>

              <DragOverlay>
                {activeTask ? (
                  <div className="p-3 rounded-lg border border-[#00FF88]/50 bg-zinc-900 shadow-2xl shadow-[#00FF88]/30">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-5 h-5 text-[#00FF88] drop-shadow-[0_0_8px_rgba(0,255,136,0.8)]" strokeWidth={2.5} />
                      <p className="text-white">{activeTask.title}</p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Edit Modal */}
      {editingTask && (
        <TaskEditModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onUpdate={async (taskId, updates) => {
            // 🔑 ИСПРАВЛЕНИЕ: Сохраняем результат updateGoal
            const updatedTask = await updateGoal(taskId, updates);
            
            // Обновляем goals массив
            setGoals(goals.map(g => g.id === taskId ? updatedTask : g));
            
            // ✅ ВАЖНО: Обновляем editingTask чтобы modal получил свежие данные!
            setEditingTask(updatedTask);
            
            console.log('✅ Task updated and editingTask synced:', updatedTask);
          }}
          onDelete={async (taskId) => {
            await deleteGoalById(taskId);
            setEditingTask(null);
          }}
        />
      )}
    </>
  );
}


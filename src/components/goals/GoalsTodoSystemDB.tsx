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
} from 'lucide-react';
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
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGoals, createGoal, updateGoal, deleteGoal, completeGoal, Goal } from '@/lib/goals-api';
import { toast } from 'sonner';

function SortableTask({ task, isCompact, onDelete, onComplete }: any) {
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
    in_progress: { icon: Clock, color: 'text-[#00ff00]', bg: 'bg-[#00ff00]/10', border: 'border-[#00ff00]/40', glow: 'shadow-[0_0_15px_rgba(0,255,0,0.15)]' },
    done: { icon: CheckCircle, color: 'text-[#00ff00]', bg: 'bg-[#00ff00]/15', border: 'border-[#00ff00]/60', glow: 'shadow-[0_0_20px_rgba(0,255,0,0.2)]' },
  };

  const config = statusConfig[task.status as keyof typeof statusConfig];
  const Icon = config.icon;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className={`
        group p-3 rounded-lg border-2 ${config.border} ${config.bg} ${config.glow}
        hover:border-[#00ff00]/60 transition-all duration-200
        ${isDragging ? 'shadow-2xl shadow-[#00ff00]/40 z-50 scale-105 rotate-2' : ''}
        ${isCompact ? 'flex items-center gap-3' : ''}
        backdrop-blur-sm
      `}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical
            className={`w-4 h-4 text-gray-600 transition-all duration-200 ${
              isDragging ? 'opacity-100 text-[#00ff00]' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
        </div>
        <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 ${task.status === 'in_progress' ? 'animate-pulse' : ''}`} />
        <span className={`text-white flex-1 truncate ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
          {task.title}
        </span>
        {task.due_date && (
          <span className="text-xs text-gray-400 flex-shrink-0 bg-black/30 px-2 py-1 rounded">
            📅 {new Date(task.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {task.status !== 'done' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id, e);
            }}
            className="h-7 w-7 p-0 text-[#00ff00] hover:bg-[#00ff00]/20 hover:scale-110 transition-all"
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
    </motion.div>
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
      const newGoal = await createGoal({
        user_id: user.id,
        title: newGoalTitle,
        status: 'todo',
      });
      setGoals([newGoal, ...goals]);
      setNewGoalTitle('');
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

  async function completeGoalById(id: string, event?: React.MouseEvent) {
    try {
      const updatedGoal = await completeGoal(id);
      setGoals(goals.map(g => g.id === id ? updatedGoal : g));
      
      if (event) {
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        setXpAnimation({
          x: rect.left + rect.width / 2,
          y: rect.top,
          amount: 20
        });
        setTimeout(() => setXpAnimation(null), 2000);
      }
      
      toast.success('🎉 Цель выполнена! +20 XP');
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
    setActiveTask(null);

    if (!over) return;

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

    try {
      if (newStatus === 'done') {
        await completeGoalById(activeId);
      } else {
        const updatedGoal = await updateGoal(activeId, { status: newStatus });
        setGoals(goals.map(g => g.id === activeId ? updatedGoal : g));
        toast.success('Статус обновлен');
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
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
      <Card className="border-[#00ff00]/30 bg-black/50 backdrop-blur-md h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00ff00] animate-spin" />
      </Card>
    );
  }

  return (
    <>
      <Card className="border-[#00ff00]/30 bg-black/50 backdrop-blur-md relative overflow-hidden h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-[#00ff00]" />
              Мои цели
              <span className="text-xs text-gray-500 font-normal ml-2">
                ({goals.filter(g => g.status !== 'done').length} активных)
              </span>
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsKanbanOpen(true)}
              className="text-[#00ff00] hover:bg-[#00ff00]/10 flex items-center gap-1.5"
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
                  />
                ))}
              </SortableContext>

              {goals.length > 3 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  +{goals.length - 3} еще... <button onClick={() => setIsKanbanOpen(true)} className="text-[#00ff00] hover:underline">Открыть все</button>
                </p>
              )}

              <div className="flex gap-2 mt-4">
                <Input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Добавить новую цель..."
                  className="flex-1 bg-zinc-900/50 border-[#00ff00]/30 text-white text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                />
                <Button
                  size="icon"
                  onClick={addGoal}
                  className="bg-[#00ff00] hover:bg-[#00cc00] text-black h-9 w-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="p-3 rounded-lg border border-[#00ff00]/50 bg-zinc-900 shadow-2xl shadow-[#00ff00]/30">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-500" />
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
          className="fixed z-[9999] pointer-events-none text-[#00ff00] font-bold text-3xl"
          style={{ left: xpAnimation.x, top: xpAnimation.y }}
        >
          +{xpAnimation.amount} XP
        </motion.div>
      )}

      <Dialog open={isKanbanOpen} onOpenChange={setIsKanbanOpen}>
        <DialogContent className="max-w-7xl h-[90vh] bg-gradient-to-br from-black via-zinc-950 to-black border-[#00ff00]/30 text-white overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b border-[#00ff00]/20 bg-gradient-to-r from-[#00ff00]/5 to-transparent">
            <DialogTitle className="text-white flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Star className="w-6 h-6 text-[#00ff00] animate-pulse" />
                <span className="text-xl font-bold">Мои цели - Канбан доска</span>
                <span className="text-sm text-gray-500 font-normal">
                  ({goals.length} задач)
                </span>
              </div>
              <div className="text-sm text-gray-400 font-normal bg-zinc-900/50 p-3 rounded-lg border border-[#00ff00]/20">
                <p className="mb-2">
                  <span className="text-[#00ff00] font-semibold">📋 Что это?</span> Канбан - это твой личный планировщик задач!
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-gray-400" />
                    <span><b>Запланировано</b> - новые задачи</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-[#00ff00]" />
                    <span><b>В работе</b> - делаешь сейчас</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-[#00ff00]" />
                    <span><b>Завершено</b> - готово! +XP</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  💡 <b>Как пользоваться:</b> Перетаскивай задачи между колонками или нажми галочку для завершения. За каждую выполненную цель получаешь <span className="text-[#00ff00]">+20 XP</span>!
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
              <div className="flex gap-2 mb-6">
                <Input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Добавить новую цель..."
                  className="flex-1 bg-zinc-900/50 border-[#00ff00]/30 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                />
                <Button
                  size="icon"
                  onClick={addGoal}
                  className="bg-[#00ff00] hover:bg-[#00cc00] text-black"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="block lg:hidden">
                <Tabs defaultValue="in_progress" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50">
                    <TabsTrigger value="todo" className="data-[state=active]:bg-[#00ff00] data-[state=active]:text-black">
                      <Circle className="w-3 h-3 mr-1.5" />
                      TODO ({tasksByStatus.todo.length})
                    </TabsTrigger>
                    <TabsTrigger value="in_progress" className="data-[state=active]:bg-[#00ff00] data-[state=active]:text-black">
                      <Clock className="w-3 h-3 mr-1.5" />
                      В работе ({tasksByStatus.in_progress.length})
                    </TabsTrigger>
                    <TabsTrigger value="done" className="data-[state=active]:bg-[#00ff00] data-[state=active]:text-black">
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
                            onComplete={completeGoalById}
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
                      color: 'text-[#00ff00]', 
                      border: 'border-[#00ff00]/30', 
                      bg: 'bg-gradient-to-b from-[#00ff00]/10 to-[#00ff00]/5',
                      headerBg: 'bg-gradient-to-r from-[#00ff00]/20 to-[#00ff00]/10',
                      emoji: '⚡'
                    },
                    done: { 
                      title: 'Завершено', 
                      icon: CheckCircle, 
                      color: 'text-[#00ff00]', 
                      border: 'border-[#00ff00]/50', 
                      bg: 'bg-gradient-to-b from-[#00ff00]/15 to-[#00ff00]/10',
                      headerBg: 'bg-gradient-to-r from-[#00ff00]/30 to-[#00ff00]/20',
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
                      <div
                        id={status}
                        className={`min-h-[450px] p-4 rounded-xl border-2 border-dashed ${config.border} ${config.bg} space-y-3 backdrop-blur-sm transition-all duration-300 hover:border-[#00ff00]/50`}
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
                                  onComplete={completeGoalById}
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
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <DragOverlay>
                {activeTask ? (
                  <div className="p-3 rounded-lg border border-[#00ff00]/50 bg-zinc-900 shadow-2xl shadow-[#00ff00]/30">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-gray-500" />
                      <p className="text-white">{activeTask.title}</p>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


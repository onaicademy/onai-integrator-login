import { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Calendar,
  CheckCircle,
  Clock,
  Circle,
  GripVertical,
  Maximize2,
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
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 🎯 Типы
type TaskStatus = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate?: string;
  createdAt: string;
}

// 🎨 Компонент задачи для Drag & Drop
interface SortableTaskProps {
  task: Task;
  isCompact: boolean;
  onDelete: (id: string) => void;
  onEditDate: (id: string, date: string) => void;
}

function SortableTask({ task, isCompact, onDelete, onEditDate }: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusConfig = {
    todo: { icon: Circle, color: 'text-gray-400', bg: 'bg-zinc-900/50', border: 'border-gray-600' },
    in_progress: { icon: Clock, color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/5', border: 'border-[#00FF88]/30' },
    done: { icon: CheckCircle, color: 'text-[#00FF88]', bg: 'bg-[#00FF88]/10', border: 'border-[#00FF88]/50' },
  };

  const config = statusConfig[task.status];
  const Icon = config.icon;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`
        group p-3 rounded-lg border ${config.border} ${config.bg}
        hover:border-[#00FF88]/40 transition-all duration-200
        ${isDragging ? 'shadow-2xl shadow-[#00FF88]/30 z-50' : ''}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {!isCompact && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity pt-1"
          >
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
        )}

        {/* Status Icon */}
        <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-white ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>
            {task.title}
          </p>
          
          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center gap-1 mt-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="date"
                value={task.dueDate}
                onChange={(e) => onEditDate(task.id, e.target.value)}
                className="text-xs text-gray-400 bg-transparent border-none outline-none cursor-pointer hover:text-[#00FF88]"
              />
            </div>
          )}
        </div>

        {/* Delete Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 h-6 w-6 p-0"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// 🎯 Главный компонент TODO системы
export function GoalsTodoSystem() {
  const [isKanbanOpen, setIsKanbanOpen] = useState(false); // Попап вместо isExpanded
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Пройти 3 урока на этой неделе', status: 'in_progress', dueDate: '2025-11-29', createdAt: new Date().toISOString() },
    { id: '2', title: 'Сдать все домашки вовремя', status: 'todo', dueDate: '2025-11-30', createdAt: new Date().toISOString() },
    { id: '3', title: 'Сдать связку по Make n8n', status: 'in_progress', createdAt: new Date().toISOString() },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // 🎯 Drag & Drop sensors
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

  // 📊 Группировка задач по статусам
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  // ➕ Добавить задачу
  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      status: 'todo',
      createdAt: new Date().toISOString(),
    };
    
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  // ❌ Удалить задачу
  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // 📅 Изменить дату
  const editDate = (id: string, date: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, dueDate: date } : t));
  };

  // 🔄 Drag & Drop
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Если перетащили на колонку - меняем статус
    if (over.id === 'todo' || over.id === 'in_progress' || over.id === 'done') {
      setTasks(tasks.map(t => 
        t.id === active.id ? { ...t, status: over.id as TaskStatus } : t
      ));
      return;
    }

    // Если перетащили на другую задачу - меняем порядок
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      setTasks(arrayMove(tasks, oldIndex, newIndex));
    }
  };

  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <>
      {/* 📋 КОМПАКТНЫЙ ВИД - Основная карточка */}
      <Card className="border-[#00FF88]/30 bg-black/50 backdrop-blur-md relative overflow-hidden h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-[#00FF88]" />
              Мои цели
              <span className="text-xs text-gray-500 font-normal ml-2">
                ({tasks.filter(t => t.status !== 'done').length} активных)
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
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.slice(0, 3).map(task => (
                  <SortableTask
                    key={task.id}
                    task={task}
                    isCompact={true}
                    onDelete={deleteTask}
                    onEditDate={editDate}
                  />
                ))}
              </SortableContext>

              {tasks.length > 3 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  +{tasks.length - 3} еще... <button onClick={() => setIsKanbanOpen(true)} className="text-[#00FF88] hover:underline">Открыть все</button>
                </p>
              )}

              {/* Добавить задачу */}
              <div className="flex gap-2 mt-4">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Добавить новую цель..."
                  className="flex-1 bg-zinc-900/50 border-[#00FF88]/30 text-white text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                />
                <Button
                  size="icon"
                  onClick={addTask}
                  className="bg-[#00FF88] hover:bg-[#00cc88] text-black h-9 w-9"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeTask ? (
                <div className="p-3 rounded-lg border border-[#00FF88]/50 bg-zinc-900 shadow-2xl shadow-[#00FF88]/30">
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

      {/* 🚀 ПОПАП КАНБАН - Полноэкранный на мобильных, модальный на десктопе */}
      <Dialog open={isKanbanOpen} onOpenChange={setIsKanbanOpen}>
        <DialogContent className="max-w-7xl h-[90vh] bg-black border-[#00FF88]/30 text-white overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b border-[#00FF88]/20">
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <Star className="w-6 h-6 text-[#00FF88]" />
              Мои цели - Канбан доска
              <span className="text-sm text-gray-500 font-normal ml-2">
                ({tasks.length} задач)
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 overflow-y-auto h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Добавить задачу */}
              <div className="flex gap-2 mb-6">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Добавить новую цель..."
                  className="flex-1 bg-zinc-900/50 border-[#00FF88]/30 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && addTask()}
                />
                <Button
                  size="icon"
                  onClick={addTask}
                  className="bg-[#00FF88] hover:bg-[#00cc88] text-black"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* 📱 МОБИЛЬНЫЙ ВИД - Табы */}
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

                  <TabsContent value="todo" className="mt-4 space-y-2">
                    <SortableContext items={tasksByStatus.todo.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasksByStatus.todo.map(task => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          isCompact={false}
                          onDelete={deleteTask}
                          onEditDate={editDate}
                        />
                      ))}
                    </SortableContext>
                    {tasksByStatus.todo.length === 0 && (
                      <p className="text-center text-gray-500 py-8">Нет запланированных задач</p>
                    )}
                  </TabsContent>

                  <TabsContent value="in_progress" className="mt-4 space-y-2">
                    <SortableContext items={tasksByStatus.in_progress.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasksByStatus.in_progress.map(task => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          isCompact={false}
                          onDelete={deleteTask}
                          onEditDate={editDate}
                        />
                      ))}
                    </SortableContext>
                    {tasksByStatus.in_progress.length === 0 && (
                      <p className="text-center text-gray-500 py-8">Нет задач в работе</p>
                    )}
                  </TabsContent>

                  <TabsContent value="done" className="mt-4 space-y-2">
                    <SortableContext items={tasksByStatus.done.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasksByStatus.done.map(task => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          isCompact={false}
                          onDelete={deleteTask}
                          onEditDate={editDate}
                        />
                      ))}
                    </SortableContext>
                    {tasksByStatus.done.length === 0 && (
                      <p className="text-center text-gray-500 py-8">Нет завершенных задач</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* 💻 ДЕСКТОП ВИД - Канбан колонки */}
              <div className="hidden lg:grid lg:grid-cols-3 gap-4">
                {/* TODO */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2 sticky top-0 bg-black py-2">
                    <Circle className="w-4 h-4" />
                    Запланировано ({tasksByStatus.todo.length})
                  </h3>
                  <div
                    id="todo"
                    className="min-h-[400px] p-3 rounded-lg border border-dashed border-gray-700 bg-zinc-900/30 space-y-2"
                  >
                    <SortableContext items={tasksByStatus.todo.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasksByStatus.todo.map(task => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          isCompact={false}
                          onDelete={deleteTask}
                          onEditDate={editDate}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </div>

                {/* IN PROGRESS */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#00FF88] flex items-center gap-2 sticky top-0 bg-black py-2">
                    <Clock className="w-4 h-4" />
                    В работе ({tasksByStatus.in_progress.length})
                  </h3>
                  <div
                    id="in_progress"
                    className="min-h-[400px] p-3 rounded-lg border border-dashed border-[#00FF88]/30 bg-[#00FF88]/5 space-y-2"
                  >
                    <SortableContext items={tasksByStatus.in_progress.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasksByStatus.in_progress.map(task => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          isCompact={false}
                          onDelete={deleteTask}
                          onEditDate={editDate}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </div>

                {/* DONE */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-[#00FF88] flex items-center gap-2 sticky top-0 bg-black py-2">
                    <CheckCircle className="w-4 h-4" />
                    Завершено ({tasksByStatus.done.length})
                  </h3>
                  <div
                    id="done"
                    className="min-h-[400px] p-3 rounded-lg border border-dashed border-[#00FF88]/50 bg-[#00FF88]/10 space-y-2"
                  >
                    <SortableContext items={tasksByStatus.done.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {tasksByStatus.done.map(task => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          isCompact={false}
                          onDelete={deleteTask}
                          onEditDate={editDate}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </div>
              </div>

              {/* Drag Overlay */}
              <DragOverlay>
                {activeTask ? (
                  <div className="p-3 rounded-lg border border-[#00FF88]/50 bg-zinc-900 shadow-2xl shadow-[#00FF88]/30">
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


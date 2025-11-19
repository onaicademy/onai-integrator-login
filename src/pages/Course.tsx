import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ModuleCard } from "@/components/course/ModuleCard";
import { CourseStats } from "@/components/course/CourseStats";
import { AIChatDialog } from "@/components/profile/v2/AIChatDialog";
import { ModuleEditDialog } from "@/components/admin/ModuleEditDialog";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { api } from "@/utils/apiClient";
import { toast } from 'sonner';
import {
  DoorOpen,
  MessagesSquare,
  Cable,
  Workflow,
  Network,
  FileCheck,
  Megaphone,
  CreditCard,
  Gift,
  Users,
  Download,
  Bot,
  Plus,
  GripVertical
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// 🎯 Sortable Module Component для Drag & Drop
interface SortableModuleProps {
  module: any;
  index: number;
  onModuleClick: (moduleId: number) => void;
  onDelete: (moduleId: number, moduleTitle: string) => void;
  isAdmin: boolean;
}

function SortableModule({ module, index, onModuleClick, onDelete, isAdmin }: SortableModuleProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Определяем иконку по умолчанию
  const Icon = DoorOpen; // Можно добавить логику выбора иконки

  return (
    <div ref={setNodeRef} style={style} className={`relative group ${isDragging ? 'z-50' : ''}`}>
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        {isAdmin && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-[#00ff00] transition-colors p-2"
            title="Перетащить для изменения порядка"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}
        
        <div className="flex-1">
          <ModuleCard
            id={module.id}
            title={module.title}
            description={module.description}
            progress={module.progress || 0}
            icon={Icon}
            index={index}
            lessons={module.lessons?.length || module.total_lessons}
            duration={module.formatted_duration}
            stats={module.stats}
            onClick={() => onModuleClick(module.id)}
          />
        </div>
      </div>

      {/* Admin: Delete Button (Overlay) */}
      {isAdmin && (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(module.id, module.title);
          }}
          className="absolute top-4 right-4 z-[102] bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-xl px-3 py-2 transition-all"
          title="Удалить модуль"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hover:scale-110 transition-transform"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" x2="10" y1="11" y2="17" />
            <line x1="14" x2="14" y1="11" y2="17" />
          </svg>
        </Button>
      )}
    </div>
  );
}

// ✅ Мок-данные удалены - используем только данные из Supabase API

const Course = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  // ✅ ЗАЩИТА: Проверка на undefined id
  if (!id) {
    console.error('❌ Course.tsx: id is undefined');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Ошибка</h1>
          <p className="text-gray-400 mb-6">ID курса не указан</p>
          <Button onClick={() => navigate('/courses')} className="bg-[#00ff00] text-black">
            Вернуться к курсам
          </Button>
        </div>
      </div>
    );
  }

  // 🔍 ДИАГНОСТИКА
  useEffect(() => {
    console.log('🔥 Course.tsx - id:', id);
    console.log('🔥 Course.tsx - userRole:', userRole);
    console.log('🔥 Course.tsx - isAdmin:', isAdmin);
  }, [id, userRole, isAdmin]);

  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; module: any | null }>({ 
    open: false, 
    module: null 
  });
  const [apiModules, setApiModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Загрузить модули из API
  useEffect(() => {
    if (id) {
      loadModulesFromAPI();
    }
  }, [id]);

  const loadModulesFromAPI = async () => {
    if (!id) {
      setError('ID курса не указан');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // ✅ Загружаем модули из API с сортировкой по order_index
      const response = await api.get(`/api/courses/${id}`);
      
      if (response?.course?.modules) {
        // ✅ Сортируем модули по order_index (на случай если API не отсортировал)
        const sortedModules = [...response.course.modules].sort((a, b) => {
          const orderA = a.order_index ?? a.id ?? 0;
          const orderB = b.order_index ?? b.id ?? 0;
          return orderA - orderB;
        });
        
        setApiModules(sortedModules);
        console.log('✅ Загружено модулей:', sortedModules.length);
        console.log('📊 Порядок модулей:', sortedModules.map(m => ({ id: m.id, order_index: m.order_index, title: m.title })));
      } else {
        // ✅ Если модулей нет - показываем пустой список (не ошибку)
        setApiModules([]);
        console.log('ℹ️ Модули не найдены для курса:', id);
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки модулей:', error);
      setError(error?.message || 'Не удалось загрузить модули курса');
      setApiModules([]); // ✅ При ошибке показываем пустой список
    } finally {
      setLoading(false);
    }
  };

  const handleModuleClick = (moduleId: number) => {
    if (!id) {
      console.error('❌ Cannot navigate: id is undefined');
      return;
    }
    navigate(`/course/${id}/module/${moduleId}`);
  };

  const handleAddModule = () => {
    console.log('=======================================');
    console.log('🔥 handleAddModule вызвана');
    console.log('🔥 courseId:', id);
    console.log('🔥 moduleDialog before:', moduleDialog);
    console.log('=======================================');
    
    setModuleDialog({ open: true, module: null });
    
    console.log('✅ setModuleDialog вызван с open: true');
  };

  const handleSaveModule = async (data: { title: string; description?: string }) => {
    if (!id) {
      toast.error('ID курса не указан');
      return;
    }

    try {
      console.log('💾 Сохранение модуля:', data);
      
      // Создать модуль через API
      const courseId = parseInt(id);
      if (isNaN(courseId)) {
        throw new Error('Некорректный ID курса');
      }

      const response = await api.post('/api/modules', {
        ...data,
        course_id: courseId
      });

      console.log('✅ Модуль создан:', response);
      alert('✅ Модуль успешно создан!');
      
      // Обновить список модулей
      await loadModulesFromAPI();
      
      // ModuleEditDialog сам закроет диалог
    } catch (error: any) {
      console.error('❌ Ошибка сохранения модуля:', error);
      alert(`❌ Ошибка: ${error?.message || 'Не удалось создать модуль'}`);
      throw error;
    }
  };

  const handleDeleteModule = async (moduleId: number, moduleTitle: string) => {
    if (!confirm(`❌ Вы уверены, что хотите удалить модуль "${moduleTitle}"?\n\nВсе уроки, видео и материалы будут удалены. Это действие нельзя отменить.`)) {
      return;
    }
    
    try {
      console.log('=======================================');
      console.log('🗑️ Удаление модуля:', moduleId);
      console.log('🗑️ Название:', moduleTitle);
      console.log('=======================================');
      
      await api.delete(`/api/modules/${moduleId}`);
      
      toast.success(`Модуль "${moduleTitle}" удалён!`);
      
      // Обновить список модулей
      await loadModulesFromAPI();
      
    } catch (error: any) {
      console.error('❌ Ошибка удаления модуля:', error);
      toast.error('Не удалось удалить модуль', {
        description: error.response?.data?.error || error?.message || 'Попробуйте еще раз'
      });
    }
  };

  // 🎯 Drag & Drop handler для модулей
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = apiModules.findIndex((m) => m.id === active.id);
    const newIndex = apiModules.findIndex((m) => m.id === over.id);

    console.log('🔥 Drag ended (modules):', {
      moduleId: active.id,
      from: oldIndex,
      to: newIndex,
    });

    // Оптимистичное обновление UI
    const reorderedModules = arrayMove(apiModules, oldIndex, newIndex).map(
      (module, idx) => ({
        ...module,
        order_index: idx,
      })
    );
    setApiModules(reorderedModules);

    // Обновление в БД
    try {
      const response = await api.put('/api/modules/reorder', {
        modules: reorderedModules.map((m, idx) => ({
          id: m.id,
          order_index: idx,
        })),
      });

      if (response.data?.success) {
        console.log('✅ Порядок модулей обновлён в БД');
        toast.success('Порядок модулей обновлён');
      } else {
        throw new Error('Backend не вернул success');
      }
    } catch (error: any) {
      console.error('❌ Ошибка обновления порядка модулей:', error);
      // Откат изменений
      await loadModulesFromAPI();
      toast.error('Не удалось изменить порядок модулей', {
        description: error?.response?.data?.error || error?.message || 'Попробуйте еще раз'
      });
    }
  };

  // ✅ Обработка состояний загрузки и ошибок
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00ff00] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Загрузка курса...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Ошибка загрузки</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => loadModulesFromAPI()} className="bg-[#00ff00] text-black">
              Попробовать снова
            </Button>
            <Button onClick={() => navigate('/courses')} variant="outline" className="border-gray-600 text-white">
              Вернуться к курсам
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Neural Network Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Floating Neural Nodes */}
        {Array.from({ length: 30 }).map((_, i) => {
          const size = 2 + Math.random() * 4;
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          const duration = 10 + Math.random() * 20;
          
          return (
            <motion.div
              key={`node-${i}`}
              className="absolute rounded-full bg-[#00ff00]"
              style={{
                width: size,
                height: size,
                left: `${x}%`,
                top: `${y}%`,
                boxShadow: `0 0 ${size * 4}px rgba(0, 255, 0, 0.6)`,
              }}
              animate={{
                x: [0, Math.random() * 40 - 20, 0],
                y: [0, Math.random() * 40 - 20, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 5,
              }}
            />
          );
        })}
        
        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00ff00" stopOpacity="0" />
              <stop offset="50%" stopColor="#00ff00" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00ff00" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {Array.from({ length: 15 }).map((_, i) => {
            const x1 = Math.random() * 100;
            const y1 = Math.random() * 100;
            const x2 = Math.random() * 100;
            const y2 = Math.random() * 100;
            
            return (
              <motion.line
                key={`line-${i}`}
                x1={`${x1}%`}
                y1={`${y1}%`}
                x2={`${x2}%`}
                y2={`${y2}%`}
                stroke="url(#lineGradient)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 0],
                  opacity: [0, 0.4, 0],
                }}
                transition={{
                  duration: 8 + Math.random() * 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: Math.random() * 3,
                }}
              />
            );
          })}
        </svg>
        
        {/* Data Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-[#00ff00] rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, -200, -300],
              x: [0, Math.random() * 50 - 25],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 6,
            }}
          />
        ))}
      </div>

      {/* Shooting Stars / Comets - BURST EFFECT */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {Array.from({ length: 5 }).map((_, i) => {
          const startX = Math.random() * 100;
          const startY = Math.random() * 80;
          const angle = 30 + Math.random() * 40;
          const duration = 0.8 + Math.random() * 0.4;
          const delay = Math.random() * 0.3;
          const size = 4 + Math.random() * 3;
          const tailLength = 120 + Math.random() * 80;
          
          return (
            <motion.div
              key={`comet-${i}`}
              className="absolute"
              style={{
                left: `${startX}%`,
                top: `${startY}%`,
              }}
              initial={{ opacity: 0 }}
              animate={{
                x: [0, Math.cos(angle * Math.PI / 180) * 1500],
                y: [0, Math.sin(angle * Math.PI / 180) * 1500],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration,
                repeat: Infinity,
                ease: "easeIn",
                delay,
                repeatDelay: 7,
              }}
            >
              {/* Star head - MASSIVE */}
              <div
                className="absolute bg-white rounded-full"
                style={{
                  width: size,
                  height: size,
                  boxShadow: `
                    0 0 ${size * 6}px rgba(255, 255, 255, 1),
                    0 0 ${size * 3}px rgba(220, 220, 255, 0.8),
                    0 0 ${size}px rgba(255, 255, 255, 1)
                  `,
                }}
              />
              {/* Tail - MASSIVE */}
              <motion.div
                className="absolute top-0 left-0 origin-left"
                style={{
                  width: tailLength,
                  height: 3,
                  background: 'linear-gradient(90deg, rgba(240, 240, 255, 0.8) 0%, rgba(200, 200, 230, 0.5) 30%, rgba(160, 160, 200, 0.3) 60%, transparent 100%)',
                  transform: `rotate(${180 - angle}deg)`,
                  filter: 'blur(1px)',
                  boxShadow: '0 0 8px rgba(200, 200, 240, 0.4)',
                }}
              />
            </motion.div>
          );
        })}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        {/* Hero Banner */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="relative bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] rounded-3xl overflow-hidden border border-[#00ff00]/20 p-8 sm:p-10 md:p-12 lg:p-16">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 20% 50%, rgba(0, 255, 0, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 80% 50%, rgba(0, 255, 0, 0.2) 0%, transparent 50%)
                  `
                }}
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>

            {/* Green Glow Effect */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00ff00]/10 rounded-full blur-3xl" />
            
            {/* Hero Content */}
            <div className="relative z-10 max-w-3xl">
              {/* Top Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-[#00ff00]/10 border border-[#00ff00]/30 rounded-full px-4 py-2 mb-6"
              >
                <span className="w-2 h-2 bg-[#00ff00] rounded-full animate-pulse" />
                <p className="text-xs sm:text-sm text-[#00ff00] font-semibold uppercase tracking-wide">
                  Самый полный курс по автоматизации при помощи нейросетей
                </p>
              </motion.div>

              {/* Main Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 sm:mb-8 text-white font-gilroy leading-tight"
              >
                Интегратор{" "}
                <span className="relative inline-block">
                  <span className="text-[#00ff00] relative z-10">2.0</span>
                  <motion.span
                    className="absolute inset-0 bg-[#00ff00] blur-xl opacity-50"
                    animate={{
                      opacity: [0.3, 0.6, 0.3],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </span>
              </motion.h1>

              {/* AI Curator Button - КРЕАТИВНЫЙ */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  size="lg" 
                  onClick={() => setIsAIChatOpen(true)}
                  className="group relative bg-black/40 backdrop-blur-sm border-2 border-[#00ff00]/30 hover:border-[#00ff00]/60 hover:bg-black/60 text-white font-bold text-base md:text-lg px-8 md:px-10 py-4 md:py-5 rounded-2xl transition-all duration-500 w-full sm:w-auto overflow-hidden"
                  aria-label="AI Куратор"
                >
                  {/* Subtle shimmer effect - раз в 5 секунд */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: '-200%' }}
                    animate={{ x: '200%' }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatDelay: 3.5,
                      ease: "easeInOut"
                    }}
                  />
                  
                  <div className="relative flex items-center gap-3">
                    {/* AI indicator - пульсирующая линия вместо робота */}
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="w-0.5 h-5 bg-[#00ff00] rounded-full"
                        animate={{
                          height: [20, 12, 20],
                          opacity: [1, 0.4, 1],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                      <motion.div
                        className="w-0.5 h-3 bg-[#00ff00] rounded-full"
                        animate={{
                          height: [12, 20, 12],
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.2
                        }}
                      />
                      <motion.div
                        className="w-0.5 h-4 bg-[#00ff00] rounded-full"
                        animate={{
                          height: [16, 10, 16],
                          opacity: [0.8, 0.5, 0.8],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: 0.4
                        }}
                      />
                    </div>
                    
                    {/* Gradient text */}
                    <span className="bg-gradient-to-r from-[#00ff00] via-[#00ff00] to-[#00cc00] bg-clip-text text-transparent font-extrabold tracking-wide">
                      AI Куратор
                    </span>
                    
                    {/* Typing cursor effect */}
                    <motion.div
                      className="w-0.5 h-5 bg-[#00ff00] rounded-full"
                      animate={{
                        opacity: [1, 0, 1],
                      }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "steps(2)"
                      }}
                    />
                  </div>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Modules Section */}
          <section className="lg:col-span-2" aria-labelledby="modules-heading">
            <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
              <h2 id="modules-heading" className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight">
                Модули курса
              </h2>
              
              {/* Admin: Add Module Button */}
              {isAdmin && (
                <div className="relative z-[100]">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔥 КНОПКА "ДОБАВИТЬ МОДУЛЬ" НАЖАТА!');
                      handleAddModule();
                    }}
                    onMouseDown={(e) => {
                      console.log('🖱️ MOUSEDOWN на кнопке "Добавить модуль"!');
                    }}
                    type="button"
                    className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    style={{ zIndex: 101, pointerEvents: 'auto' }}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Добавить модуль</span>
                    <span className="sm:hidden">Модуль</span>
                  </Button>
                </div>
              )}
            </div>
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={apiModules.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {apiModules.length > 0 ? (
                    apiModules.map((module, index) => (
                    <SortableModule
                      key={module.id}
                      module={module}
                      index={index}
                      onModuleClick={handleModuleClick}
                      onDelete={handleDeleteModule}
                      isAdmin={isAdmin}
                    />
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400 mb-4">Модули не найдены</p>
                      {isAdmin && (
                        <Button onClick={handleAddModule} className="bg-[#00ff00] text-black">
                          <Plus className="w-4 h-4 mr-2" />
                          Добавить первый модуль
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-4 sm:space-y-6 lg:pt-[60px]" aria-label="Дополнительная информация">
            {/* Course Materials */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#00ff00] rounded-2xl p-3 sm:p-4 md:p-6"
              aria-labelledby="materials-heading"
            >
              <h3 id="materials-heading" className="text-xs sm:text-sm md:text-base font-bold text-black mb-2 sm:mb-3 md:mb-4 uppercase leading-tight">
                договор-оферта курса интегратор 2.0
              </h3>
              <Button 
                className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl mb-2 sm:mb-3 md:mb-4 text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                aria-label="Посмотреть договор-оферту"
              >
                <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="truncate">Посмотреть договор-оферту</span>
              </Button>
              <div className="text-black text-[10px] sm:text-xs md:text-sm mb-2 sm:mb-3 md:mb-4 leading-tight">
                <p className="font-semibold">Режим работы общего чата</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold">10:00—22:00</p>
              </div>
              <Button 
                className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                aria-label="Перейти в общий чат"
              >
                <span className="truncate">Перейти в общий чат</span>
              </Button>
            </motion.section>

            {/* Schedule */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#1a1a24] border border-gray-800 rounded-2xl p-3 sm:p-4 md:p-6"
              aria-labelledby="schedule-heading"
            >
              <h3 id="schedule-heading" className="text-sm sm:text-base md:text-lg font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-tight">
                Расписание Zoom-созвонов
              </h3>
              <div className="space-y-1.5 sm:space-y-2 md:space-y-3" role="list">
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00ff00] flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm leading-tight">Каждый понедельник в 20:00</span>
                </div>
                <div className="flex items-center gap-2" role="listitem">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#00ff00] flex-shrink-0" />
                  <span className="text-gray-400 text-[10px] sm:text-xs md:text-sm leading-tight">Каждый четверг в 14:00</span>
                </div>
              </div>
            </motion.section>

            {/* Curators */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
              aria-labelledby="curators-heading"
            >
              <h3 id="curators-heading" className="sr-only">Кураторы</h3>
              
              {/* Curator 1 */}
              <div className="bg-[#00ff00] rounded-2xl p-3 sm:p-4 md:p-6" role="listitem">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-[#00ff00] font-bold text-sm sm:text-base md:text-lg">Е</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Куратор</p>
                    <p className="font-bold text-black text-base sm:text-lg md:text-xl truncate leading-tight">Ерке</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                  aria-label="Написать куратору Ерке"
                >
                  <span className="truncate">Написать куратору</span>
                </Button>
              </div>

              {/* Curator 2 */}
              <div className="bg-[#00ff00] rounded-2xl p-3 sm:p-4 md:p-6" role="listitem">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
                  <div 
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <span className="text-[#00ff00] font-bold text-sm sm:text-base md:text-lg">Р</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Куратор</p>
                    <p className="font-bold text-black text-base sm:text-lg md:text-xl truncate leading-tight">Раймжан</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-black/70 leading-tight">Онлайн 10:00–22:00</p>
                  </div>
                </div>
                <Button 
                  className="w-full bg-black text-[#00ff00] hover:bg-black/90 font-bold rounded-xl text-[10px] sm:text-xs md:text-sm h-8 sm:h-9 md:h-10"
                  aria-label="Написать куратору Раймжан"
                >
                  <span className="truncate">Написать куратору</span>
                </Button>
              </div>
            </motion.section>
          </aside>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 sm:mt-12 md:mt-16 text-center px-4"
          role="contentinfo"
        >
          <p className="text-[10px] sm:text-xs md:text-sm text-gray-400 leading-relaxed">
            Powered by Neural Education Systems © 2025
          </p>
        </motion.footer>
      </div>

      {/* AI Chat Dialog */}
      <AIChatDialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen} />
      
      {/* Admin: Module Edit Dialog */}
      {isAdmin && (
        <ModuleEditDialog
          open={moduleDialog.open}
          onClose={() => setModuleDialog({ open: false, module: null })}
          onSave={handleSaveModule}
          module={moduleDialog.module}
          courseId={id ? Number(id) : 0}
        />
      )}
    </div>
  );
};

export default Course;

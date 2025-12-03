import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LessonEditDialog } from "@/components/admin/LessonEditDialog";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { api } from "@/utils/apiClient";
import { 
  PlayCircle, 
  CheckCircle2, 
  Circle, 
  Clock,
  ChevronLeft,
  FileText,
  Plus,
  BookOpen,
  Edit,
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
import { toast } from 'sonner';

// ✅ Мок-данные удалены - используем только данные из Supabase API

// 🎯 Sortable Lesson Component для Drag & Drop
interface SortableLessonProps {
  lesson: any;
  index: number;
  onLessonClick: (id: number, status: string) => void;
  onEdit: (lesson: any) => void;
  onDelete: (id: number, title: string) => void;
  isAdmin: boolean;
}

function SortableLesson({ lesson, index, onLessonClick, onEdit, onDelete, isAdmin }: SortableLessonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const lessonStatus = lesson.status || 'active';

  return (
    <motion.article
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        relative overflow-hidden rounded-2xl border transition-all duration-300 group
        ${isDragging ? 'z-50 shadow-2xl shadow-[#00FF88]/30 border-[#00FF88]/60' : ''}
        ${lessonStatus === "active"
          ? "border-[#00FF88]/40 bg-[#00FF88]/5 shadow-lg shadow-[#00FF88]/10"
          : lessonStatus === "completed"
          ? "border-gray-800 bg-[#0a0a0f]"
          : "border-gray-800 bg-[#0a0a0f] opacity-60"}
        ${lessonStatus !== "locked" ? "cursor-pointer hover:border-[#00FF88]/40 hover:bg-[#00FF88]/5" : "cursor-not-allowed"}
      `}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-4">
          {/* Drag Handle (только для admin) */}
          {isAdmin && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="w-5 h-5 text-[#00FF88]/60 hover:text-[#00FF88]" />
            </div>
          )}

          {/* Lesson Number Badge */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/30 shrink-0">
            <span className="text-lg font-bold text-[#00FF88]">
              {index + 1}
            </span>
          </div>

          {/* Content */}
          <div
            className="flex-1 min-w-0"
            onClick={() => onLessonClick(lesson.id, lessonStatus)}
          >
            <h3 className="text-base sm:text-lg font-bold text-white mb-1 truncate">
              {lesson.title}
            </h3>
            {lesson.duration && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{lesson.duration}</span>
              </div>
            )}
          </div>

          {/* Admin Buttons */}
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(lesson);
                }}
                className="bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/20 border border-[#00FF88]/30"
                title="Редактировать урок"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(lesson.id, lesson.title);
                }}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 hover:border-red-500/50"
                title="Удалить урок"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
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
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

const Module = () => {
  // 🚨 ЭКСТРЕННАЯ ДИАГНОСТИКА - САМОЕ ПЕРВОЕ!
  console.log('='.repeat(80));
  console.log('🚨 MODULE.TSX ЗАГРУЗИЛСЯ! TIMESTAMP:', new Date().toISOString());
  console.log('🌐 URL:', window.location.href);
  console.log('='.repeat(80));
  
  const { id, moduleId } = useParams();
  console.log('📍 useParams() результат:', { id, moduleId });
  
  const navigate = useNavigate();
  console.log('🧭 navigate готов');
  
  let userRole, isAdmin;
  try {
    const auth = useAuth();
    userRole = auth.userRole;
    isAdmin = userRole === 'admin';
    console.log('✅ useAuth() успешно:', { userRole, isAdmin });
  } catch (error) {
    console.error('❌ useAuth() упал с ошибкой:', error);
    userRole = null;
    isAdmin = false;
  }
  
  // 🔍 ДИАГНОСТИКА
  useEffect(() => {
    console.log('🔥 Module.tsx - userRole:', userRole);
    console.log('🔥 Module.tsx - isAdmin:', isAdmin);
    console.log('🔥 Module.tsx - moduleId:', moduleId);
  }, [userRole, isAdmin, moduleId]);
  
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; lesson: any | null }>({ 
    open: false, 
    lesson: null 
  });
  const [apiLessons, setApiLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lessonProgress, setLessonProgress] = useState<Record<number, boolean>>({});
  
  // 🎯 Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Перетаскивание начнётся после движения на 8px
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // ✅ Состояния для модуля и уроков
  const [module, setModule] = useState<any>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);

  // ✅ Загрузка прогресса пользователя по урокам (определяем ДО использования)
  const loadLessonProgress = async () => {
    if (!moduleId) return;
    
    try {
      const response = await api.get(`/api/lessons/progress/${moduleId}`);
      if (response?.progress) {
        setLessonProgress(response.progress);
        console.log('✅ Прогресс загружен:', response.progress);
      }
    } catch (error: any) {
      console.error('❌ Ошибка загрузки прогресса:', error);
      // Не критично, продолжаем работу
    }
  };

  // 🔍 Отслеживаем изменения lessonDialog
  useEffect(() => {
    console.log('🔄 lessonDialog изменился:', lessonDialog);
    console.log('🔄 lessonDialog.open:', lessonDialog.open);
    console.log('🔄 lessonDialog.lesson:', lessonDialog.lesson);
  }, [lessonDialog]);

  // ✅ Загрузить модуль из API
  useEffect(() => {
    if (moduleId) {
      loadModuleFromAPI();
    }
  }, [moduleId]);

  // ✅ Загрузить уроки из API (для всех пользователей, не только админов)
  useEffect(() => {
    if (moduleId) {
      loadLessonsFromAPI();
    }
  }, [moduleId]);

  const loadModuleFromAPI = async () => {
    if (!moduleId) {
      setModuleError('ID модуля не указан');
      return;
    }

    try {
      setLoading(true);
      setModuleError(null);
      
      console.log('🔍 ===== ЗАГРУЗКА МОДУЛЯ =====');
      console.log('📌 Module ID:', moduleId);
      console.log('📌 Module ID type:', typeof moduleId);
      
      const response = await api.get(`/api/modules/${moduleId}`);
      console.log('📦 Полный ответ API:', response);
      console.log('📦 response.module:', response?.module);
      
      if (response?.module) {
        setModule(response.module);
        console.log('✅ Модуль загружен:', response.module);
        console.log('✅ Модуль установлен в state:', response.module.id, response.module.title);
      } else {
        console.warn('⚠️ Модуль не найден в ответе API');
        setModuleError('Модуль не найден');
      }
      
      console.log('🔍 ===== ЗАГРУЗКА МОДУЛЯ ЗАВЕРШЕНА =====');
    } catch (error: any) {
      console.error('❌ Ошибка загрузки модуля:', error);
      console.error('❌ Детали ошибки:', error?.response || error?.message);
      setModuleError(error?.message || 'Не удалось загрузить модуль');
    } finally {
      setLoading(false);
    }
  };

  const loadLessonsFromAPI = async () => {
    if (!moduleId) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 ===== ЗАГРУЗКА УРОКОВ =====');
      console.log('📌 Module ID:', moduleId);
      
      const response = await api.get(`/api/lessons?module_id=${moduleId}`);
      console.log('📦 Полный ответ API:', response);
      console.log('📦 response.lessons:', response?.lessons);
      
      if (response?.lessons) {
        const lessons = response.lessons;
        console.log('📊 Уроки ДО сортировки:', lessons.map((l: any) => ({ id: l.id, order_index: l.order_index, title: l.title })));
        
        // ✅ Вычисляем duration_minutes из video_content для каждого урока (если не установлено)
        const lessonsWithDuration = lessons.map((lesson: any) => {
          if (!lesson.duration_minutes || lesson.duration_minutes === 0) {
            if (lesson.video_content && Array.isArray(lesson.video_content) && lesson.video_content.length > 0) {
              const video = lesson.video_content[0];
              if (video.duration_seconds && video.duration_seconds > 0) {
                // 🔥 FIX: Округляем ВВЕРХ (Math.ceil) чтобы даже короткие видео учитывались
                lesson.duration_minutes = Math.ceil(video.duration_seconds / 60);
                console.log(`📹 Frontend: Вычислена длительность для урока ${lesson.id}: ${lesson.duration_minutes} минут (из ${video.duration_seconds} секунд)`);
              }
            }
          }
          return lesson;
        });
        
        // ✅ Дополнительная сортировка на фронте (API уже сортирует, но на всякий случай)
        const sortedLessons = [...lessonsWithDuration].sort((a, b) => {
          const orderA = a.order_index ?? a.id ?? 0;
          const orderB = b.order_index ?? b.id ?? 0;
          return orderA - orderB;
        });
        
        console.log('📊 Уроки ПОСЛЕ сортировки:', sortedLessons.map(l => ({ id: l.id, order_index: l.order_index, title: l.title, duration_minutes: l.duration_minutes })));
        
        setApiLessons(sortedLessons);
        console.log('✅ Загружено уроков:', sortedLessons.length);
        console.log('✅ apiLessons установлен:', sortedLessons.length, 'уроков');
        
        // Загружаем прогресс пользователя
        loadLessonProgress();
      } else {
        console.warn('⚠️ Уроки не найдены в ответе API');
        setApiLessons([]);
        console.log('ℹ️ Уроки не найдены для модуля:', moduleId);
      }
      
      console.log('🔍 ===== ЗАГРУЗКА УРОКОВ ЗАВЕРШЕНА =====');
    } catch (error: any) {
      console.error('❌ Ошибка загрузки уроков:', error);
      console.error('❌ Детали ошибки:', error?.response || error?.message);
      setApiLessons([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Обработка состояний загрузки модуля
  if (loading && !module) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00FF88] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-white">Загрузка модуля...</p>
        </div>
      </div>
    );
  }

  // ✅ Показываем ошибку ТОЛЬКО после завершения загрузки
  if (!loading && (moduleError || !module)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Модуль не найден</h1>
          <p className="text-gray-400 mb-6">{moduleError || 'Модуль с указанным ID не существует'}</p>
          <Button onClick={() => navigate(`/course/${id}`)} className="bg-[#00FF88] text-black">
            Вернуться к курсу
          </Button>
        </div>
      </div>
    );
  }
  
  const handleAddLesson = () => {
    console.log('=======================================');
    console.log('🔥 handleAddLesson вызвана');
    console.log('🔥 moduleId:', moduleId);
    console.log('🔥 moduleId type:', typeof moduleId);
    console.log('🔥 isAdmin:', isAdmin);
    console.log('🔥 lessonDialog before:', lessonDialog);
    console.log('=======================================');
    
    try {
      setLessonDialog({ open: true, lesson: null });
      console.log('✅ setLessonDialog вызван с open: true');
      
      // Проверяем через небольшую задержку
      setTimeout(() => {
        console.log('🔍 lessonDialog после обновления:', lessonDialog);
      }, 100);
    } catch (error) {
      console.error('❌ Ошибка в handleAddLesson:', error);
    }
  };

  const handleEditLesson = (lesson: any) => {
    console.log('=======================================');
    console.log('🔥 handleEditLesson вызвана');
    console.log('🔥 lesson:', lesson);
    console.log('🔥 lesson.id:', lesson?.id);
    console.log('🔥 lesson.title:', lesson?.title);
    console.log('=======================================');
    
    setLessonDialog({ 
      open: true, 
      lesson: lesson // ✅ Передаём ВЕСЬ объект!
    });
    
    console.log('✅ setLessonDialog вызван для редактирования');
  };

  const handleSaveLesson = async (data: { title: string; description?: string; duration_minutes?: number }) => {
    try {
      console.log('💾 Сохранение урока:', data);
      console.log('📝 Текущий lesson:', lessonDialog.lesson);
      
      if (lessonDialog.lesson && lessonDialog.lesson.id) {
        // ✅ РЕЖИМ РЕДАКТИРОВАНИЯ - обновляем существующий урок
        console.log('📝 Обновление существующего урока ID:', lessonDialog.lesson.id);
        
        const response = await api.put(`/api/lessons/${lessonDialog.lesson.id}`, {
          title: data.title,
          description: data.description || '',
          duration_minutes: data.duration_minutes || 0
        });

        console.log('✅ Урок обновлён:', response);
        alert('✅ Урок успешно обновлён!');
      } else {
        // ✅ РЕЖИМ СОЗДАНИЯ - создаём новый урок
        console.log('🚀 Создание нового урока');
        
        const response = await api.post('/api/lessons', {
          ...data,
          module_id: parseInt(moduleId!)
        });

        console.log('✅ Урок создан:', response);
        alert('✅ Урок успешно создан!');
      }
      
      // Обновить список уроков
      await loadLessonsFromAPI();
      
      // LessonEditDialog сам закроет диалог
    } catch (error: any) {
      console.error('❌ Ошибка сохранения урока:', error);
      alert(`❌ Ошибка: ${error?.message || 'Не удалось сохранить урок'}`);
      throw error;
    }
  };

  const handleDeleteLesson = async (lessonId: number, lessonTitle: string) => {
    if (!confirm(`❌ Вы уверены, что хотите удалить урок "${lessonTitle}"?\n\nВсе видео и материалы будут удалены. Это действие нельзя отменить.`)) {
      return;
    }

    try {
      console.log('=======================================');
      console.log('🗑️ Удаление урока:', lessonId);
      console.log('🗑️ Название:', lessonTitle);
      console.log('=======================================');
      
      // TODO: Здесь будет API запрос для удаления урока
      await api.delete(`/api/lessons/${lessonId}`);
      
      alert(`✅ Урок "${lessonTitle}" удалён!`);
      
      // Обновить список уроков
      await loadLessonsFromAPI();
    } catch (error: any) {
      console.error('❌ Ошибка удаления урока:', error);
      alert(error.response?.data?.error || `❌ Ошибка: ${error?.message || 'Не удалось удалить урок'}`);
    }
  };

  // 🎯 Drag & Drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = apiLessons.findIndex((l) => l.id === active.id);
    const newIndex = apiLessons.findIndex((l) => l.id === over.id);

    console.log('🔥 Drag ended:', {
      lessonId: active.id,
      from: oldIndex,
      to: newIndex,
    });

    // Оптимистичное обновление UI
    const reorderedLessons = arrayMove(apiLessons, oldIndex, newIndex).map(
      (lesson, idx) => ({
        ...lesson,
        order_index: idx,
      })
    );
    setApiLessons(reorderedLessons);

    // Обновление в БД
    try {
      const payload = {
        lessons: reorderedLessons.map((l, idx) => ({
          id: l.id,
          order_index: idx,
        })),
      };
      
      console.log('📤 Отправка данных для reorder уроков:', JSON.stringify(payload, null, 2));
      
      const response = await api.put('/api/lessons/reorder', payload);
      console.log('📥 Ответ от backend:', response);

      // ✅ Backend возвращает { success: true, message: '...' } напрямую
      if (response.success) {
        console.log('✅ Порядок уроков обновлён в БД');
        toast.success('Порядок уроков обновлён');
      } else {
        throw new Error('Backend не вернул success');
      }
    } catch (error: any) {
      console.error('❌ Ошибка обновления порядка уроков:', error);
      // Откат изменений
      await loadLessonsFromAPI();
      toast.error('Не удалось изменить порядок уроков', {
        description: error?.response?.data?.error || error?.message || 'Попробуйте еще раз'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-[#00FF88]" />;
      case "active":
        return <PlayCircle className="w-5 h-5 text-[#00FF88] animate-pulse" />;
      default:
        return <Circle className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleLessonClick = (lessonId: number, status: string) => {
    if (status !== "locked") {
      navigate(`/course/${id}/module/${moduleId}/lesson/${lessonId}`);
    }
  };

  // ✅ Используем реальный прогресс из БД
  const completedLessons = apiLessons.filter(l => lessonProgress[l.id] === true).length;
  const totalLessons = apiLessons.length;
  
  // ✅ Вычисляем общую длительность модуля в СЕКУНДАХ (не минутах!)
  console.log('\n⏱️ ===== РАСЧЕТ ВРЕМЕНИ МОДУЛЯ =====');
  console.log('📦 Уроков получено:', apiLessons.length);
  
  const totalDurationSeconds = apiLessons.reduce((total, lesson, index) => {
    let lessonSeconds = 0;
    
    // Приоритет: video_content.duration_seconds (точные данные)
    if (lesson.video_content && Array.isArray(lesson.video_content) && lesson.video_content.length > 0) {
      const video = lesson.video_content[0];
      if (video.duration_seconds && video.duration_seconds > 0) {
        lessonSeconds = video.duration_seconds;
        console.log(`   ${index + 1}. "${lesson.title}": ${lessonSeconds} секунд`);
      }
    } 
    // Fallback: lessons.duration_minutes (если видео нет, но минуты указаны)
    else if (lesson.duration_minutes && lesson.duration_minutes > 0) {
      lessonSeconds = lesson.duration_minutes * 60;
      console.log(`   ${index + 1}. "${lesson.title}": ${lesson.duration_minutes} минут (${lessonSeconds} секунд)`);
    } else {
      console.log(`   ${index + 1}. "${lesson.title}": 0 секунд (нет видео)`);
    }
    
    return total + lessonSeconds;
  }, 0);
  
  console.log('⏱️ ИТОГО СЕКУНД:', totalDurationSeconds);
  
  // ✅ Форматируем в читаемый вид:
  // < 60 сек → "20 секунд"
  // 60-3599 сек → "5 минут" или "59 минут"
  // ≥ 3600 сек (60 минут) → "1 час 30 минут"
  
  let durationDisplay = '';
  
  if (totalDurationSeconds < 60) {
    // Меньше минуты - показываем секунды
    durationDisplay = `${totalDurationSeconds} ${totalDurationSeconds === 1 ? 'секунда' : totalDurationSeconds < 5 ? 'секунды' : 'секунд'}`;
  } else if (totalDurationSeconds < 3600) {
    // От 1 минуты до 1 часа - показываем только минуты
    const totalMins = Math.floor(totalDurationSeconds / 60);
    durationDisplay = `${totalMins} ${totalMins === 1 ? 'минута' : totalMins < 5 ? 'минуты' : 'минут'}`;
  } else {
    // Больше часа - показываем часы и минуты
    const totalHours = Math.floor(totalDurationSeconds / 3600);
    const totalMins = Math.floor((totalDurationSeconds % 3600) / 60);
    
    if (totalMins > 0) {
      durationDisplay = `${totalHours} ${totalHours === 1 ? 'час' : totalHours < 5 ? 'часа' : 'часов'} ${totalMins} ${totalMins === 1 ? 'минута' : totalMins < 5 ? 'минуты' : 'минут'}`;
    } else {
      durationDisplay = `${totalHours} ${totalHours === 1 ? 'час' : totalHours < 5 ? 'часа' : 'часов'}`;
    }
  }
  
  console.log('⏱️ ОТОБРАЖЕНИЕ:', durationDisplay);
  console.log('⏱️ ===== КОНЕЦ РАСЧЕТА =====\n');
  
  // ✅ Вычисляем процент прогресса
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Neural Network Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
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
              className="absolute rounded-full bg-[#00FF88]"
              style={{
                width: size,
                height: size,
                left: `${x}%`,
                top: `${y}%`,
                boxShadow: `0 0 ${size * 4}px rgba(0, 255, 136, 0.6)`,
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
              <stop offset="0%" stopColor="#00FF88" stopOpacity="0" />
              <stop offset="50%" stopColor="#00FF88" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00FF88" stopOpacity="0" />
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
            className="absolute w-1 h-1 bg-[#00FF88] rounded-full"
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

      {/* Shooting Stars / Comets */}
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
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 relative z-50"
        >
          <Button
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔙 Навигация назад к курсу, courseId:', id);
              if (id) {
                navigate(`/course/${id}`);
              } else {
                console.error('❌ courseId отсутствует! Переход на /courses');
                navigate('/courses');
              }
            }}
            className="text-gray-400 hover:text-[#00FF88] hover:bg-[#00FF88]/10 gap-2 transition-colors relative z-50"
            style={{ pointerEvents: 'auto' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Назад к курсу
          </Button>
        </motion.div>

        {/* Module Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-12"
        >
          <div className="bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] rounded-3xl overflow-hidden border border-[#00FF88]/20 p-6 sm:p-8 md:p-10">
            {/* Animated Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <motion.div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 20% 50%, rgba(0, 255, 136, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 80% 50%, rgba(0, 255, 136, 0.2) 0%, transparent 50%)
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

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <p className="text-xs sm:text-sm text-[#00FF88] mb-2 uppercase tracking-wide font-semibold">
                    Модуль {(module.order_index !== undefined ? module.order_index + 1 : module.id)}
                  </p>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 font-display leading-tight">
                    {module.title}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
                    {module.description}
                  </p>
                </div>
              </div>

              {/* Progress Section */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    Прогресс: {completedLessons} из {totalLessons} уроков
                  </span>
                  <span className="text-[#00FF88] font-bold">{progressPercent}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc88]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                {/* Module Duration */}
                {apiLessons.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t border-gray-800">
                    <Clock className="w-4 h-4 text-[#00FF88]" />
                    <span>
                      Время прохождения модуля: {' '}
                      <span className="text-white font-semibold">
                        {durationDisplay}
                      </span>
                      {' '}({apiLessons.length} {apiLessons.length === 1 ? 'урок' : apiLessons.length < 5 ? 'урока' : 'уроков'})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Lessons Section */}
        <section className="relative z-10">
          <div className="flex items-center justify-between mb-6 relative z-20">
            <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
              Уроки модуля
            </h2>
            
            {/* Admin: Add Lesson Button */}
            {isAdmin && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔥 КНОПКА "ДОБАВИТЬ УРОК" НАЖАТА!');
                  console.log('🔥 moduleId:', moduleId);
                  console.log('🔥 isAdmin:', isAdmin);
                  handleAddLesson();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🖱️ MOUSEDOWN на кнопке "Добавить урок"!');
                }}
                type="button"
                className="bg-[#00FF88] text-black hover:bg-[#00cc88] font-semibold text-sm px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer relative z-50"
                style={{ position: 'relative', zIndex: 9999, pointerEvents: 'auto' }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Добавить урок</span>
                <span className="sm:hidden">Урок</span>
              </Button>
            )}
          </div>
          
          {/* 🎯 Drag & Drop Context для админов */}
          {isAdmin && apiLessons.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={apiLessons.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {apiLessons.map((lesson, index) => (
                    <SortableLesson
                      key={lesson.id}
                      lesson={lesson}
                      index={index}
                      onLessonClick={handleLessonClick}
                      onEdit={handleEditLesson}
                      onDelete={handleDeleteLesson}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="space-y-3">
              {apiLessons.length > 0 ? (
                apiLessons.map((lesson, index) => {
                  // ✅ Используем реальный прогресс из БД
                  const isCompleted = lessonProgress[lesson.id] === true;
                  const lessonStatus = lesson.is_archived ? "locked" : (isCompleted ? "completed" : "active");
              
              return (
                <motion.article
                  key={lesson.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    console.log('🖱️ КЛИК НА УРОК:', lesson.id, lesson.title);
                    handleLessonClick(lesson.id, lessonStatus);
                  }}
                  className={`
                    relative overflow-hidden rounded-2xl border transition-all duration-300
                    ${
                      lessonStatus === "active"
                        ? "border-[#00FF88]/40 bg-[#00FF88]/5 shadow-lg shadow-[#00FF88]/10"
                        : lessonStatus === "completed"
                        ? "border-gray-800 bg-[#0a0a0f]"
                        : "border-gray-800 bg-[#0a0a0f] opacity-60"
                    }
                    ${lessonStatus !== "locked" ? "cursor-pointer hover:border-[#00FF88]/40 hover:bg-[#00FF88]/5" : "cursor-not-allowed"}
                  `}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center gap-4">
                    {/* Lesson Number Badge */}
                    <div className={`
                      flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base
                      ${lessonStatus === "active" 
                        ? "bg-[#00FF88] text-black" 
                        : lessonStatus === "completed"
                        ? "bg-[#00FF88]/20 text-[#00FF88]"
                        : "bg-gray-800 text-gray-600"}
                    `}>
                      {lesson.id}
                    </div>

                    {/* Lesson Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-base sm:text-lg font-bold text-white">
                          {lesson.title}
                        </h3>
                        {getStatusIcon(lessonStatus)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{lesson.duration || lesson.duration_minutes ? `${lesson.duration || lesson.duration_minutes} мин` : 'Не указано'}</span>
                        </div>
                        {lessonStatus === "completed" && (
                          <span className="text-[#00FF88] font-semibold">✓ Завершено</span>
                        )}
                        {lessonStatus === "active" && (
                          <span className="text-[#00FF88] font-semibold">▶ Доступен</span>
                        )}
                        {lessonStatus === "locked" && (
                          <span className="text-gray-500">🔒 Заблокирован</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {lessonStatus !== "locked" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🚀 Кнопка "Начать" нажата для урока:', lesson.id);
                            handleLessonClick(lesson.id, lessonStatus);
                          }}
                          className={`${
                            lessonStatus === "completed" 
                              ? "bg-gray-800 text-gray-300 hover:bg-gray-700" 
                              : "bg-[#00FF88] text-black hover:bg-[#00cc88]"
                          } font-semibold rounded-xl px-4 py-2 transition-all`}
                        >
                          {lessonStatus === "completed" ? "Повторить" : "Открыть"}
                        </Button>
                      )}
                      
                      {/* Admin: Edit Button */}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('✏️ Редактирование урока:', lesson);
                            handleEditLesson(lesson);
                          }}
                          className="relative z-[102] bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/20 border border-[#00FF88]/30 hover:border-[#00FF88]/50 rounded-xl px-3 py-2 transition-all group"
                          title="Редактировать урок"
                        >
                          <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </Button>
                      )}
                      
                      {/* Admin: Delete Button */}
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLesson(lesson.id, lesson.title);
                          }}
                          className="relative z-[102] bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-xl px-3 py-2 transition-all group"
                          title="Удалить урок"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="group-hover:scale-110 transition-transform"
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
                  </div>
                </div>
                </motion.article>
                );
              })
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">Уроки не найдены</p>
                  {isAdmin && (
                    <Button onClick={handleAddLesson} className="bg-[#00FF88] text-black">
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить первый урок
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Module Materials */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 bg-[#1a1a24] border border-gray-800 rounded-2xl p-6 sm:p-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-[#00FF88]" />
            <h3 className="text-lg sm:text-xl font-bold text-white">
              Материалы модуля
            </h3>
          </div>
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
            Дополнительные материалы станут доступны после прохождения всех уроков
          </p>
          <Button 
            variant="outline" 
            disabled={completedLessons < totalLessons}
            className="w-full sm:w-auto border-[#00FF88]/40 text-[#00FF88] hover:bg-[#00FF88]/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Скачать материалы
          </Button>
        </motion.section>
      </div>
      
      {/* Admin: Lesson Edit Dialog */}
      {isAdmin && (
        <LessonEditDialog
          open={lessonDialog.open}
          onClose={() => {
            setLessonDialog({ open: false, lesson: null });
            // Обновляем список уроков после закрытия диалога
            loadLessonsFromAPI();
          }}
          onSave={handleSaveLesson}
          lesson={lessonDialog.lesson}
          moduleId={Number(moduleId) || 1}
          onVideoUploaded={async () => {
            console.log('🔄 Видео загружено, перезагружаем уроки...');
            await loadLessonsFromAPI();
          }}
        />
      )}
    </div>
  );
};

export default Module;

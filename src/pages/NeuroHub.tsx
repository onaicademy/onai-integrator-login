import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GoalsTodoSystemDB } from "@/components/goals/GoalsTodoSystemDB";
import RobotHead from "@/components/RobotHead";
import { 
  Brain, 
  Send, 
  Mic, 
  MessageCircle,
  TrendingUp, 
  Flame, 
  Award, 
  Trophy,
  Zap,
  BookOpen,
  Copy,
  ExternalLink,
  Sparkles,
  Clock,
  Loader2,
  Paperclip,
  X,
  Plus,
  Bot,
  Star,
  Target,
  CheckCircle,
  Upload,
  ThumbsUp,
  ArrowUp,
  Lightbulb,
  PartyPopper,
  FileText,
  Image as ImageIcon,
  File
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getStudentDashboard } from "@/lib/dashboard-api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  sendMessageToAI,
  getChatHistory,
  transcribeAudioToText,
  type ChatMessage,
} from "@/lib/openai-assistant";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { MatrixRainBackground } from '@/components/backgrounds/MatrixRainBackground';
import { 
  Robot, 
  Lightning, 
  Trophy as TrophyIcon, 
  Lightbulb as LightbulbIcon, 
  ChatCircleDots, 
  ChartBar, 
  Target as TargetIcon,
  Fire,
  Rocket,
  Crown,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Heart,
  Eye,
  HandPalm,
  Wind,
  Bed,
  Drop,
  Atom,
  Sparkle,
  MagicWand,
  GitBranch,
  Flask,
  Waveform,
  Cube,
  GameController
} from '@phosphor-icons/react';

type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  isNew?: boolean;
  status?: "completed" | "in_progress" | "locked";
  progress?: number;
  current?: number;
  target?: number;
  requirement?: string;
  category?: string;
};

// Компонент карточки достижения
const AchievementCard = ({ achievement, index }: { achievement: Achievement; index: number }) => {
  const isLocked = achievement.status === "locked";
  const isCompleted = achievement.status === "completed";
  const inProgress = achievement.status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1, type: "spring" }}
      whileHover={{ scale: isLocked ? 1 : 1.05, y: isLocked ? 0 : -5 }}
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer group ${
        isCompleted
          ? "bg-gradient-to-br from-[#b2ff2e]/20 to-[#8fcc00]/10 border-[#b2ff2e]/40"
          : inProgress
          ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/40"
          : "bg-zinc-900/30 border-zinc-700/50 opacity-60"
      }`}
    >
      {/* Иконка - ПРЕМИУМ 3D */}
      <div className={`mb-3 ${isLocked ? "grayscale opacity-50" : ""}`}>
        {isLocked ? (
          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-gray-500">
              <path d="M12 2C9.24 2 7 4.24 7 7V10H6C4.9 10 4 10.9 4 12V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V12C20 10.9 19.1 10 18 10H17V7C17 4.24 14.76 2 12 2ZM12 4C13.66 4 15 5.34 15 7V10H9V7C9 5.34 10.34 4 12 4Z" fill="currentColor"/>
            </svg>
          </motion.div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.2, rotate: 10 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <StarIcon size={48} weight="duotone" className="text-[#b2ff2e] drop-shadow-[0_0_10px_rgba(178,255,46,0.5)]" />
          </motion.div>
        )}
      </div>

      {/* Заголовок */}
      <h4 className="text-white font-bold text-sm mb-1 line-clamp-2">{achievement.title}</h4>
      <p className="text-gray-400 text-xs mb-3">{achievement.description}</p>

      {/* Прогресс бар */}
      {inProgress && achievement.progress !== undefined && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Прогресс</span>
            <span>
              {achievement.current}/{achievement.target}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${achievement.progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
            />
          </div>
        </div>
      )}

      {/* Требование для заблокированных */}
      {isLocked && achievement.requirement && (
        <div className="mt-2 p-2 bg-zinc-800/50 rounded text-xs text-gray-400 border border-zinc-700/50">
          💡 {achievement.requirement}
        </div>
      )}

      {/* Badge для завершенных */}
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="w-6 h-6 text-[#b2ff2e]" />
        </div>
      )}

      {/* Tooltip при hover */}
      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-zinc-900 border-2 border-[#b2ff2e]/60 rounded-lg p-2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-xl">
        <p className="text-xs text-white text-center">
          {isLocked ? achievement.requirement : isCompleted ? "✅ Завершено!" : `${achievement.progress}% выполнено`}
        </p>
      </div>
    </motion.div>
  );
};

const NeuroHub = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [myGoals, setMyGoals] = useState<string[]>([
    "Пройти 3 урока на этой неделе",
    "Сдать все домашки вовремя",
  ]);
  const [isEditingGoals, setIsEditingGoals] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [showXPPopup, setShowXPPopup] = useState(false);
  const [xpAmount, setXpAmount] = useState(0);
  const [challengeAccepted, setChallengeAccepted] = useState(false);

  // 🎤 Голосовой ввод
  const {
    isRecording,
    startRecording,
    stopRecording,
    duration: recordingDuration,
    error: recordingError
  } = useVoiceRecording();

  // ⚡ ОПТИМИЗАЦИЯ: Параллельная загрузка всех данных
  useEffect(() => {
    async function loadAllData() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      console.log('⚡ [NeuroHub] Начинаем параллельную загрузку данных...');
      const startTime = performance.now();

      try {
        // 🚀 Загружаем dashboard и chat history параллельно
        const [dashboardResult, chatHistoryResult] = await Promise.allSettled([
          getStudentDashboard(user.id),
          loadChatHistoryData(user.id)
        ]);

        // Обрабатываем результат dashboard
        if (dashboardResult.status === 'fulfilled') {
          setDashboardData(dashboardResult.value);
          console.log('✅ Dashboard загружен');
        } else {
          console.error('❌ Ошибка загрузки dashboard:', dashboardResult.reason);
        }

        // Обрабатываем результат chat history
        if (chatHistoryResult.status === 'fulfilled') {
          if (chatHistoryResult.value && chatHistoryResult.value.length > 0) {
            setMessages(chatHistoryResult.value);
            console.log('✅ История чата загружена');
          } else {
            // Приветственное сообщение
            setMessages([{
              role: 'assistant',
              content: `Привет, ${user?.full_name || user?.email}! 👋 Я твой AI-наставник. Готов помочь с обучением и ответить на любые вопросы! 🚀`
            }]);
          }
        } else {
          console.error('❌ Ошибка загрузки истории чата:', chatHistoryResult.reason);
          // Приветственное сообщение при ошибке
          setMessages([{
            role: 'assistant',
            content: `Привет! 👋 Я твой AI-наставник. Готов помочь!`
          }]);
        }

        const endTime = performance.now();
        console.log(`⚡ [NeuroHub] Все данные загружены за ${Math.round(endTime - startTime)}ms`);
      } catch (err) {
        console.error('❌ Критическая ошибка загрузки данных:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingHistory(false);
      }
    }

    loadAllData();
  }, [user?.id, user?.full_name, user?.email]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ⚡ Функция загрузки истории чата (для параллельной загрузки)
  const loadChatHistoryData = async (userId: string) => {
    // ✅ КРИТИЧЕСКИЙ FIX: Проверяем есть ли активный thread_id
    const threadId = localStorage.getItem('openai_thread_id');
    
    // Если НЕТ thread_id = это НОВЫЙ ЧАТ! Возвращаем пустой массив
    if (!threadId) {
      console.log('🆕 [loadChatHistoryData] Новый чат - старая история НЕ загружается');
      return [];
    }

    // Если есть thread_id - загружаем историю
    console.log('📜 [loadChatHistoryData] Загружаем историю для thread:', threadId);
    const history = await getChatHistory(userId);
    return history || [];
  };

  // Функция для перезагрузки истории чата (например, при создании нового чата)
  const loadChatHistory = async () => {
    if (!user?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const history = await loadChatHistoryData(user.id);
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{
          role: 'assistant',
          content: `Привет, ${user?.full_name || user?.email}! 👋 Я твой AI-наставник. Готов помочь с обучением и ответить на любые вопросы! 🚀`
        }]);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
      setMessages([{
        role: 'assistant',
        content: `Привет! 👋 Я твой AI-наставник. Готов помочь!`
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceInput = async () => {
    try {
      if (isRecording) {
        // Останавливаем запись
        const audioBlob = await stopRecording();
        
        if (!audioBlob) {
          toast({
            title: "❌ Ошибка записи",
            description: "Не удалось записать аудио. Попробуйте ещё раз.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "🔄 Распознаём речь...",
          description: "Отправляем аудио в Whisper API",
        });

        // Транскрибируем аудио
        const transcribedText = await transcribeAudioToText(audioBlob, user?.id);
        
        if (transcribedText && transcribedText.trim()) {
          // Вставляем распознанный текст в поле ввода
          setInput(prev => prev ? `${prev} ${transcribedText}` : transcribedText);
          
          toast({
            title: "✅ Речь распознана!",
            description: `"${transcribedText.substring(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`,
          });
        } else {
          toast({
            title: "⚠️ Речь не распознана",
            description: "Попробуйте говорить громче и чётче",
            variant: "destructive",
          });
        }
      } else {
        // Начинаем запись
        await startRecording();
        
        toast({
          title: "🎙️ Запись началась",
          description: "Говорите в микрофон. Нажмите ещё раз чтобы остановить.",
        });
      }
    } catch (error: any) {
      console.error('❌ Ошибка голосового ввода:', error);
      
      let errorMessage = "Не удалось записать голос";
      
      if (error.message === "PERMISSION_DENIED") {
        errorMessage = "Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.";
      } else if (error.message === "DEVICE_NOT_FOUND") {
        errorMessage = "Микрофон не найден. Подключите микрофон и попробуйте снова.";
      } else if (error.message === "DEVICE_IN_USE") {
        errorMessage = "Микрофон занят другим приложением.";
      } else if (error.message === "HTTPS_REQUIRED") {
        errorMessage = "Для работы микрофона требуется HTTPS соединение.";
      }
      
      toast({
        title: "❌ Ошибка микрофона",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleNewChat = async () => {
    try {
      const confirm = window.confirm(
        'Начать новый чат? Текущая беседа будет сохранена в истории.'
      );
      
      if (!confirm) return;

      setMessages([]);
      setMessages([{
        role: 'assistant',
        content: `Привет снова, ${user?.full_name || user?.email}! 👋 Начнём новую беседу. Чем могу помочь?`
      }]);
      
      toast({
        title: "✨ Новый чат создан!",
        description: "Старая беседа сохранена в истории",
      });
      
    } catch (error) {
      console.error('Ошибка создания нового чата:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось создать новый чат",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isSending || !user?.id) return;

    const userMessage = input.trim();
    setInput("");
    
    const attachments = attachedFiles.map(file => ({
      file,
      name: file.name,
      type: file.type
    }));
    
    setAttachedFiles([]);

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage || `[Прикреплено ${attachedFiles.length} файл(ов)]`
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsSending(true);

    try {
      const response = await sendMessageToAI(
        userMessage || "Проанализируй прикреплённые файлы",
        attachments,
        user.id,
        'mentor'
      );

      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Ошибка отправки сообщения:', error);
      toast({
        title: "❌ Ошибка",
        description: error.message || "Не удалось отправить сообщение",
        variant: "destructive",
      });
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '😔 Извини, произошла ошибка. Попробуй ещё раз или обратись в поддержку.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // ✨ ДАННЫЕ С ГЕЙМИФИКАЦИЕЙ
  const streak = dashboardData?.user_info?.current_streak || 0;
  const userLevel = dashboardData?.user_info?.level || 1;
  const userXP = dashboardData?.user_info?.xp || 0;
  
  // XP для следующего уровня (например, 100 * level)
  const xpForNextLevel = userLevel * 100;
  const xpProgress = (userXP % 100) / 100 * 100; // Прогресс в текущем уровне
  
  const totalLessonsCompleted = dashboardData?.week_activity?.reduce((sum: number, day: any) => sum + day.lessons_completed, 0) || 0;
  const totalLessons = 40;
  const completedLessons = Math.min(totalLessonsCompleted, totalLessons);
  const courseProgress = Math.round((completedLessons / totalLessons) * 100);

  // ✨ ДОСТИЖЕНИЯ как в Duolingo/Steam
  const achievements: Achievement[] = dashboardData?.recent_achievements?.map((ach: any) => ({
    id: ach.id,
    icon: ach.icon,
    title: ach.title,
    description: `+${ach.xp_reward} XP`,
    isNew: true
  })) || [
    { id: "1", icon: <Flame weight="fill" className="w-6 h-6 text-orange-500" />, title: "Стрик 5 дней", description: "Занимайся 5 дней подряд", isNew: true },
    { id: "2", icon: <Lightning weight="fill" className="w-6 h-6 text-yellow-400" />, title: "Speedrunner", description: "Пройди урок за 10 минут" },
    { id: "3", icon: <Target weight="fill" className="w-6 h-6 text-blue-400" />, title: "Точность", description: "100% выполнение ДЗ" },
  ];
  
  // ✨ ВСЕ ДОСТИЖЕНИЯ ПО КАТЕГОРИЯМ
  const allAchievements = {
    week: [
      { id: "w1", icon: <Flame weight="fill" className="w-6 h-6 text-orange-500" />, title: "Стрик 5 дней", description: "+50 XP", status: "completed" as const, progress: 100, category: "streak" },
      { id: "w2", icon: <BookOpen weight="fill" className="w-6 h-6 text-blue-400" />, title: "3 урока за неделю", description: "+30 XP", status: "in_progress" as const, progress: 66, current: 2, target: 3, category: "lessons" },
      { id: "w3", icon: <Lightning weight="fill" className="w-6 h-6 text-yellow-400" />, title: "Speedrunner", description: "+40 XP", status: "completed" as const, progress: 100, category: "speed" },
    ],
    month: [
      { id: "m1", icon: <TrophyIcon weight="fill" className="w-6 h-6 text-yellow-500" />, title: "10 уроков в месяц", description: "+100 XP", status: "in_progress" as const, progress: 70, current: 7, target: 10, category: "lessons" },
      { id: "m2", icon: <Target weight="fill" className="w-6 h-6 text-blue-400" />, title: "Все ДЗ сданы", description: "+150 XP", status: "in_progress" as const, progress: 85, current: 17, target: 20, category: "homework" },
      { id: "m3", icon: <CheckCircle weight="fill" className="w-6 h-6 text-green-400" />, title: "Идеальный месяц", description: "+200 XP", status: "locked" as const, progress: 0, requirement: "Сдай все ДЗ на 100%", category: "perfection" },
    ],
    permanent: [
      { id: "p1", icon: <Star weight="fill" className="w-6 h-6 text-yellow-400" />, title: "Первые шаги", description: "+20 XP", status: "completed" as const, progress: 100, category: "milestone" },
      { id: "p2", icon: <Rocket weight="fill" className="w-6 h-6 text-purple-400" />, title: "Ракета", description: "+500 XP", status: "in_progress" as const, progress: 40, current: 20, target: 50, requirement: "Пройди 50 уроков", category: "milestone" },
      { id: "p3", icon: <Crown weight="fill" className="w-6 h-6 text-yellow-500" />, title: "Мастер", description: "+1000 XP", status: "locked" as const, progress: 0, requirement: "Достигни уровня 10", category: "mastery" },
      { id: "p4", icon: <Star weight="fill" className="w-6 h-6 text-cyan-400" />, title: "Легенда", description: "+2000 XP", status: "locked" as const, progress: 0, requirement: "Заверши весь курс на 100%", category: "legend" },
    ],
  };
  
  const totalAchievements = [...allAchievements.week, ...allAchievements.month, ...allAchievements.permanent];
  const completedCount = totalAchievements.filter(a => a.status === "completed").length;
  const inProgressCount = totalAchievements.filter(a => a.status === "in_progress").length;
  
  // ✨ ТОП СОВЕТОВ ПО ПОСЛЕДНИМ ВОПРОСАМ (AI-generated) - ПРЕМИУМ ИКОНКИ
  const topAdvices = [
    {
      id: "adv1",
      title: "Как правильно настроить вебхуки",
      summary: "Ты часто спрашиваешь про вебхуки. Вот пошаговая инструкция...",
      details: "1. Открой n8n\n2. Создай новый Workflow\n3. Добавь узел Webhook\n4. Скопируй URL\n5. Настрой триггер в своём сервисе\n6. Протестируй отправку данных\n7. Проверь логи в n8n",
      actionLink: "/course/1/lesson/3",
      icon: GitBranch,
      color: "#3b82f6",
      timestamp: "Сегодня в 14:30"
    },
    {
      id: "adv2",
      title: "Оптимизация работы с API",
      summary: "Судя по твоим вопросам, тебе нужно понять rate limits...",
      details: "Rate limits - это ограничения на количество запросов к API:\n\n• OpenAI: 3 запроса/минуту (free tier)\n• Используй кэширование для частых запросов\n• Добавь retry логику с exponential backoff\n• Отслеживай headers: X-RateLimit-Remaining",
      actionLink: "/course/1/lesson/5",
      icon: Lightning,
      color: "#eab308",
      timestamp: "Вчера в 18:45"
    },
    {
      id: "adv3",
      title: "Debugging в n8n",
      summary: "Ты столкнулся с ошибками. Вот как их отлаживать...",
      details: "Основные шаги debugging:\n\n1. Включи \"Always Output Data\"\n2. Проверь входные данные каждого узла\n3. Используй узел \"Set\" для промежуточных данных\n4. Смотри Execution Log\n5. Добавь узел \"IF\" для проверки условий\n6. Тестируй по частям, а не весь workflow сразу",
      actionLink: null,
      icon: MagicWand,
      color: "#8b5cf6",
      timestamp: "2 дня назад"
    },
  ];

  // ✨ СОВЕТ ДНЯ (мотивационный)
  const dailyTips = [
    "Учись каждый день по 15 минут — это лучше, чем 2 часа раз в неделю!",
    "Практикуй полученные знания сразу — создай мини-проект!",
    "Ставь маленькие цели и празднуй каждую победу!",
    "Используй технику Pomodoro: 25 минут учёбы → 5 минут отдыха",
    "Твоя регулярность важнее скорости — продолжай в том же духе!"
  ];
  
  const todayTip = dailyTips[new Date().getDate() % dailyTips.length];
  
  // ✨ ЧЕЛЛЕНДЖ ДНЯ - ПРЕМИУМ ИКОНКИ
  const dailyChallenges = [
    { id: 1, title: "Марафонец", description: "Пройди 2 урока сегодня", xp: 50, icon: Rocket, color: "#f59e0b" },
    { id: 2, title: "Ранняя пташка", description: "Начни обучение до 10:00", xp: 30, icon: Lightning, color: "#3b82f6" },
    { id: 3, title: "Помощник", description: "Помоги другу с заданием", xp: 40, icon: Heart, color: "#ef4444" },
    { id: 4, title: "Перфекционист", description: "Сдай ДЗ на 100%", xp: 60, icon: Crown, color: "#eab308" },
    { id: 5, title: "Исследователь", description: "Изучи доп. материалы", xp: 35, icon: Flask, color: "#8b5cf6" },
  ];
  
  const todayChallenge = dailyChallenges[new Date().getDate() % dailyChallenges.length];
  
  // ✨ СОВЕТ ПО ЗДОРОВЬЮ - ПРЕМИУМ ИКОНКИ
  const healthTips = [
    { icon: Drop, title: "Пей воду", text: "Выпей стакан воды прямо сейчас!", color: "#3b82f6" },
    { icon: Eye, title: "Отдых для глаз", text: "Каждые 20 минут смотри вдаль 20 секунд", color: "#8b5cf6" },
    { icon: HandPalm, title: "Разминка", text: "Встань и потянись — 2 минуты движения", color: "#f59e0b" },
    { icon: Wind, title: "Дыши глубже", text: "5 глубоких вдохов для концентрации", color: "#10b981" },
    { icon: Bed, title: "Сон важен", text: "Спи 7-8 часов для лучшего усвоения", color: "#6366f1" },
  ];
  
  const todayHealthTip = healthTips[new Date().getHours() % healthTips.length];

  // ✨ СТАТИСТИКА ДНЯ
  const todayStats = dashboardData?.today_stats || { lessons_completed: 0, watch_time_minutes: 0, xp_earned: 0 };
  
  // Показываем XP popup при получении XP
  useEffect(() => {
    if (todayStats.xp_earned > 0 && !showXPPopup) {
      const timer = setTimeout(() => {
        setXpAmount(todayStats.xp_earned);
        setShowXPPopup(true);
        setTimeout(() => setShowXPPopup(false), 3000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [todayStats.xp_earned]);

  const faqItems = [
    {
      question: "Как настроить вебхук в n8n?",
      answer: "Вебхуки настраиваются в узле Webhook. Скопируй URL вебхука из n8n и добавь его в настройки своего сервиса. Не забудь активировать workflow!",
      lessonLink: "/course/1/lesson/3",
      icon: GitBranch,
      color: "#3b82f6"
    },
    {
      question: "Где получить API ключ OpenAI?",
      answer: "Зайди на platform.openai.com, перейди в раздел API Keys и создай новый ключ. Сохрани его в безопасном месте — ключ показывается только один раз!",
      lessonLink: "/course/1/lesson/1",
      icon: Atom,
      color: "#10b981"
    },
    {
      question: "Как интегрировать бота с CRM?",
      answer: "Используй API CRM системы или готовые интеграции в n8n. Настрой триггеры для автоматической отправки данных из бота в CRM.",
      lessonLink: "/course/1/lesson/8",
      icon: Cube,
      color: "#8b5cf6"
    },
    {
      question: "Как добавить голосовые сообщения в бота?",
      answer: "Используй Speech-to-Text API (например, OpenAI Whisper) для распознавания голоса и Text-to-Speech для генерации голосовых ответов.",
      lessonLink: "/course/1/lesson/12",
      icon: GameController,
      color: "#f59e0b"
    }
  ];

  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
    })), []
  );

    return (
    <div className="relative overflow-hidden min-h-screen">
      {/* 🎨 ПРЕМИУМ: Matrix Rain - падающие 0 и 1 (СЛАБО 15%) */}
      <MatrixRainBackground opacity={0.15} />

      {/* ===== POP-UP УВЕДОМЛЕНИЯ ===== */}
      <AnimatePresence>
        {showXPPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-20 right-4 z-50"
          >
            <motion.div
              className="bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] text-black font-bold px-6 py-4 rounded-2xl shadow-2xl shadow-[#00ff00]/50 flex items-center gap-3"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(0,255,0,0.5)',
                  '0 0 40px rgba(0,255,0,0.8)',
                  '0 0 20px rgba(0,255,0,0.5)',
                ],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
              }}
            >
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                }}
              >
                <Zap className="w-8 h-8" />
              </motion.div>
              <div>
                <p className="text-2xl font-black">+{xpAmount} XP</p>
                <p className="text-sm opacity-80">Отличная работа!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Темный оверлей для контраста - ПОЛНОСТЬЮ ПОКРЫВАЕТ ЭКРАН */}
      <div className="fixed inset-0 bg-black/40 pointer-events-none z-0" />

      {/* ===== КОНТЕНТ ===== */}
      <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* ===== 3D РОБОТ ГОЛОВА ===== */}
        {/* ВРЕМЕННО ОТКЛЮЧЕНО: 3D модель не загружается (404) */}
        {/* <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center mb-6 relative z-10"
        >
          <RobotHead 
            avatarId="67ebd62a688cd661ebe09988"
              style={{
              maxWidth: '400px',
              height: '400px',
              }}
            className="shadow-2xl shadow-[#b2ff2e]/30"
          />
        </motion.div> */}

        {/* ===== AI-НАСТАВНИК HEADER - АДАПТИВНЫЙ ===== */}
              <motion.div
          initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6 sm:mb-8 relative z-10 px-2"
          >
          <motion.h1 
            className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-3 tracking-wider text-white inline-block"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            >
              AI-НАСТАВНИК
          </motion.h1>

          {/* Тонкая линия под заголовком - по ширине текста */}
          <motion.div 
            className="h-[1px] mx-auto mb-3 sm:mb-4 bg-gradient-to-r from-transparent via-[#b2ff2e] to-transparent rounded-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            style={{ 
              width: '60%',
              maxWidth: '400px',
              boxShadow: '0 0 8px rgba(178, 255, 46, 0.3)',
            }}
          />
          
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs sm:text-sm md:text-base px-4">
            <Robot size={20} weight="duotone" className="text-[#b2ff2e] drop-shadow-[0_0_8px_rgba(178,255,46,0.5)]" />
            <span>Твой персональный помощник в обучении</span>
          </div>
          <motion.p 
            className="text-gray-600 text-[10px] xs:text-xs sm:text-sm mt-1 sm:mt-2 flex items-center justify-center gap-2" 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Waveform size={12} weight="duotone" className="text-[#b2ff2e]" />
            <span>Система активна • Обновлено 2 часа назад</span>
          </motion.p>
        </motion.div>

        {/* ===== СТАТИСТИКА ДНЯ (краткая сводка) ===== */}
        {todayStats.xp_earned > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="glass-card border-[#b2ff2e]/20 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff00]/20 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <CardContent className="py-4 px-6 relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkle size={28} weight="duotone" className="text-[#b2ff2e] drop-shadow-[0_0_10px_rgba(178,255,46,0.8)]" />
                    </motion.div>
                    <div>
                      <p className="text-sm text-gray-400">Статистика сегодня</p>
                      <p className="text-lg font-bold text-white">
                        Streak +1, XP +{todayStats.xp_earned}, {todayStats.lessons_completed} урок{todayStats.lessons_completed > 1 ? 'а' : ''}!
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    <TrophyIcon size={32} weight="duotone" className="text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== DESKTOP: ОПТИМИЗИРОВАННЫЙ GRID LAYOUT ===== */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6">
          
          {/* ===== ЧАТ С AI (Левая колонка - 6 колонок, ФИКСИРОВАННАЯ ВЫСОТА) ===== */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-6 lg:row-span-3"
          >
            <Card className="glass-card border-[#b2ff2e]/20 h-[600px] max-h-[600px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#b2ff2e]/60" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#b2ff2e]/60" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#b2ff2e]/60" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#b2ff2e]/60" />

              <motion.div
                className="absolute inset-x-0 h-px bg-[#b2ff2e]/50"
                animate={{
                  top: ['0%', '100%'],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-[#b2ff2e]" />
                    Чат с AI
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleNewChat}
                    className="border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 hover:border-[#b2ff2e] text-[#b2ff2e]"
                    title="Новый чат"
                  >
                    <Plus className="w-4 h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Новый чат</span>
                  </Button>
                </div>
                <CardDescription className="flex items-center gap-2 text-sm text-gray-400">
                  <ChatCircleDots size={16} weight="duotone" className="text-[#b2ff2e]" />
                  <span>Задавай любые вопросы — я здесь, чтобы помочь!</span>
                </CardDescription>
              </CardHeader>

              <ScrollArea className="flex-1 px-6 relative z-10 max-h-[400px] overflow-y-auto">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#b2ff2e]" />
                    <span className="ml-2 text-gray-400">Загрузка истории...</span>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((msg, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === "assistant"
                              ? "bg-gradient-to-br from-[#b2ff2e]/20 to-[#8fcc00]/20 border border-[#b2ff2e]/30 text-white"
                              : "bg-zinc-800/80 border border-zinc-700/50 text-white"
                          }`}
                        >
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none prose-invert prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => <p className="text-white my-2">{children}</p>,
                                  ul: ({ children }) => <ul className="text-white my-2 list-disc list-inside">{children}</ul>,
                                  ol: ({ children }) => <ol className="text-white my-2 list-decimal list-inside">{children}</ol>,
                                  li: ({ children }) => <li className="text-white">{children}</li>,
                                  code: ({ children }) => <code className="text-[#b2ff2e] bg-black/30 px-1 rounded">{children}</code>,
                                  pre: ({ children }) => <pre className="text-white bg-black/30 p-2 rounded my-2 overflow-x-auto">{children}</pre>,
                                  strong: ({ children }) => <strong className="text-[#b2ff2e] font-bold">{children}</strong>,
                                  em: ({ children }) => <em className="text-white italic">{children}</em>,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          )}
                        </div>
                  </motion.div>
                    ))}
                    {isSending && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gradient-to-br from-[#b2ff2e]/20 to-[#8fcc00]/20 border border-[#b2ff2e]/30 text-white rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Печатает...</span>
                  </div>
                </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <CardContent className="relative z-10 border-t border-[#b2ff2e]/20 pt-4">
                {/* Прикреплённые файлы */}
                {attachedFiles.length > 0 && (
                  <div className="mb-3 p-3 bg-zinc-900/50 rounded-lg border border-[#b2ff2e]/30">
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      Прикреплено файлов: <span className="text-[#b2ff2e] font-semibold">{attachedFiles.length}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attachedFiles.map((file, idx) => {
                        const isImage = file.type.startsWith('image/');
                        const isPDF = file.type === 'application/pdf';
                        const isDoc = file.type.includes('word') || file.type.includes('document');
                        
                        return (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 bg-zinc-800 border border-[#b2ff2e]/30 rounded-lg px-3 py-2 hover:bg-zinc-700/50 transition-colors"
                          >
                            {/* Иконка файла */}
                            {isImage && <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />}
                            {isPDF && <FileText className="w-4 h-4 text-red-400 shrink-0" />}
                            {isDoc && <FileText className="w-4 h-4 text-blue-500 shrink-0" />}
                            {!isImage && !isPDF && !isDoc && <File className="w-4 h-4 text-gray-400 shrink-0" />}
                            
                            {/* Название файла */}
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm text-white truncate max-w-[120px]" title={file.name}>
                                {file.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {(file.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                            
                            {/* Кнопка удалить */}
                            <button
                              onClick={() => removeFile(idx)}
                              className="ml-auto text-gray-400 hover:text-red-400 transition-colors shrink-0"
                              title="Удалить файл"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />

                <Button
                    size="icon"
                  variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                    className="border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 hover:border-[#b2ff2e] text-[#b2ff2e]"
                    title="Прикрепить файл"
                  >
                    <Paperclip className="w-5 h-5" />
                </Button>

                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    placeholder="Напиши сообщение..."
                    disabled={isSending}
                    className="flex-1 bg-zinc-900/50 border-[#b2ff2e]/30 text-white placeholder:text-gray-500 focus:border-[#b2ff2e] focus:ring-[#00ff00]/50"
                    data-chat-input
                  />

                <Button
                    onClick={handleSendMessage}
                    size="icon"
                    disabled={isSending || (!input.trim() && attachedFiles.length === 0)}
                    className="bg-gradient-to-br from-[#b2ff2e] to-[#8fcc00] hover:from-[#b2ff2e] hover:to-[#8fcc00] text-white disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                </Button>

                <Button
                    size="icon"
                  variant="outline"
                    onClick={handleVoiceInput}
                    disabled={isSending}
                    className={`${
                      isRecording 
                        ? "border-red-500 bg-red-500/20 hover:bg-red-500/30 text-red-500 animate-pulse" 
                        : "border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 hover:border-[#b2ff2e] text-[#b2ff2e]"
                    }`}
                    title={isRecording ? `🔴 Запись... (${recordingDuration}с)` : "🎤 Голосовой ввод"}
                  >
                    <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ===== КАРТОЧКИ СТАТИСТИКИ (Правая колонка верх - 6 колонок) ===== */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="lg:col-span-6"
          >
            {/* ✨ Карточки прогресса с АНИМАЦИЯМИ */}
            <div className="grid grid-cols-2 gap-4" style={{ gridAutoRows: '1fr' }}>
              
              {/* Прогресс курса */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
                className="h-full"
                style={{ minHeight: '180px' }}
              >
                <Card className="glass-card border-[#b2ff2e]/20 relative group overflow-hidden h-full">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff00]/10 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <CardContent className="p-4 relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-[#b2ff2e]" />
                      <p className="text-sm text-gray-400">Прогресс курса</p>
                  </div>
                    <p className="text-3xl font-bold text-white mb-1">{courseProgress}%</p>
                    <p className="text-xs text-gray-500">{completedLessons}/{totalLessons} уроков</p>
                    <div className="mt-auto pt-3 h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00]"
                        initial={{ width: 0 }}
                        animate={{ width: `${courseProgress}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Streak с анимацией */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
                className="h-full"
                style={{ minHeight: '180px' }}
              >
                <Card className="border-orange-500/30 bg-gradient-to-br from-black/50 to-orange-500/5 backdrop-blur-md relative group overflow-hidden h-full">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <CardContent className="p-4 relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <p className="text-sm text-gray-400">Streak</p>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{streak}</p>
                    <p className="text-xs text-gray-500">дней подряд</p>
                    {/* Прогресс-бар для streak */}
                    <div className="mt-auto pt-3 h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.7 }}
                      />
                  </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* ⚡ XP и УРОВЕНЬ с индикатором */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
                className="h-full"
                style={{ minHeight: '180px' }}
              >
                <Card className="border-yellow-500/30 bg-gradient-to-br from-black/50 to-yellow-500/5 backdrop-blur-md relative group overflow-hidden h-full">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <CardContent className="p-4 relative z-10 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <p className="text-sm text-gray-400">Уровень & XP</p>
                  </div>
                      <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                        Lvl {userLevel}
                      </Badge>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{userXP} XP</p>
                    <p className="text-xs text-gray-500">До {userLevel + 1} уровня: {xpForNextLevel - (userXP % 100)} XP</p>
                    {/* XP прогресс-бар */}
                    <div className="mt-auto pt-3 h-3 bg-zinc-800/50 rounded-full overflow-hidden relative">
                      <motion.div
                        className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 relative"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${xpProgress}%`,
                        }}
                        transition={{ duration: 1, delay: 0.9 }}
                      >
                        {/* Блеск */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{
                            x: ['-100%', '200%'],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 🏆 Достижения как в Steam/Duolingo */}
              <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ duration: 0.2 }}
                className="h-full"
                style={{ minHeight: '180px' }}
              >
                <Card className="glass-card border-[#b2ff2e]/20 relative group overflow-hidden h-full">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00cc00]/10 to-transparent"
                    animate={{
                      x: ['-100%', '200%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                  <CardContent className="p-4 relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-[#b2ff2e]" />
                      <p className="text-sm text-gray-400">Достижения</p>
                  </div>
                    <p className="text-3xl font-bold text-white mb-1">{achievements.length}</p>
                    <p className="text-xs text-gray-500">{achievements.length > 0 ? 'получено' : 'пока нет'}</p>
                    <div className="flex gap-1 mt-auto pt-2">
                      {achievements.slice(0, 3).map((achievement, idx) => (
                        <motion.div 
                          key={achievement.id} 
                          className="text-2xl relative"
                          title={achievement.title}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          {achievement.icon}
                          {achievement.isNew && (
                            <motion.div
                              className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                              animate={{
                                scale: [1, 1.3, 1],
                                opacity: [1, 0.7, 1],
                              }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                              }}
                            />
                          )}
                        </motion.div>
                      ))}
                </div>
                  </CardContent>
                </Card>
              </motion.div>

            </div>
          </motion.div>

          {/* ===== МОИ ЦЕЛИ (Правая колонка - 6 колонок) ===== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.46 }}
            className="lg:col-span-6"
            style={{ minHeight: '350px' }}
          >
            <GoalsTodoSystemDB />
          </motion.div>

          {/* ===== ТЕКУЩАЯ МИССИЯ (Правая колонка - 6 колонок) ===== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.48 }}
            className="lg:col-span-6"
            style={{ minHeight: '350px' }}
          >
            <Card className="glass-card border-[#b2ff2e]/20 relative overflow-hidden h-full">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff00]/10 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              
              <CardHeader className="relative z-10">
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-6 h-6 text-[#b2ff2e]" />
                  {dashboardData?.active_missions?.length > 0 ? 'Активная миссия' : 'Текущее задание'}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                {dashboardData?.active_missions?.length > 0 ? (
                  dashboardData.active_missions.slice(0, 1).map((mission: any) => (
          <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {mission.title}
                          </h3>
                          <p className="text-sm text-gray-400">{mission.description}</p>
                  </div>
                        <Badge className="bg-[#b2ff2e]/20 text-[#b2ff2e] border-[#b2ff2e]/30">
                          +{mission.xp_reward} XP
                        </Badge>
                </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Прогресс</span>
                          <span className="text-[#b2ff2e] font-semibold">
                            {mission.current_value}/{mission.target_value} ({mission.progress_percent}%)
                          </span>
                        </div>
                        <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden relative">
                    <motion.div
                            className="h-full bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] relative"
                            initial={{ width: 0 }}
                            animate={{ width: `${mission.progress_percent}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                          >
                        <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              animate={{
                                x: ['-100%', '200%'],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                          </motion.div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          className="flex-1 bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] hover:from-[#b2ff2e] hover:to-[#8fcc00] text-black font-bold shadow-lg shadow-[#00ff00]/30"
                          onClick={() => setIsUploadModalOpen(true)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Сдать задание
                        </Button>
                        <Button
                          variant="outline"
                          className="border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 hover:border-[#b2ff2e] text-white"
                          onClick={() => {
                            document.querySelector('[data-chat-input]')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Задать вопрос
                        </Button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                      className="mb-3 flex justify-center"
                    >
                      <TargetIcon size={64} weight="duotone" className="text-[#b2ff2e] drop-shadow-[0_0_20px_rgba(178,255,46,0.6)]" />
                    </motion.div>
                    <h3 className="text-lg font-semibold text-white mb-1">
                      Пока нет активных заданий
                    </h3>
                    <p className="text-sm text-gray-400">
                      Продолжай проходить уроки, и новые миссии появятся!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* ===== ДОПОЛНИТЕЛЬНЫЕ БЛОКИ (ВНЕ GRID) ===== */}
        
        {/* ✨ СОВЕТ ДНЯ & ЧЕЛЛЕНДЖ */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6">
          {/* ===== СОВЕТ ДНЯ ===== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ minHeight: '140px' }}
          >
            <Card className="glass-card border-[#b2ff2e]/20 relative overflow-hidden h-full">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <CardContent className="py-4 px-6 relative z-10">
                <div className="flex items-start gap-4">
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                    }}
                  >
                    <Lightbulb className="w-10 h-10 text-yellow-500" />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1 font-semibold">
                      <LightbulbIcon size={16} weight="duotone" className="text-[#b2ff2e]" />
                      <span>Совет дня</span>
                    </div>
                    <p className="text-base text-white leading-relaxed">
                      {todayTip}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ===== СОВЕТ ПО ЗДОРОВЬЮ ===== */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.52 }}
            style={{ minHeight: '140px' }}
          >
            <Card className="border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-md relative overflow-hidden h-full">
              <CardContent className="py-4 px-6 relative z-10">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    <todayHealthTip.icon 
                      size={40} 
                      weight="duotone" 
                      style={{ color: todayHealthTip.color, filter: `drop-shadow(0 0 10px ${todayHealthTip.color}80)` }}
                    />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart size={16} weight="duotone" className="text-red-400" />
                      <p className="text-sm text-blue-400 font-semibold">Совет по здоровью</p>
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">{todayHealthTip.title}</h4>
                    <p className="text-gray-300 text-sm">{todayHealthTip.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ✨ ЧЕЛЛЕНДЖ ДНЯ (Полная ширина) */}
        {!challengeAccepted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.54 }}
            className="hidden lg:block"
          >
            <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-md relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent"
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <CardContent className="py-4 px-6 relative z-10">
                <div className="flex items-start gap-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    <todayChallenge.icon 
                      size={48} 
                      weight="duotone" 
                      style={{ color: todayChallenge.color, filter: `drop-shadow(0 0 15px ${todayChallenge.color}80)` }}
                    />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-yellow-400 mb-1 font-bold">
                      <TrophyIcon size={16} weight="duotone" />
                      <span>Челлендж дня</span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{todayChallenge.title}</h3>
                    <p className="text-gray-300 text-sm mb-3">{todayChallenge.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        +{todayChallenge.xp} XP
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => {
                      setChallengeAccepted(true);
                      toast({
                        title: "🎉 Челлендж принят!",
                        description: `"${todayChallenge.title}" добавлен в твои задачи!`,
                      });
                    }}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold"
                  >
                    ✅ Принять
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setChallengeAccepted(true)}
                    className="border-yellow-500/30 hover:bg-yellow-500/10 text-white"
                  >
                    Позже
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ===== MOBILE: ТАБЫ ===== */}
        <div className="lg:hidden">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-[#b2ff2e]/30">
              <TabsTrigger 
                value="chat"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#b2ff2e] data-[state=active]:to-[#8fcc00] data-[state=active]:text-white flex items-center gap-2"
              >
                <ChatCircleDots size={18} weight="duotone" />
                <span>Чат</span>
              </TabsTrigger>
              <TabsTrigger 
                value="dashboard"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#b2ff2e] data-[state=active]:to-[#8fcc00] data-[state=active]:text-white flex items-center gap-2"
              >
                <ChartBar size={18} weight="duotone" />
                <span>Дашборд</span>
              </TabsTrigger>
            </TabsList>

            {/* Чат Tab */}
            <TabsContent value="chat" className="mt-6">
              <Card className="glass-card border-[#b2ff2e]/20 h-[400px] sm:h-[500px] flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-[#b2ff2e]" />
                      Чат с AI
                    </CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNewChat}
                      className="border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 text-[#b2ff2e] text-xs"
                      title="Новый чат"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </CardHeader>

                <ScrollArea className="flex-1 px-4">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#b2ff2e]" />
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {messages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                              msg.role === "assistant"
                                ? "bg-gradient-to-br from-[#b2ff2e]/20 to-[#8fcc00]/20 border border-[#b2ff2e]/30 text-white"
                                : "bg-zinc-800/80 border border-zinc-700/50 text-white"
                            }`}
                          >
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      {isSending && (
                        <div className="flex justify-start">
                          <div className="bg-gradient-to-br from-[#b2ff2e]/20 to-[#8fcc00]/20 border border-[#b2ff2e]/30 text-white rounded-2xl px-4 py-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                        </div>
                  )}
                </ScrollArea>

                <CardContent className="border-t border-[#b2ff2e]/20 pt-4">
                  {/* Прикреплённые файлы (Mobile) */}
                  {attachedFiles.length > 0 && (
                    <div className="mb-3 p-2 bg-zinc-900/50 rounded-lg border border-[#b2ff2e]/30">
                      <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        Файлов: <span className="text-[#b2ff2e] font-semibold">{attachedFiles.length}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {attachedFiles.map((file, idx) => {
                          const isImage = file.type.startsWith('image/');
                          const isPDF = file.type === 'application/pdf';
                          const isDoc = file.type.includes('word') || file.type.includes('document');
                          
                          return (
                            <div 
                              key={idx} 
                              className="flex items-center gap-2 bg-zinc-800 border border-[#b2ff2e]/30 rounded-lg px-2 py-1.5"
                            >
                              {/* Иконка */}
                              {isImage && <ImageIcon className="w-3 h-3 text-blue-400 shrink-0" />}
                              {isPDF && <FileText className="w-3 h-3 text-red-400 shrink-0" />}
                              {isDoc && <FileText className="w-3 h-3 text-blue-500 shrink-0" />}
                              {!isImage && !isPDF && !isDoc && <File className="w-3 h-3 text-gray-400 shrink-0" />}
                              
                              {/* Название + размер */}
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs text-white truncate max-w-[80px]" title={file.name}>
                                  {file.name}
                                </span>
                                <span className="text-[10px] text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </span>
                              </div>
                              
                              {/* Удалить */}
                              <button
                                onClick={() => removeFile(idx)}
                                className="ml-auto text-gray-400 hover:text-red-400 shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSending}
                      className="border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 text-[#b2ff2e] shrink-0"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>

                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Напиши сообщение..."
                      disabled={isSending}
                      className="flex-1 bg-zinc-900/50 border-[#b2ff2e]/30 text-white"
                    />

                    <Button
                      onClick={handleSendMessage}
                      size="icon"
                      disabled={isSending || (!input.trim() && attachedFiles.length === 0)}
                      className="bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] text-white shrink-0"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleVoiceInput}
                      disabled={isSending}
                      className={`shrink-0 ${
                        isRecording 
                          ? "border-red-500 bg-red-500/20 hover:bg-red-500/30 text-red-500 animate-pulse" 
                          : "border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 text-[#b2ff2e]"
                      }`}
                      title={isRecording ? `🔴 Запись... (${recordingDuration}с)` : "🎤 Голосовой ввод"}
                    >
                      <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Дашборд Tab */}
            <TabsContent value="dashboard" className="mt-6 space-y-4">
              {/* Статистика дня на мобилке */}
              {todayStats.xp_earned > 0 && (
                <Card className="glass-card border-[#b2ff2e]/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <ChartBar size={16} weight="duotone" className="text-[#b2ff2e]" />
                      <span>Сегодня</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      +{todayStats.xp_earned} XP, {todayStats.lessons_completed} урок{todayStats.lessons_completed > 1 ? 'а' : ''}!
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Карточки прогресса вертикально */}
              <Card className="glass-card border-[#b2ff2e]/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-[#b2ff2e]" />
                    <p className="text-sm text-gray-400">Прогресс курса</p>
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">{courseProgress}%</p>
                  <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00]" style={{ width: `${courseProgress}%` }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-500/30 bg-black/50 backdrop-blur-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <p className="text-sm text-gray-400">Streak</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-white">{streak} дней подряд</p>
                    <Flame size={32} weight="fill" className="text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Совет дня */}
              <Card className="glass-card border-[#b2ff2e]/20">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <LightbulbIcon size={16} weight="duotone" className="text-[#b2ff2e]" />
                      <span>Совет дня</span>
                    </div>
                  <p className="text-white">{todayTip}</p>
                </CardContent>
              </Card>

              {/* Текущая миссия */}
              <Card className="glass-card border-[#b2ff2e]/20">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <TargetIcon size={18} weight="duotone" className="text-[#b2ff2e]" />
                    <span>{dashboardData?.active_missions?.length > 0 ? 'Активная миссия' : 'Текущее задание'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dashboardData?.active_missions?.length > 0 ? (
                    dashboardData.active_missions.slice(0, 1).map((mission: any) => (
                      <div key={mission.id}>
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {mission.title}
                        </h3>
                        <p className="text-sm text-gray-400 mb-3">{mission.description}</p>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-gray-400">Прогресс</span>
                          <span className="text-[#b2ff2e]">{mission.current_value}/{mission.target_value}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full mb-3">
                          <div 
                            className="h-full bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] rounded-full"
                            style={{ width: `${mission.progress_percent}%` }}
                          />
                        </div>
                        <Button 
                          className="w-full bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] text-white"
                          onClick={() => toast({
                            title: "📤 Загрузка задания",
                            description: "Функция в разработке!",
                          })}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Сдать задание
                        </Button>
                      </div>
                  ))
                ) : (
                    <div className="text-center py-4">
                      <div className="flex justify-center mb-2">
                        <TargetIcon size={48} weight="duotone" className="text-[#b2ff2e] opacity-50" />
                      </div>
                      <p className="text-white">Пока нет активных заданий</p>
                      <p className="text-sm text-gray-400">Продолжай учиться!</p>
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Мои цели (КОМПАКТНАЯ ВЕРСИЯ для мобилки) */}
              <Card className="glass-card border-[#b2ff2e]/20">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#b2ff2e]" />
                    Мои цели
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GoalsTodoSystemDB />
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ===== ВСЕ ДОСТИЖЕНИЯ (Большой блок с категориями) ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="glass-card border-[#b2ff2e]/20">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Trophy className="w-7 h-7 text-[#b2ff2e]" />
                  <div>
                    <CardTitle className="text-white text-xl">Все достижения</CardTitle>
                    <CardDescription className="text-gray-400 mt-1">
                      {completedCount} из {totalAchievements.length} получено • {inProgressCount} в процессе
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="bg-[#b2ff2e]/20 text-[#b2ff2e] border-[#b2ff2e]/30 px-3 py-1">
                    ⭐ {completedCount} завершено
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1">
                    ⏳ {inProgressCount} в работе
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="week" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50 border border-[#b2ff2e]/20 mb-6">
                  <TabsTrigger value="week" className="data-[state=active]:bg-[#b2ff2e]/20 data-[state=active]:text-[#b2ff2e]">
                    📅 Неделя
                  </TabsTrigger>
                  <TabsTrigger value="month" className="data-[state=active]:bg-[#b2ff2e]/20 data-[state=active]:text-[#b2ff2e]">
                    📆 Месяц
                  </TabsTrigger>
                  <TabsTrigger value="permanent" className="data-[state=active]:bg-[#b2ff2e]/20 data-[state=active]:text-[#b2ff2e]">
                    ⭐ Постоянные
                  </TabsTrigger>
                </TabsList>

                {/* Неделя */}
                <TabsContent value="week">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {allAchievements.week.map((achievement, idx) => (
                      <AchievementCard key={achievement.id} achievement={achievement} index={idx} />
                    ))}
                  </div>
                </TabsContent>

                {/* Месяц */}
                <TabsContent value="month">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {allAchievements.month.map((achievement, idx) => (
                      <AchievementCard key={achievement.id} achievement={achievement} index={idx} />
                    ))}
                  </div>
                </TabsContent>

                {/* Постоянные */}
                <TabsContent value="permanent">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {allAchievements.permanent.map((achievement, idx) => (
                      <AchievementCard key={achievement.id} achievement={achievement} index={idx} />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== ТОП СОВЕТОВ ПО ПОСЛЕДНИМ ВОПРОСАМ ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
        >
          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5 backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-purple-400" />
                <div>
                  <CardTitle className="text-white text-xl">Топ советов по твоим последним вопросам</CardTitle>
                  <CardDescription>AI проанализировал твои вопросы и подготовил персональные рекомендации</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {topAdvices.map((advice, idx) => (
                  <AccordionItem
                    key={advice.id}
                    value={advice.id}
                    className="border border-purple-500/20 rounded-lg px-4 data-[state=open]:bg-purple-500/10 transition-colors"
                  >
                    <AccordionTrigger className="text-white hover:text-purple-400 transition-colors py-4 hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 10 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <advice.icon 
                            size={32} 
                            weight="duotone" 
                            style={{ color: advice.color, filter: `drop-shadow(0 0 8px ${advice.color}80)` }}
                          />
                        </motion.div>
                        <div className="flex-1">
                          <p className="font-semibold text-base">{advice.title}</p>
                          <p className="text-xs text-gray-400 mt-1">{advice.timestamp}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-300 pb-4">
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="bg-zinc-900/50 rounded-lg p-4 mb-3">
                          <p className="text-sm font-medium text-purple-300 mb-2">📝 Краткое резюме:</p>
                          <p className="text-sm text-gray-300 mb-3">{advice.summary}</p>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={16} weight="duotone" className="text-purple-300" />
                            <p className="text-sm font-medium text-purple-300">Подробности:</p>
                          </div>
                          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{advice.details}</pre>
                        </div>
                        
                        {advice.actionLink && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Открыть урок
                          </Button>
                        )}
                      </motion.div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

        {/* ===== МОДАЛКА ЗАГРУЗКИ ДЗ ===== */}
        <AnimatePresence>
          {isUploadModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                onClick={() => setIsUploadModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
              >
                <Card className="border-[#b2ff2e]/30 bg-zinc-900 shadow-2xl shadow-[#00ff00]/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white flex items-center gap-2">
                        <Upload className="w-6 h-6 text-[#b2ff2e]" />
                        Загрузить домашнее задание
                      </CardTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsUploadModalOpen(false)}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <CardDescription>Прикрепи файл с выполненным заданием</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="border-2 border-dashed border-[#b2ff2e]/30 rounded-lg p-8 text-center hover:border-[#b2ff2e]/60 hover:bg-[#b2ff2e]/5 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('upload-input')?.click()}
                    >
                      {uploadFile ? (
                        <div className="space-y-2">
                          <Paperclip className="w-8 h-8 text-[#b2ff2e] mx-auto" />
                          <p className="text-white font-medium">{uploadFile.name}</p>
                          <p className="text-gray-400 text-sm">{(uploadFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                          <p className="text-white">Нажми или перетащи файл</p>
                          <p className="text-gray-400 text-sm">PDF, DOC, ZIP до 10MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      id="upload-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setUploadFile(file);
                      }}
                      accept=".pdf,.doc,.docx,.zip"
                    />
                    <Textarea
                      placeholder="Комментарий к работе (необязательно)..."
                      className="bg-zinc-800 border-[#b2ff2e]/30 text-white"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsUploadModalOpen(false);
                          setUploadFile(null);
                        }}
                        className="flex-1 border-gray-600 hover:bg-zinc-800"
                      >
                        Отмена
                      </Button>
                      <Button
                        onClick={() => {
                          toast({
                            title: "✅ Задание отправлено!",
                            description: "AI-наставник проверит твою работу в течение 24 часов",
                          });
                          setIsUploadModalOpen(false);
                          setUploadFile(null);
                        }}
                        disabled={!uploadFile}
                        className="flex-1 bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] hover:from-[#b2ff2e] hover:to-[#8fcc00] text-black font-bold"
                      >
                        Отправить
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ===== FAQ с modern-accordion и анимациями ===== */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="glass-card border-[#b2ff2e]/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#b2ff2e]" />
                Частые вопросы
              </CardTitle>
              <CardDescription>Быстрые ответы на популярные вопросы студентов</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faqItems.map((item, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`item-${index}`}
                    className="border border-[#b2ff2e]/20 rounded-lg px-4 data-[state=open]:bg-[#b2ff2e]/5 transition-colors"
                  >
                    <AccordionTrigger className="text-white hover:text-[#b2ff2e] transition-colors py-4 hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 10 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <item.icon 
                            size={24} 
                            weight="duotone" 
                            style={{ color: item.color, filter: `drop-shadow(0 0 6px ${item.color}80)` }}
                          />
                        </motion.div>
                        <span>{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-400 pb-4">
            <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <p className="mb-4">{item.answer}</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#b2ff2e]/30 hover:bg-[#b2ff2e]/10 hover:border-[#b2ff2e] text-white w-full sm:w-auto"
                            onClick={() => {
                              navigator.clipboard.writeText(item.answer);
                              toast({
                                title: "✅ Скопировано",
                                description: "Ответ скопирован в буфер обмена",
                              });
                            }}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Копировать ответ
                          </Button>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-[#b2ff2e] to-[#8fcc00] hover:from-[#b2ff2e] hover:to-[#8fcc00] text-white w-full sm:w-auto"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Открыть урок
                          </Button>
              </div>
                      </motion.div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  );
};

export default NeuroHub;

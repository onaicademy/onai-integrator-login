import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
  PartyPopper
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
  type ChatMessage,
} from "@/lib/openai-assistant";

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

  useEffect(() => {
    async function loadDashboard() {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await getStudentDashboard(user.id);
        setDashboardData(data);
      } catch (err) {
        console.error('Ошибка загрузки dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadChatHistory();
    }
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    if (!user?.id) return;
    
    setIsLoadingHistory(true);
    try {
      const threadId = localStorage.getItem('openai_thread_id');
      
      if (!threadId) {
        setMessages([{
          role: 'assistant',
          content: `Привет! 👋 Я твой AI-наставник. Готов помочь с обучением и ответить на любые вопросы! 🚀`
        }]);
        setIsLoadingHistory(false);
        return;
      }

      const history = await getChatHistory(user.id);
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([{
          role: 'assistant',
          content: `Привет! 👋 Я твой AI-наставник. Готов помочь!`
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
    toast({
      title: "🎤 Голосовой ввод",
      description: "Функция в разработке. Скоро будет доступна!",
    });
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
        content: `Привет снова! 👋 Начнём новую беседу. Чем могу помочь?`
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

  const streak = dashboardData?.user_info?.current_streak || 0;
  const userLevel = dashboardData?.user_info?.level || 1;
  const userXP = dashboardData?.user_info?.xp || 0;
  const xpForNextLevel = userLevel * 100;
  const xpProgress = (userXP % 100) / 100 * 100;
  const todayStats = dashboardData?.today_stats || { lessons_completed: 0, watch_time_minutes: 0, xp_earned: 0 };
  const totalLessonsCompleted = dashboardData?.week_activity?.reduce((sum: number, day: any) => sum + day.lessons_completed, 0) || 0;
  const totalLessons = 40;
  const completedLessons = Math.min(totalLessonsCompleted, totalLessons);
  const courseProgress = Math.round((completedLessons / totalLessons) * 100);
  const xpToNextLevel = xpForNextLevel - (userXP % 100);

  const allAchievements = {
    week: [
      { id: "w1", icon: "🔥", title: "Стрик 5 дней", description: "+50 XP", status: "completed" as const, progress: 100, category: "streak" },
      { id: "w2", icon: "📚", title: "3 урока за неделю", description: "+30 XP", status: "in_progress" as const, progress: 66, current: 2, target: 3, category: "lessons" },
      { id: "w3", icon: "⚡", title: "Speedrunner", description: "+40 XP", status: "completed" as const, progress: 100, category: "speed" },
    ],
    month: [
      { id: "m1", icon: "🏆", title: "10 уроков в месяц", description: "+100 XP", status: "in_progress" as const, progress: 70, current: 7, target: 10, category: "lessons" },
      { id: "m2", icon: "🎯", title: "Все ДЗ сданы", description: "+150 XP", status: "in_progress" as const, progress: 85, current: 17, target: 20, category: "homework" },
      { id: "m3", icon: "💯", title: "Идеальный месяц", description: "+200 XP", status: "locked" as const, progress: 0, requirement: "Сдай все ДЗ на 100%", category: "perfection" },
    ],
    permanent: [
      { id: "p1", icon: "🌟", title: "Первые шаги", description: "+20 XP", status: "completed" as const, progress: 100, category: "milestone" },
      { id: "p2", icon: "🚀", title: "Ракета", description: "+500 XP", status: "in_progress" as const, progress: 40, current: 20, target: 50, requirement: "Пройди 50 уроков", category: "milestone" },
      { id: "p3", icon: "👑", title: "Мастер", description: "+1000 XP", status: "locked" as const, progress: 0, requirement: "Достигни уровня 10", category: "mastery" },
    ],
  };

  const dailyTips = [
    "💡 Учись каждый день по 15 минут — это лучше, чем 2 часа раз в неделю!",
    "🚀 Практикуй полученные знания сразу — создай мини-проект!",
    "🎯 Ставь маленькие цели и празднуй каждую победу!",
  ];
  
  const todayTip = dailyTips[new Date().getDate() % dailyTips.length];
  
  const dailyChallenges = [
    { id: 1, title: "Марафонец", description: "Пройди 2 урока сегодня", xp: 50, icon: "🏃" },
    { id: 2, title: "Ранняя пташка", description: "Начни обучение до 10:00", xp: 30, icon: "🌅" },
    { id: 3, title: "Помощник", description: "Помоги другу с заданием", xp: 40, icon: "🤝" },
  ];
  
  const todayChallenge = dailyChallenges[new Date().getDate() % dailyChallenges.length];
  
  const healthTips = [
    { icon: "💧", title: "Пей воду", text: "Выпей стакан воды прямо сейчас!" },
    { icon: "👀", title: "Отдых для глаз", text: "Каждые 20 минут смотри вдаль 20 секунд" },
    { icon: "🧘", title: "Разминка", text: "Встань и потянись — 2 минуты движения" },
  ];
  
  const todayHealthTip = healthTips[new Date().getHours() % healthTips.length];

  const faqItems = [
    {
      question: "🔗 Как настроить вебхук в n8n?",
      answer: "Вебхуки настраиваются в узле Webhook. Скопируй URL вебхука из n8n и добавь его в настройки своего сервиса.",
      lessonLink: "/course/1/lesson/3"
    },
    {
      question: "🔑 Где получить API ключ OpenAI?",
      answer: "Зайди на platform.openai.com, перейди в раздел API Keys и создай новый ключ.",
      lessonLink: "/course/1/lesson/1"
    },
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

  // Матричные цифры на фоне
  const matrixDigits = useMemo(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: (i * 3.33) % 100,
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 5,
      digit: Math.floor(Math.random() * 2), // 0 или 1
    })), []
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a14] to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#00ff00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-black via-[#0a0a14] to-black">
      {/* Фон */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `linear-gradient(to right, #00ff00 1px, transparent 1px), linear-gradient(to bottom, #00ff00 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full bg-[#00ff00]"
            style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            animate={{ y: ['-10%', '110%'], opacity: [0, 1, 0] }}
            transition={{ duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      {/* Матричные цифры */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {matrixDigits.map((item) => (
          <motion.div
            key={item.id}
            className="absolute text-[#00ff00] font-mono text-sm"
            style={{ left: `${item.x}%`, top: '-5%' }}
            animate={{
              y: ['0vh', '105vh'],
              opacity: [0, 0.7, 0.7, 0],
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {item.digit}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} className="text-center relative">
          <div className="relative inline-block mb-6">
            <motion.div
              className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto"
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-[#00ff00]" />
              </div>
            </motion.div>
          </div>

          <motion.h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-black mb-3 tracking-wider">
            <span className="text-white" style={{ textShadow: '0 0 20px rgba(0,255,0,0.3)' }}>AI-НАСТАВНИК</span>
          </motion.h1>
          <motion.p className="text-gray-400 text-lg mb-2">🤖 Твой персональный помощник в обучении</motion.p>
        </motion.div>

        {/* БЛОК 1: ПРОГРЕСС/ДАШБОРД (МЕТРИКИ) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/80 border-2 border-blue-500/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-3xl">📚</span>
                  </motion.div>
                  <span className="text-gray-400 text-xs sm:text-sm">Прогресс курса</span>
                </div>
                <span className="text-white font-bold text-xl sm:text-2xl">{courseProgress}%</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${courseProgress}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
              <p className="text-gray-500 text-xs">{completedLessons} из {totalLessons} уроков</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-2 border-orange-500/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-3xl">🔥</span>
                  </motion.div>
                  <span className="text-gray-400 text-xs sm:text-sm">Streak</span>
                </div>
                <span className="text-white font-bold text-xl sm:text-2xl">{streak}</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((streak / 30) * 100, 100)}%` }}
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                />
              </div>
              <p className="text-gray-500 text-xs">{streak > 0 ? `Цель — 30 дней 🔥` : 'Начни streak'}</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-2 border-[#00ff00]/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <span className="text-3xl">⚡</span>
                  </motion.div>
                  <span className="text-gray-400 text-xs sm:text-sm">Уровень</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold text-xl sm:text-2xl">Level {userLevel}</p>
                  <p className="text-xs text-gray-500">{userXP} XP</p>
                </div>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00]"
                />
              </div>
              <p className="text-gray-500 text-xs">До уровня {userLevel + 1}: {xpToNextLevel} XP</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/80 border-2 border-yellow-500/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ 
                      y: [0, -5, 0],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-3xl">🏆</span>
                  </motion.div>
                  <span className="text-gray-400 text-xs sm:text-sm">Рейтинг</span>
                </div>
                <span className="text-white font-bold text-lg sm:text-2xl">Топ-25%</span>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="inline-block"
                >
                  🎉
                </motion.span>
                {" "}Ты в топе!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* БЛОК 2: ДОМАШНЕЕ ЗАДАНИЕ */}
        <motion.div>
          <Card className="bg-zinc-900/80 border-2 border-[#00ff00]/30">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#00ff00]" />
                Текущее домашнее задание
              </CardTitle>
              <CardDescription className="text-gray-400">
                AI сгенерировал для тебя персональное задание
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Описание от AI */}
              <div className="p-4 bg-zinc-800/50 border border-[#00ff00]/20 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    <Brain className="w-6 h-6 text-[#00ff00] flex-shrink-0" />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold mb-2">Задание от AI-наставника:</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Создай простого Telegram-бота с использованием n8n. Бот должен уметь принимать текстовые сообщения, 
                      обрабатывать их через OpenAI и отправлять ответ пользователю. Используй вебхуки для получения сообщений.
                    </p>
                  </div>
                </div>
                
                {/* Требования */}
                <div className="mt-3 pt-3 border-t border-zinc-700">
                  <p className="text-gray-400 text-xs mb-2">📋 Требования:</p>
                  <ul className="text-gray-300 text-xs space-y-1 ml-4">
                    <li>• Настроенный вебхук в Telegram</li>
                    <li>• Интеграция с OpenAI API</li>
                    <li>• Скриншот рабочего workflow в n8n</li>
                    <li>• Краткое описание логики работы</li>
                  </ul>
                </div>
              </div>

              {/* Прогресс выполнения */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Прогресс выполнения</span>
                  <span className="text-sm font-bold text-[#00ff00]">0%</span>
                </div>
                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "0%" }}
                    className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00]"
                  />
                  {/* Пульсирующий эффект */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Начни работу и прогресс будет обновляться автоматически</p>
              </div>

              {/* Кнопка сдать */}
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full h-16 bg-gradient-to-r from-[#00ff00] to-[#00cc00] hover:from-[#00cc00] hover:to-[#00aa00] text-black font-bold text-lg shadow-lg shadow-[#00ff00]/50"
              >
                <Upload className="w-6 h-6 mr-3" />
                Сдать домашнее задание
              </Button>

              {/* Дополнительная информация */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Срок сдачи: через 3 дня</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-500">+100 XP за выполнение</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* БЛОК 3: МОИ ЦЕЛИ (автогенерация) */}
        <motion.div>
          <Card className="bg-zinc-900/80 border-2 border-purple-500/30">
            <CardHeader>
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                  Мои цели
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-400">
                  Цели формируются автоматически на основе твоего прогресса
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <AnimatePresence>
                  {myGoals.map((goal, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-zinc-800/50 border border-purple-500/30 rounded-lg"
                    >
                      <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      <p className="text-white flex-1 text-sm sm:text-base">{goal}</p>
                      <motion.span
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="text-xl"
                      >
                        🎯
                      </motion.span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* БЛОК 4: ЧЕЛЛЕНДЖ + СОВЕТЫ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/40">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-3xl sm:text-4xl"
                >
                  {todayChallenge.icon}
                </motion.div>
                <div>
                  <h3 className="text-white font-bold text-lg">{todayChallenge.title}</h3>
                  <Badge className="bg-yellow-600 text-white text-xs mt-1">+{todayChallenge.xp} XP</Badge>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-4">{todayChallenge.description}</p>
              {!challengeAccepted ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setChallengeAccepted(true);
                      toast({ title: "🎯 Челлендж принят!", description: "Удачи!" });
                    }}
                    className="flex-1 bg-yellow-600 text-white"
                  >
                    Принять
                  </Button>
                  <Button variant="ghost" className="flex-1 text-gray-400">Позже</Button>
                </div>
              ) : (
                <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-green-400 text-sm font-semibold">Челлендж принят!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-2 border-purple-500/40">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl sm:text-4xl"
                >
                  💡
                </motion.div>
                <h3 className="text-white font-bold text-base sm:text-lg">Совет дня</h3>
              </div>
              <p className="text-gray-300 text-sm">{todayTip}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/40">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-3xl sm:text-4xl"
                >
                  {todayHealthTip.icon}
                </motion.div>
                <h3 className="text-white font-bold text-base sm:text-lg">{todayHealthTip.title}</h3>
              </div>
              <p className="text-gray-300 text-sm">{todayHealthTip.text}</p>
            </CardContent>
          </Card>
        </div>

        {/* БЛОК 5: ВСЕ ДОСТИЖЕНИЯ */}
        <Card className="bg-zinc-900/80 border-2 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-3xl sm:text-4xl inline-block"
              >
                🏆
              </motion.span>
              Все достижения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="week" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="week" className="text-xs sm:text-sm">За неделю</TabsTrigger>
                <TabsTrigger value="month" className="text-xs sm:text-sm">За месяц</TabsTrigger>
                <TabsTrigger value="permanent" className="text-xs sm:text-sm">Постоянные</TabsTrigger>
              </TabsList>

              <TabsContent value="week">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allAchievements.week.map((ach: any, idx: number) => (
                    <motion.div 
                      key={ach.id} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-zinc-800/50 border-2 border-[#00ff00]/40 rounded-xl hover:border-[#00ff00]/60 transition-all"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                        className="text-4xl mb-2"
                      >
                        {ach.icon}
                      </motion.div>
                      <h4 className="text-white font-bold mb-1">{ach.title}</h4>
                      <p className="text-gray-400 text-xs">{ach.description}</p>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="month">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allAchievements.month.map((ach: any, idx: number) => (
                    <motion.div 
                      key={ach.id} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-zinc-800/50 border-2 border-yellow-500/40 rounded-xl hover:border-yellow-500/60 transition-all"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                        className="text-4xl mb-2"
                      >
                        {ach.icon}
                      </motion.div>
                      <h4 className="text-white font-bold mb-1">{ach.title}</h4>
                      <p className="text-gray-400 text-xs">{ach.description}</p>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="permanent">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {allAchievements.permanent.map((ach: any, idx: number) => (
                    <motion.div 
                      key={ach.id} 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 bg-zinc-800/50 border-2 border-purple-500/40 rounded-xl hover:border-purple-500/60 transition-all"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, delay: idx * 0.2 }}
                        className="text-4xl mb-2"
                      >
                        {ach.icon}
                      </motion.div>
                      <h4 className="text-white font-bold mb-1">{ach.title}</h4>
                      <p className="text-gray-400 text-xs">{ach.description}</p>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* БЛОК 6: FAQ */}
        <Card className="bg-zinc-900/80 border-2 border-[#00ff00]/30">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#00ff00]" />
              Часто задаваемые вопросы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left hover:text-[#00ff00]">
                    <span className="text-white">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-gray-300 mb-3">{item.answer}</p>
                    {item.lessonLink && (
                      <Button variant="outline" size="sm" className="border-[#00ff00]/30 text-[#00ff00]">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Открыть урок
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* БЛОК 7: ЧАТ С AI */}
        <div className="hidden md:grid md:grid-cols-1 gap-6">
          <Card className="bg-zinc-900/80 border-2 border-[#00ff00]/30 backdrop-blur-sm h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-6 h-6 text-[#00ff00]" />
                  <div>
                    <CardTitle className="text-xl font-bold text-white">Чат с AI</CardTitle>
                    <p className="text-xs text-gray-400">Всегда на связи</p>
                  </div>
                </div>
                <Button onClick={handleNewChat} variant="ghost" size="sm" className="text-[#00ff00]">
                  Новый чат
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-4 max-h-[500px]">
                <div className="space-y-4 py-4">
                  {isLoadingHistory ? (
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="w-8 h-8 text-[#00ff00] animate-spin" />
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-[#00ff00] text-black' : 'bg-zinc-800 text-white border border-[#00ff00]/20'}`}>
                            <div className="text-sm prose prose-invert prose-sm max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="icon" className="border-[#00ff00]/30 text-[#00ff00]" disabled={isSending}>
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    placeholder="Задай любой вопрос..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1 bg-zinc-800 border-[#00ff00]/30 text-white"
                    disabled={isSending}
                  />
                  <Button onClick={handleVoiceInput} variant="outline" size="icon" className="border-[#00ff00]/30 text-[#00ff00]" disabled={isSending}>
                    <Mic className="w-5 h-5" />
                  </Button>
                  <Button onClick={handleSendMessage} disabled={isSending || (!input.trim() && attachedFiles.length === 0)} className="bg-[#00ff00] text-black">
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">💬 Задавай любые вопросы — я здесь, чтобы помочь!</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* МОБИЛЬНАЯ ВЕРСИЯ */}
        <div className="md:hidden">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="chat">💬 Чат</TabsTrigger>
              <TabsTrigger value="dashboard">📊 Дашборд</TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <Card className="bg-zinc-900/80 border-2 border-[#00ff00]/30">
                <CardContent className="p-4">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4 py-4">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === 'user' ? 'bg-[#00ff00] text-black' : 'bg-zinc-800 text-white'}`}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2 mt-4">
                    <Input
                      placeholder="Задай вопрос..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="flex-1 bg-zinc-800 text-white"
                    />
                    <Button onClick={handleSendMessage} className="bg-[#00ff00] text-black">
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dashboard">
              <div className="space-y-4">
                {/* Метрики повторяются */}
                <Card className="bg-zinc-900/80 border-2 border-blue-500/30">
                  <CardContent className="p-6">
                    <p className="text-white font-bold">Прогресс: {courseProgress}%</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>

      {/* МОДАЛКА ЗАГРУЗКИ ДЗ */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsUploadModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-zinc-900 border-2 border-[#00ff00]/40 rounded-2xl p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-6 h-6 text-[#00ff00]" />
                  Загрузить ДЗ
                </h2>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer border-zinc-700 hover:border-[#00ff00]/50"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.onchange = (e: any) => {
                        if (e.target.files?.[0]) {
                          setUploadFile(e.target.files[0]);
                        }
                      };
                      input.click();
                    }}
                  >
                    {uploadFile ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-[#00ff00] mx-auto mb-2" />
                        <p className="text-white font-semibold">{uploadFile.name}</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400">Нажми или перетащи файл</p>
                      </>
                    )}
                  </div>
                </div>

                <Textarea placeholder="Комментарий..." className="bg-zinc-800 text-white min-h-[100px]" />

                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      if (uploadFile) {
                        toast({ title: "🎉 ДЗ отправлено!", description: "Скоро получишь обратную связь" });
                        setIsUploadModalOpen(false);
                        setUploadFile(null);
                      }
                    }}
                    className="flex-1 bg-[#00ff00] text-black font-bold"
                    disabled={!uploadFile}
                  >
                    Отправить
                  </Button>
                  <Button
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadFile(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NeuroHub;

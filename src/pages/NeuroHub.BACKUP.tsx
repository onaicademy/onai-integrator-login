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
          ? "bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 border-[#00FF88]/40"
          : inProgress
          ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/40"
          : "bg-zinc-900/30 border-zinc-700/50 opacity-60"
      }`}
    >
      <div className={`text-5xl mb-3 ${isLocked ? "grayscale" : ""}`}>
        {isLocked ? "🔒" : achievement.icon}
      </div>

      <h4 className="text-white font-bold text-sm mb-1 line-clamp-2">{achievement.title}</h4>
      <p className="text-gray-400 text-xs mb-3">{achievement.description}</p>

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

      {isLocked && achievement.requirement && (
        <div className="mt-2 p-2 bg-zinc-800/50 rounded text-xs text-gray-400 border border-zinc-700/50">
          💡 {achievement.requirement}
        </div>
      )}

      {isCompleted && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="w-6 h-6 text-[#00FF88]" />
        </div>
      )}

      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-zinc-900 border-2 border-[#00FF88]/60 rounded-lg p-2 w-48 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 shadow-xl">
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
      description: "Функция в разработке",
    });
  };

  const handleNewChat = async () => {
    const confirm = window.confirm('Начать новый чат?');
    if (!confirm) return;

    setMessages([{
      role: 'assistant',
      content: `Привет снова! 👋 Начнём новую беседу.`
    }]);
    
    toast({
      title: "✨ Новый чат создан!",
    });
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
        content: '😔 Извини, произошла ошибка.'
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
  const xpProgress = (userXP % 100);
  
  const totalLessonsCompleted = dashboardData?.week_activity?.reduce((sum: number, day: any) => sum + day.lessons_completed, 0) || 0;
  const totalLessons = 40;
  const completedLessons = Math.min(totalLessonsCompleted, totalLessons);
  const courseProgress = Math.round((completedLessons / totalLessons) * 100);

  const achievements: Achievement[] = dashboardData?.recent_achievements?.map((ach: any) => ({
    id: ach.id,
    icon: ach.icon,
    title: ach.title,
    description: `+${ach.xp_reward} XP`,
    isNew: true
  })) || [
    { id: "1", icon: "🔥", title: "Стрик 5 дней", description: "Занимайся 5 дней подряд", isNew: true },
    { id: "2", icon: "⚡", title: "Speedrunner", description: "Пройди урок за 10 минут" },
    { id: "3", icon: "🎯", title: "Точность", description: "100% выполнение ДЗ" },
  ];
  
  const allAchievements = {
    week: [
      { id: "w1", icon: "🔥", title: "Стрик 5 дней", description: "+50 XP", status: "completed" as const, progress: 100, category: "streak" },
      { id: "w2", icon: "📚", title: "3 урока за неделю", description: "+30 XP", status: "in_progress" as const, progress: 66, current: 2, target: 3, category: "lessons" },
    ],
    month: [
      { id: "m1", icon: "🏆", title: "10 уроков в месяц", description: "+100 XP", status: "in_progress" as const, progress: 70, current: 7, target: 10, category: "lessons" },
    ],
    permanent: [
      { id: "p1", icon: "🌟", title: "Первые шаги", description: "+20 XP", status: "completed" as const, progress: 100, category: "milestone" },
    ],
  };
  
  const totalAchievements = [...allAchievements.week, ...allAchievements.month, ...allAchievements.permanent];
  const completedCount = totalAchievements.filter(a => a.status === "completed").length;
  const inProgressCount = totalAchievements.filter(a => a.status === "in_progress").length;
  
  const dailyTips = [
    "💡 Учись каждый день по 15 минут — это лучше!",
    "🚀 Практикуй знания сразу!",
  ];
  
  const todayTip = dailyTips[new Date().getDate() % dailyTips.length];
  
  const dailyChallenges = [
    { id: 1, title: "Марафонец", description: "Пройди 2 урока", xp: 50, icon: "🏃" },
  ];
  
  const todayChallenge = dailyChallenges[0];

  const todayStats = dashboardData?.today_stats || { lessons_completed: 0, xp_earned: 0 };

  const particles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
    })), []
  );

  const faqItems = [
    {
      question: "🔗 Как настроить вебхук?",
      answer: "Вебхуки настраиваются в n8n...",
    }
  ];

  return (
    <div className="relative overflow-hidden min-h-screen bg-gradient-to-br from-black via-[#0a0a14] to-black">
      {/* Фон */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(to right, #00FF88 1px, transparent 1px),
              linear-gradient(to bottom, #00FF88 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Частицы */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full bg-[#00FF88]"
            style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            animate={{ y: ['-10%', '110%'], opacity: [0, 1, 0] }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* XP Popup */}
      <AnimatePresence>
        {showXPPopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-20 right-4 z-50"
          >
            <div className="bg-gradient-to-r from-[#00FF88] to-[#00cc88] text-black font-bold px-6 py-4 rounded-2xl flex items-center gap-3">
              <Zap className="w-8 h-8" />
              <div>
                <p className="text-2xl font-black">+{xpAmount} XP</p>
                <p className="text-sm">Отличная работа!</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Контент */}
      <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="relative inline-block mb-6">
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto"
              style={{ transformStyle: "preserve-3d" }}
            >
              <Brain className="w-20 h-20 text-[#00FF88] drop-shadow-[0_0_15px_rgba(0,255,136,0.6)]" />
            </motion.div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-3 text-white" style={{ textShadow: '0 0 20px rgba(0,255,136,0.3)' }}>
            AI-НАСТАВНИК
          </h1>
          <p className="text-gray-400">🤖 Твой персональный помощник</p>
        </motion.div>

        {/* Чат Desktop */}
        <div className="hidden lg:block">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-[#00FF88]/30 bg-black/50 h-[500px] flex flex-col">
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-[#00FF88]" />
                    Чат с AI
                  </CardTitle>
                  <Button size="sm" variant="outline" onClick={handleNewChat} className="border-[#00FF88]/30 text-[#00FF88]">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 px-6">
                {isLoadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00FF88]" />
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === "assistant" 
                            ? "bg-[#00FF88]/10 border border-[#00FF88]/30 text-white" 
                            : "bg-zinc-800/80 text-white"
                        }`}>
                          {msg.role === "assistant" ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {isSending && (
                      <div className="flex justify-start">
                        <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-2xl px-4 py-3">
                          <Loader2 className="w-4 h-4 animate-spin text-[#00FF88]" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <CardContent className="border-t border-[#00FF88]/20 pt-4">
                {attachedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1 text-sm">
                        <Paperclip className="w-3 h-3 text-[#00FF88]" />
                        <span className="text-white">{file.name}</span>
                        <button onClick={() => removeFile(idx)}>
                          <X className="w-3 h-3 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                  
                  <Button size="icon" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSending} className="border-[#00FF88]/30 text-[#00FF88]">
                    <Paperclip className="w-5 h-5" />
                  </Button>

                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    placeholder="Напиши сообщение..."
                    disabled={isSending}
                    className="flex-1 bg-zinc-900/50 border-[#00FF88]/30 text-white"
                  />

                  <Button onClick={handleSendMessage} size="icon" disabled={isSending || (!input.trim() && attachedFiles.length === 0)} className="bg-[#00FF88] hover:bg-[#00cc88] text-black">
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </Button>

                  <Button size="icon" variant="outline" onClick={handleVoiceInput} disabled={isSending} className="border-[#00FF88]/30 text-[#00FF88]">
                    <Mic className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Карточки прогресса */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <div className="grid grid-cols-4 gap-4">
              <Card className="border-[#00FF88]/20 bg-black/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-[#00FF88]" />
                    <p className="text-xs text-gray-500">Прогресс</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{courseProgress}%</p>
                  <div className="mt-2 h-1.5 bg-zinc-800/50 rounded-full">
                    <div className="h-full bg-[#00FF88]" style={{ width: `${courseProgress}%` }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#00FF88]/20 bg-black/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-4 h-4 text-[#00FF88]" />
                    <p className="text-xs text-gray-500">Streak</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{streak} дней</p>
                  <div className="mt-2 h-1.5 bg-zinc-800/50 rounded-full">
                    <div className="h-full bg-[#00FF88]" style={{ width: `${Math.min((streak / 30) * 100, 100)}%` }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-[#00FF88]/20 bg-black/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-[#00FF88]" />
                    <p className="text-xs text-gray-500">XP</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{userXP}</p>
                  <p className="text-xs text-gray-500 mt-1">Уровень {userLevel}</p>
                </CardContent>
              </Card>

              <Card className="border-[#00FF88]/20 bg-black/40">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-[#00FF88]" />
                    <p className="text-xs text-gray-500">Достижения</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{achievements.length}</p>
                  <div className="flex gap-1 mt-2">
                    {achievements.slice(0, 3).map((ach, idx) => (
                      <span key={idx} className="text-lg">{ach.icon}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Домашнее задание */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <Card className="border-[#00FF88]/40 bg-gradient-to-br from-[#00FF88]/10 to-black/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="w-6 h-6 text-[#00FF88]" />
                  Домашнее задание
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.active_missions?.length > 0 ? (
                  dashboardData.active_missions.slice(0, 1).map((mission: any) => (
                    <div key={mission.id}>
                      <h3 className="text-lg font-semibold text-white mb-2">{mission.title}</h3>
                      <p className="text-sm text-gray-400 mb-3">{mission.description}</p>
                      <div className="h-3 bg-zinc-800/50 rounded-full mb-4">
                        <div className="h-full bg-[#00FF88]" style={{ width: `${mission.progress_percent}%` }} />
                      </div>
                      <Button className="w-full bg-[#00FF88] hover:bg-[#00cc88] text-black font-bold" onClick={() => setIsUploadModalOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Сдать задание
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <div className="text-6xl mb-3">🎯</div>
                    <p className="text-white">Пока нет активных заданий</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Челлендж */}
          {!challengeAccepted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <Card className="border-[#00FF88]/30 bg-black/40">
                <CardContent className="py-4 px-6">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{todayChallenge.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm text-[#00FF88] font-bold">🎯 Челлендж дня</p>
                      <h3 className="text-lg font-bold text-white mb-1">{todayChallenge.title}</h3>
                      <p className="text-sm text-gray-400 mb-3">{todayChallenge.description}</p>
                      <Badge className="bg-[#00FF88]/20 text-[#00FF88]">+{todayChallenge.xp} XP</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => setChallengeAccepted(true)} className="flex-1 bg-[#00FF88] hover:bg-[#00cc88] text-black font-bold">
                      ✅ Принять
                    </Button>
                    <Button variant="outline" onClick={() => setChallengeAccepted(true)} className="border-[#00FF88]/30 text-white">
                      Позже
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Совет дня */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <Card className="border-[#00FF88]/20 bg-black/40">
              <CardContent className="py-4 px-6">
                <div className="flex items-center gap-4">
                  <Lightbulb className="w-8 h-8 text-[#00FF88]" />
                  <div>
                    <p className="text-xs text-gray-500 font-semibold">💡 Совет дня</p>
                    <p className="text-white">{todayTip}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden">
          <Tabs defaultValue="chat">
            <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 border border-[#00FF88]/30">
              <TabsTrigger value="chat" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black">
                💬 Чат
              </TabsTrigger>
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black">
                📊 Дашборд
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="mt-6">
              <Card className="border-[#00FF88]/30 bg-black/50 h-[450px] flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Чат с AI</CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1 px-4">
                  <div className="space-y-4 pb-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === "assistant" ? "bg-[#00FF88]/10 border border-[#00FF88]/30 text-white" : "bg-zinc-800/80 text-white"
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <CardContent className="border-t border-[#00FF88]/20 pt-4">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Напиши..."
                      disabled={isSending}
                      className="flex-1 bg-zinc-900/50 border-[#00FF88]/30 text-white"
                    />
                    <Button onClick={handleSendMessage} size="icon" disabled={isSending} className="bg-[#00FF88] text-black">
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="dashboard" className="mt-6 space-y-4">
              <Card className="border-[#00FF88]/30 bg-black/50">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-400 mb-2">📊 Прогресс</p>
                  <p className="text-3xl font-bold text-white">{courseProgress}%</p>
                  <div className="mt-3 h-2 bg-zinc-800 rounded-full">
                    <div className="h-full bg-[#00FF88]" style={{ width: `${courseProgress}%` }} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Все достижения */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <Card className="border-[#00FF88]/30 bg-black/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-7 h-7 text-[#00FF88]" />
                  <div>
                    <CardTitle className="text-white">Все достижения</CardTitle>
                    <p className="text-sm text-gray-400 mt-1">
                      {completedCount} из {totalAchievements.length} получено
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="week">
                <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50 border border-[#00FF88]/20 mb-6">
                  <TabsTrigger value="week" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">
                    📅 Неделя
                  </TabsTrigger>
                  <TabsTrigger value="month" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">
                    📆 Месяц
                  </TabsTrigger>
                  <TabsTrigger value="permanent" className="data-[state=active]:bg-[#00FF88]/20 data-[state=active]:text-[#00FF88]">
                    ⭐ Постоянные
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="week">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {allAchievements.week.map((achievement, idx) => (
                      <AchievementCard key={achievement.id} achievement={achievement} index={idx} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="month">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {allAchievements.month.map((achievement, idx) => (
                      <AchievementCard key={achievement.id} achievement={achievement} index={idx} />
                    ))}
                  </div>
                </TabsContent>

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

        {/* FAQ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <Card className="border-[#00FF88]/30 bg-black/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#00FF88]" />
                Частые вопросы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border border-[#00FF88]/20 rounded-lg px-4 data-[state=open]:bg-[#00FF88]/5">
                    <AccordionTrigger className="text-white hover:text-[#00FF88]">
                      <span>{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-400 pb-4">
                      <p>{item.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </motion.div>

      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50"
              onClick={() => setIsUploadModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              <Card className="border-[#00FF88]/30 bg-zinc-900">
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle className="text-white">Загрузить задание</CardTitle>
                    <Button size="icon" variant="ghost" onClick={() => setIsUploadModalOpen(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-[#00FF88]/30 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-white">Нажми или перетащи файл</p>
                  </div>
                  <Button className="w-full bg-[#00FF88] text-black font-bold" onClick={() => {
                    toast({ title: "✅ Задание отправлено!" });
                    setIsUploadModalOpen(false);
                  }}>
                    Отправить
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NeuroHub;


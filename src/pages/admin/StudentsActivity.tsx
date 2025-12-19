import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  UserPlus,
  Users,
  Zap,
  Clock,
  Eye,
  UserX,
  Mail,
  Phone,
  Key,
  Calendar,
  Shield,
  TrendingUp,
  Info,
  Copy,
  Loader2,
  AlertCircle,
  Award,
  Flame,
  Target,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/utils/apiClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentCuratorChats } from "@/components/admin/StudentCuratorChats";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type StudentRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  last_login_at?: string | null;
  last_active_date?: string | null;
  account_expires_at?: string | null;
  deleted_at?: string | null;
  deactivation_reason?: string | null;
  total_xp?: number | null;
  level?: number | null;
  streak_days?: number | null;
  total_study_time?: number | null;
  courses?: Array<{
    course_id: number;
    course_name: string;
    course_slug: string;
    progress_percentage: number;
    completed_modules?: number; // ✅ Для фильтрации по прогрессу
    total_modules?: number; // ✅ Для фильтрации по прогрессу
    enrolled_at?: string;
  }>;
};

// Mock данные для демонстрации
const mockCourseProgress = [
  { title: "Интегратор 2.0", progress: 75, completedModules: 6, totalModules: 8, completedLessons: 45, totalLessons: 60 },
  { title: "Креатор", progress: 40, completedModules: 2, totalModules: 4, completedLessons: 15, totalLessons: 35 },
];

const mockRecentActivity = [
  { type: "lesson_completed", description: "Завершен урок 'Введение в Webhooks'", date: "2 часа назад" },
  { type: "xp_earned", description: "Заработано 50 XP за прохождение теста", date: "4 часа назад" },
  { type: "module_completed", description: "Завершен модуль 'Основы автоматизации'", date: "Вчера" },
];

export default function StudentsActivity() {
  const [allStudents, setAllStudents] = useState<StudentRow[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  // ✅ НОВЫЕ ФИЛЬТРЫ: по прогрессу обучения
  const [filter, setFilter] = useState<"all" | "completed" | "in-progress" | "not-started">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const { toast } = useToast();

  const isRecentlyActive = (student: StudentRow, threshold: Date) => {
    if (!student.is_active) return false;
    if (!student.last_active_date) return true;

    const lastActive = new Date(student.last_active_date);
    return lastActive >= threshold;
  };

  // Модалы
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvitationResult, setShowInvitationResult] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Форма
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    password: '',
    role: 'student',
    accountDuration: '12',
    selectedCourses: [] as number[] // ✅ Изменено: числовые ID курсов
  });

  // Загрузка студентов при монтировании компонента
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (isMounted) {
        await fetchStudents();
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStudents = async (searchTerm = "") => {
    console.log('📋 StudentsActivity: fetchStudents вызван, searchTerm:', searchTerm);
    setIsLoading(true);
    setSessionError(null);

    try {
      console.log('📤 Запрос student_profiles...');
      
      // Даём время на инициализацию auth перед запросом
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('⏳ После 500ms delay, начинаем запрос');
      
      // Создаём контроллер для timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 сек timeout
      
      try {
        // ✅ ИСПОЛЬЗУЕМ TRIPWIRE API ENDPOINT ДЛЯ ПОЛУЧЕНИЯ СТУДЕНТОВ С ПРОГРЕССОМ!
        console.log('🔥 Запрашиваем студентов через /api/tripwire/admin/students...');
        const response = await api.get('/api/tripwire/admin/students');
        
        clearTimeout(timeoutId);
        
        console.log('✅ Получен ответ от Tripwire API:', response);

        if (!response || !response.students) {
          console.warn('⚠️ Нет студентов в ответе');
          setAllStudents([]);
          return;
        }

        const tripwireStudents = response.students;
        console.log(`✅ Получено ${tripwireStudents.length} Tripwire студентов`);

      const mapped: StudentRow[] =
        tripwireStudents?.map((student: any) => {
          return {
            id: student.id,
            email: student.email || "",
            full_name: student.full_name || student.email || "Без имени",
            role: "student", // ✅ Tripwire студенты всегда student
            is_active: true, // ✅ Если они в списке, значит активны
            last_login_at: student.last_sign_in_at || student.created_at,
            last_active_date: student.last_sign_in_at || null,
            account_expires_at: null, // ✅ Tripwire не имеет срока действия
            deleted_at: null,
            deactivation_reason: null,
            total_xp: 0, // ✅ У Tripwire нет XP системы (или можно добавить позже)
            level: 1, // ✅ У Tripwire нет уровней
            streak_days: 0, // ✅ У Tripwire нет стрика
            total_study_time: 0, // ✅ Нет данных о времени обучения (можно добавить)
            // ✅ ГЛАВНОЕ: ПРОГРЕСС ПО TRIPWIRE МОДУЛЯМ!
            courses: [{
              course_id: 13, // ✅ Tripwire course ID
              course_name: "Tripwire: Интегратор Вводный",
              course_slug: "tripwire",
              progress_percentage: student.progress_percent || 0, // ✅ РЕАЛЬНЫЙ ПРОГРЕСС!
              // ✅ Добавляем дополнительные данные для отображения
              completed_modules: student.completed_modules || 0,
              total_modules: student.total_modules || 3,
              enrolled_at: student.enrolled_at || student.created_at,
            }],
          };
        }) ?? [];

      console.log(`✅ Смаппировано ${mapped.length} Tripwire студентов с РЕАЛЬНЫМ прогрессом`);
      console.log('📊 Пример студента:', mapped[0]);

      console.log('📊 Первые 3 студента с курсами:', mapped.slice(0, 3));
      setAllStudents(mapped);
      
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error('❌ ИСКЛЮЧЕНИЕ при загрузке:', err.message);
        throw err;
      }
    } catch (error: any) {
      console.error("❌ Исключение при загрузке:", error);

      if (error?.message?.toLowerCase().includes("jwt") || error?.code === "403") {
        setSessionError("Сессия истекла. Войдите заново, чтобы продолжить работу.");
      }

      toast({
        title: "❌ Ошибка",
        description: error?.message || "Критическая ошибка загрузки",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStudents = async () => {
    const activeSearch = searchQuery.trim();
    if (activeSearch) {
      await fetchStudents(activeSearch);
    } else {
      await fetchStudents();
    }
  };

  // Поиск студентов
  const handleSearch = async () => {
    await refreshStudents();
  };

  // Добавление пользователя
  const handleAddStudent = async () => {
    // Валидация
    if (!formData.email || !formData.fullName || !formData.phone || !formData.password) {
      toast({
        title: "⚠️ Ошибка",
        description: "Заполните все обязательные поля!",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "⚠️ Ошибка",
        description: "Пароль должен быть минимум 8 символов!",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.includes('@')) {
      toast({
        title: "⚠️ Ошибка",
        description: "Неверный формат email!",
        variant: "destructive",
      });
      return;
    }

    // Проверка пароля (только латиница)
    const latinOnly = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
    if (!latinOnly.test(formData.password)) {
      toast({
        title: "⚠️ Ошибка",
        description: "Пароль должен содержать только латинские буквы и символы!",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('📤 Создание пользователя:', formData);
      
      // Вычисляем дату истечения аккаунта (ТОЛЬКО для студентов)
      const expiresAt = formData.role === 'student' 
        ? (() => {
            const date = new Date();
            date.setMonth(date.getMonth() + parseInt(formData.accountDuration));
            return date.toISOString();
          })()
        : null; // Для не-студентов = NULL (вечный доступ)
      
      if (formData.role === 'student') {
        console.log('📅 Срок действия:', formData.accountDuration, 'месяцев');
        console.log('📅 Истекает:', expiresAt);
      } else {
        console.log('📅 Срок действия: вечный (role !== student)');
      }
      
      // ✅ Вызываем Backend API для создания студента (с JWT токеном через apiClient)
      const data = await api.post('/api/students/create', {
        email: formData.email.trim(),
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        account_expires_at: expiresAt,
        course_ids: formData.selectedCourses, // ✅ Массив чисел (уже правильный тип)
      });

      if (data.success) {
        // Сохраняем данные для показа
        setInvitationData({
          invitation_url: `https://onai.academy`,
          email: data.credentials.email,
          temp_password: formData.password,
        });

        // Обновляем список студентов
        await refreshStudents();

        setShowAddModal(false);
        setShowInvitationResult(true);
        
        // Очистить форму
        setFormData({
          email: '',
          fullName: '',
          phone: '',
          password: '',
          role: 'student',
          accountDuration: '12',
          selectedCourses: []
        });

        toast({
          title: "✅ Пользователь создан!",
          description: `${formData.fullName} успешно добавлен на платформу`,
        });
      }
    } catch (error: any) {
      console.error('❌ Ошибка создания пользователя:', error);
      toast({
        title: "❌ Ошибка создания",
        description: error.message || "Не удалось создать пользователя",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Копирование
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "✅ Скопировано!",
      description: `${label} скопирован в буфер обмена`,
    });
  };

  // Деактивация
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('⛔ Деактивировать студента навсегда?\n\nПользователь НЕ СМОЖЕТ войти на платформу.\nВсе его данные сохранятся в базе.')) return;
    
    try {
      console.log('⛔ Деактивация студента:', studentId);
      
      // ✅ ИСПРАВЛЕНИЕ: Обновляем users вместо student_profiles
      const { error } = await supabase
        .from('users')
        .update({ 
          role: 'inactive', // Меняем роль на inactive
        })
        .eq('id', studentId);
      
      if (error) {
        console.error('❌ Ошибка деактивации:', error);
        toast({
          title: "❌ Ошибка",
          description: 'Ошибка деактивации: ' + error.message,
          variant: "destructive",
        });
        return;
      }
      
      console.log('✅ Студент деактивирован');
      toast({
        title: "✅ Студент деактивирован",
        description: "Пользователь больше не сможет войти на платформу. Данные сохранены.",
      });
      
      await refreshStudents();
      
    } catch (error: any) {
      console.error('❌ Исключение при деактивации:', error);
      toast({
        title: "❌ Ошибка",
        description: "Ошибка деактивации студента",
        variant: "destructive",
      });
    }
  };

  // Статистика
  const stats = useMemo(() => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 7);

    const activeStudents = allStudents.filter((student) => student.is_active !== false);
    
    const total = activeStudents.length;
    const active = activeStudents.filter((student) =>
      isRecentlyActive(student, threshold)
    ).length;
    const inactive = total - active;

    // ✅ НОВАЯ СТАТИСТИКА: по прогрессу обучения
    const getProgress = (student: StudentRow) => {
      if (!student.courses || student.courses.length === 0) return { completed: 0, total: 3 };
      return {
        completed: student.courses[0].completed_modules || 0,
        total: student.courses[0].total_modules || 3,
      };
    };

    const completed = activeStudents.filter((student) => {
      const { completed, total } = getProgress(student);
      return completed >= total;
    }).length;

    const inProgress = activeStudents.filter((student) => {
      const { completed, total } = getProgress(student);
      return completed > 0 && completed < total;
    }).length;

    const notStarted = activeStudents.filter((student) => {
      const { completed } = getProgress(student);
      return completed === 0;
    }).length;

    return { total, active, inactive, completed, inProgress, notStarted };
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    const activeOnly = allStudents.filter((student) => student.is_active !== false);

    const getProgress = (student: StudentRow) => {
      if (!student.courses || student.courses.length === 0) return { completed: 0, total: 3 };
      return {
        completed: student.courses[0].completed_modules || 0,
        total: student.courses[0].total_modules || 3,
      };
    };

    // ✅ ФИЛЬТРАЦИЯ ПО ПРОГРЕССУ ОБУЧЕНИЯ
    let filtered = activeOnly;

    if (filter === "completed") {
      // Кто закончил обучение (completed_modules >= total_modules)
      filtered = activeOnly.filter((student) => {
        const { completed, total } = getProgress(student);
        return completed >= total;
      });
    } else if (filter === "in-progress") {
      // Кто проходит обучение (0 < completed_modules < total_modules)
      filtered = activeOnly.filter((student) => {
        const { completed, total } = getProgress(student);
        return completed > 0 && completed < total;
      });
    } else if (filter === "not-started") {
      // Кто не начинал обучение (completed_modules === 0)
      filtered = activeOnly.filter((student) => {
        const { completed } = getProgress(student);
        return completed === 0;
      });
    }

    // ✅ СОРТИРОВКА: СВЕРХУ КТО ЗАКОНЧИЛ, ВНИЗУ КТО НЕ ЗАКОНЧИЛ
    return filtered.sort((a, b) => {
      const progressA = getProgress(a);
      const progressB = getProgress(b);

      // Процент завершения
      const percentA = progressA.total > 0 ? (progressA.completed / progressA.total) * 100 : 0;
      const percentB = progressB.total > 0 ? (progressB.completed / progressB.total) * 100 : 0;

      // Сортируем по убыванию процента (100% сверху, 0% внизу)
      return percentB - percentA;
    });
  }, [allStudents, filter]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Animated grid */}
        <div
          className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-repeat opacity-5"
        />
        {/* Green blur blobs */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full bg-[#00FF88]/10 blur-3xl"
          style={{ top: '10%', left: '10%' }}
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-[#00FF88]/8 blur-3xl"
          style={{ bottom: '15%', right: '10%' }}
          animate={{
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-[#00FF88]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white font-display">Участники</h1>
              <p className="text-gray-400 text-sm">Управление студентами платформы</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#00FF88] text-black hover:bg-[#00cc88] shadow-[0_0_20px_rgba(0,255,136,0.3)] hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Добавить участника
          </Button>
        </motion.div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Всего участников", value: stats.total, icon: Users, color: "#00FF88" },
            { label: "Активных", value: stats.active, icon: Zap, color: "#00FF88" },
            { label: "Неактивных", value: stats.inactive, icon: Clock, color: "#666666" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative bg-zinc-900 border border-[#00FF88]/20 rounded-lg p-5 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#00FF88]/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Поиск и Фильтры */}
        <Card className="mb-8 bg-zinc-900 border-[#00FF88]/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
                <Input
                  placeholder="Поиск по имени или email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]/50 focus:ring-0"
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading} className="bg-[#00FF88] text-black hover:bg-[#00cc88]">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Найти'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
                className={filter === "all" ? "bg-[#00FF88] text-black hover:bg-[#00cc88]" : "border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:border-[#00FF88]/30"}
              >
                <Users className="w-4 h-4 mr-2" />
                Все <Badge className="ml-2 bg-zinc-700 text-white">{stats.total}</Badge>
              </Button>
              <Button
                variant={filter === "completed" ? "default" : "outline"}
                onClick={() => setFilter("completed")}
                className={filter === "completed" ? "bg-[#00FF88] text-black hover:bg-[#00cc88]" : "border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:border-[#00FF88]/30"}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Кто закончил <Badge className="ml-2 bg-green-600 text-white">{stats.completed}</Badge>
              </Button>
              <Button
                variant={filter === "in-progress" ? "default" : "outline"}
                onClick={() => setFilter("in-progress")}
                className={filter === "in-progress" ? "bg-[#00FF88] text-black hover:bg-[#00cc88]" : "border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:border-[#00FF88]/30"}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Кто не закончил <Badge className="ml-2 bg-orange-600 text-white">{stats.inProgress}</Badge>
              </Button>
              <Button
                variant={filter === "not-started" ? "default" : "outline"}
                onClick={() => setFilter("not-started")}
                className={filter === "not-started" ? "bg-[#00FF88] text-black hover:bg-[#00cc88]" : "border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:border-[#00FF88]/30"}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Не проходил обучение <Badge className="ml-2 bg-red-600 text-white">{stats.notStarted}</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {sessionError && (
          <Card className="mb-6 border-red-500/40 bg-red-500/10">
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-500">Требуется повторный вход</h3>
                  <p className="text-sm text-red-400">{sessionError}</p>
                </div>
              </div>
              <Button variant="outline" onClick={refreshStudents} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                Обновить
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Таблица */}
        <Card className="bg-zinc-900 border-[#00FF88]/20">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                  <TableHead className="text-gray-300">Имя</TableHead>
                  <TableHead className="text-gray-300">Email</TableHead>
                  <TableHead className="text-gray-300">Роль</TableHead>
                  <TableHead className="text-gray-300">Назначенные курсы</TableHead>
                  <TableHead className="text-gray-300">Статус</TableHead>
                  <TableHead className="text-gray-300">Последняя активность</TableHead>
                  <TableHead className="text-right text-gray-300">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id} className="border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                    <TableCell className="font-medium text-white flex items-center gap-2">
                      <Avatar className="h-7 w-7 border border-[#00FF88]/30">
                        <AvatarFallback className="bg-[#00FF88]/10 text-[#00FF88] text-xs">
                          {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}</AvatarFallback>
                      </Avatar>
                      {student.full_name}
                    </TableCell>
                    <TableCell className="text-gray-300">{student.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-zinc-700 text-gray-300 border-zinc-600">
                        {student.role}
                      </Badge>
                    </TableCell>
                    {/* ✅ Назначенные курсы */}
                    <TableCell>
                      {student.courses && student.courses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {student.courses.map((course) => {
                            const courseIcon = '🎓'; // Tripwire icon
                            const courseColor = 'bg-green-600/20 text-[#00FF88] border-green-500/30'; // onAI green
                            const completedModules = course.completed_modules || 0;
                            const totalModules = course.total_modules || 3;
                            return (
                              <Badge
                                key={course.course_id}
                                variant="outline"
                                className={`text-xs ${courseColor}`}
                                title={`${course.course_name} - ${completedModules}/${totalModules} модулей`}
                              >
                                {courseIcon} {completedModules}/{totalModules}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">Нет курсов</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-black ${student.is_active ? 'bg-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)]' : 'bg-gray-500'}`}>
                        {student.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {student.last_active_date
                        ? new Date(student.last_active_date).toLocaleDateString()
                        : "Нет данных"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setSelectedStudent(student)}
                          title="Просмотр деталей"
                          className="border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:border-[#00FF88]/30"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDeleteStudent(student.id)}
                          title="Деактивировать участника"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Модал добавления */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="max-w-2xl bg-zinc-950 border-[#00FF88]/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#00FF88]">Добавить участника</DialogTitle>
              <DialogDescription className="text-gray-400">
                Создайте новый аккаунт для студента, куратора или администратора.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-gray-300 flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-[#00FF88]" /> Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]/50 focus:ring-0"
                />
              </div>
              {/* Полное имя */}
              <div>
                <Label htmlFor="fullName" className="text-gray-300 flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-[#00FF88]" /> Полное имя <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  placeholder="Иван Иванов"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]/50 focus:ring-0"
                />
              </div>
              {/* Телефон */}
              <div>
                <Label htmlFor="phone" className="text-gray-300 flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-[#00FF88]" /> Телефон <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 777 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]/50 focus:ring-0"
                />
              </div>
              {/* Пароль */}
              <div>
                <Label htmlFor="password" className="text-gray-300 flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-[#00FF88]" /> Пароль <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Минимум 8 символов"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  minLength={8}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]/50 focus:ring-0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Минимум 8 символов (только латиница и символы)
                </p>
              </div>
              {/* Роль */}
              <div>
                <Label htmlFor="role" className="text-gray-300 flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-[#00FF88]" /> Роль <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                  <SelectTrigger id="role" className="bg-zinc-800 border-zinc-700 text-white focus:border-[#00FF88]/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value="student">🎓 Студент</SelectItem>
                    <SelectItem value="curator">👨‍🏫 Куратор</SelectItem>
                    <SelectItem value="tech_support">🛠️ Тех специалист</SelectItem>
                    <SelectItem value="admin">👑 Админ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Срок действия аккаунта - ТОЛЬКО для студентов */}
              {formData.role === 'student' && (
                <div>
                  <Label htmlFor="accountDuration" className="text-gray-300 flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-[#00FF88]" /> Срок доступа <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.accountDuration} onValueChange={(value) => setFormData({...formData, accountDuration: value})}>
                    <SelectTrigger id="accountDuration" className="bg-zinc-800 border-zinc-700 text-white focus:border-[#00FF88]/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                      <SelectItem value="3">⏱️ 3 месяца</SelectItem>
                      <SelectItem value="6">📅 6 месяцев (полгода)</SelectItem>
                      <SelectItem value="12">📆 12 месяцев (год)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    После истечения срока аккаунт будет автоматически деактивирован
                  </p>
                </div>
              )}
              {/* Курсы */}
              <div className="md:col-span-2">
                <Label className="text-gray-300 flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[#00FF88]" /> Назначенные курсы
                  <div className="relative group">
                    <Info className="w-3 h-3 text-gray-500 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-zinc-800 text-white text-xs rounded-md shadow-lg z-10 border border-zinc-700">
                      Выберите курсы, к которым у пользователя будет доступ.
                    </div>
                  </div>
                </Label>
                <div className="space-y-2 mt-2">
                  {/* Курс 1: Интегратор 2.0 */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="course-integrator"
                      checked={formData.selectedCourses.includes(1)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            selectedCourses: [...prev.selectedCourses, 1]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            selectedCourses: prev.selectedCourses.filter(id => id !== 1)
                          }));
                        }
                      }}
                      className="border-zinc-700 data-[state=checked]:bg-[#00FF88] data-[state=checked]:text-black"
                    />
                    <label htmlFor="course-integrator" className="text-sm text-gray-300 cursor-pointer">
                      📚 Интегратор 2.0
                    </label>
                  </div>
                  {/* Курс 2: Креатор 2.0 */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="course-creator"
                      checked={formData.selectedCourses.includes(2)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            selectedCourses: [...prev.selectedCourses, 2]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            selectedCourses: prev.selectedCourses.filter(id => id !== 2)
                          }));
                        }
                      }}
                      className="border-zinc-700 data-[state=checked]:bg-[#00FF88] data-[state=checked]:text-black"
                    />
                    <label htmlFor="course-creator" className="text-sm text-gray-300 cursor-pointer">
                      🎨 Креатор 2.0
                    </label>
                  </div>
                  {/* Курс 3: Программист на Cursor */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="course-programmer"
                      checked={formData.selectedCourses.includes(3)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({
                            ...prev,
                            selectedCourses: [...prev.selectedCourses, 3]
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            selectedCourses: prev.selectedCourses.filter(id => id !== 3)
                          }));
                        }
                      }}
                      className="border-zinc-700 data-[state=checked]:bg-[#00FF88] data-[state=checked]:text-black"
                    />
                    <label htmlFor="course-programmer" className="text-sm text-gray-300 cursor-pointer">
                      💻 Программист на Cursor
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:border-gray-500">
                Отмена
              </Button>
              <Button onClick={handleAddStudent} disabled={isLoading} className="bg-[#00FF88] text-black hover:bg-[#00cc88]">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Создание...
                  </>
                ) : (
                  'Создать аккаунт'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Модал результата */}
        <Dialog open={showInvitationResult} onOpenChange={setShowInvitationResult}>
          <DialogContent className="max-w-2xl bg-zinc-950 border-[#00FF88]/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#00FF88]">Аккаунт успешно создан!</DialogTitle>
              <DialogDescription className="text-gray-400">
                Поделитесь этими данными с новым участником.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-gray-400">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <div className="flex gap-2">
                  <Input value={invitationData?.email || ""} readOnly className="bg-zinc-800 border-zinc-700 text-white focus:ring-0" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(invitationData?.email, 'Email')}
                    className="border-zinc-800 hover:bg-zinc-900"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-gray-400">
                  <Key className="w-4 h-4" />
                  Временный пароль
                </Label>
                <div className="flex gap-2">
                  <Input value={invitationData?.temp_password || ""} readOnly className="bg-zinc-800 border-zinc-700 text-white focus:ring-0" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(invitationData?.temp_password, 'Пароль')}
                    className="border-zinc-800 hover:bg-zinc-900"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm text-gray-400">
                  <Info className="w-4 h-4" />
                  Ссылка для входа
                </Label>
                <div className="flex gap-2">
                  <Input value={invitationData?.invitation_url || ""} readOnly className="bg-zinc-800 border-zinc-700 text-white focus:ring-0" />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(invitationData?.invitation_url, 'Ссылка')}
                    className="border-zinc-800 hover:bg-zinc-900"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowInvitationResult(false)} className="bg-[#00FF88] text-black hover:bg-[#00cc88]">Готово</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Модал деталей студента */}
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-3xl bg-zinc-950 border-[#00FF88]/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#00FF88]">
                Детали участника: {selectedStudent?.full_name}
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Подробная информация и статистика по обучению.
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid w-full grid-cols-2 bg-black border border-gray-800">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-sm">
                    Обзор
                  </TabsTrigger>
                  <TabsTrigger value="ai-chats" className="data-[state=active]:bg-[#00FF88] data-[state=active]:text-black text-white text-sm">
                    AI Чаты
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4">
                    {/* Общая информация */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoCard icon={Mail} label="Email" value={selectedStudent.email} />
                      <InfoCard icon={Shield} label="Роль" value={selectedStudent.role} />
                      <InfoCard
                        icon={CheckCircle}
                        label="Статус"
                        value={selectedStudent.is_active ? "Активен" : "Неактивен"}
                        valueColor={selectedStudent.is_active ? "text-[#00FF88]" : "text-red-500"}
                      />
                      <InfoCard
                        icon={Calendar}
                        label="Срок доступа"
                        value={selectedStudent.account_expires_at ? new Date(selectedStudent.account_expires_at).toLocaleDateString() : "Бессрочно"}
                      />
                    </div>

                    {/* Статистика обучения */}
                    <h3 className="text-xl font-bold text-white border-b border-zinc-800 pb-2 mb-4">
                      Статистика обучения
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatDisplayCard icon={Award} label="XP Очков" value={selectedStudent.total_xp || 0} color="#00FF88" />
                      <StatDisplayCard icon={Target} label="Уровень" value={selectedStudent.level || 1} color="#00FF88" />
                      <StatDisplayCard icon={Flame} label="Стрик" value={`${selectedStudent.streak_days || 0} дней`} color="#ff8c00" />
                      <StatDisplayCard icon={Clock} label="Часов на платформе" value={`${((selectedStudent.total_study_time || 0) / 60).toFixed(1)} ч`} color="#00bfff" />
                    </div>

                    {/* Прогресс по курсам */}
                    <h3 className="text-xl font-bold text-white border-b border-zinc-800 pb-2 mb-4">
                      Прогресс по курсам
                    </h3>
                    <div className="space-y-4">
                      {selectedStudent.courses && selectedStudent.courses.length > 0 ? (
                        selectedStudent.courses.map((course, index) => (
                          <div key={index} className="p-4 bg-zinc-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-white">{course.course_name}</h4>
                              <p className="text-sm text-gray-400">{course.progress_percentage}%</p>
                            </div>
                            <Progress value={course.progress_percentage} className="h-2 bg-zinc-700 [&>*]:bg-[#00FF88]" />
                            <p className="text-xs text-gray-500 mt-1">
                              {course.completed_modules || 0} / {course.total_modules || 3} модулей завершено
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400">Нет данных о прогрессе</p>
                      )}
                    </div>

                    {/* Последняя активность */}
                    <h3 className="text-xl font-bold text-white border-b border-zinc-800 pb-2 mb-4">
                      Последняя активность
                    </h3>
                    <div className="space-y-3">
                      {mockRecentActivity.map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                          <div className="w-8 h-8 rounded-full bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
                            {activity.type === 'lesson_completed' && <CheckCircle className="w-4 h-4 text-[#00FF88]" />}
                            {activity.type === 'module_completed' && <Award className="w-4 h-4 text-[#00FF88]" />}
                            {activity.type === 'xp_earned' && <Zap className="w-4 h-4 text-[#00FF88]" />}
                          </div>
                          <p className="text-sm text-gray-300">
                            {activity.description} <span className="text-gray-500 text-xs">({activity.date})</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ai-chats" className="mt-4">
                  <StudentCuratorChats userId={selectedStudent.id} />
                </TabsContent>
              </Tabs>
            )}
            <DialogFooter className="mt-6">
              <Button onClick={() => setSelectedStudent(null)} className="bg-[#00FF88] text-black hover:bg-[#00cc88]">Закрыть</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Вспомогательные компоненты
function InfoCard({ icon: Icon, label, value, valueColor = "text-white" }: any) {
  return (
    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#00FF88]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#00FF88]" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className={`text-sm font-medium ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

function StatDisplayCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 text-center shadow-md">
      <div className="w-12 h-12 rounded-full bg-[#00FF88]/10 flex items-center justify-center mx-auto mb-2">
        <Icon className="w-6 h-6" style={{ color: color }} />
      </div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function CourseProgressCard({ course }: any) {
  return (
    <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-white">{course.title}</p>
        <p className="text-sm text-gray-400">{course.progress}%</p>
      </div>
      <Progress value={course.progress} className="h-2 bg-zinc-800 [&>*]:bg-[#00FF88]" />
      <p className="text-xs text-gray-500 mt-1">{course.completedModules}/{course.totalModules} модулей, {course.completedLessons}/{course.totalLessons} уроков</p>
    </div>
  );
}

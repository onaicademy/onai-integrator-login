import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  UserPlus,
  Key,
  UserX,
  CheckCircle,
  Copy,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function StudentsActivity() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Модалы
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvitationResult, setShowInvitationResult] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Форма (НОВАЯ СТРУКТУРА)
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '', // ← НОВОЕ
    password: '', // ← НОВОЕ
    role: 'student',
    accountDuration: '12', // ← НОВОЕ: срок в месяцах (3, 6, 12)
    selectedCourses: [] as string[]
  });

  // Загрузка студентов при монтировании компонента
  useEffect(() => {
    console.log('📋 StudentsActivity: Компонент загружен, загружаем студентов...');
    fetchStudents('all');
  }, []);

  const fetchStudents = async (filterType: 'all' | 'active' | 'inactive' = 'all') => {
    try {
      console.log('📋 Начало загрузки студентов...');
      setIsLoading(true);
      console.log('🔍 Фильтр:', filterType);

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Ошибка загрузки студентов:', error);
        toast({
          title: "❌ Ошибка",
          description: "Ошибка загрузки студентов",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Загружено студентов:', profiles?.length);
      console.log('📊 Данные:', profiles);

      // Маппинг данных
      let studentsData = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || 'Без имени',
        fullName: profile.full_name || 'Без имени',
        role: profile.role || 'student',
        is_active: profile.is_active !== false,
        last_login_at: profile.last_login_at || profile.updated_at,
        last_active_date: profile.last_active_date,
        progress: 0,
        coursesCompleted: 0
      })) || [];

      console.log('📊 После маппинга:', studentsData.length);

      // Применить фильтр активности
      if (filterType === 'active') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        console.log('🔍 Фильтр "Активные", дата отсечки:', sevenDaysAgo.toISOString());
        
        studentsData = studentsData.filter(s => {
          if (!s.is_active) return false;
          if (!s.last_active_date) return true; // Если нет даты - считаем активным
          const lastActive = new Date(s.last_active_date);
          return lastActive >= sevenDaysAgo;
        });
      } else if (filterType === 'inactive') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        console.log('🔍 Фильтр "Неактивные", дата отсечки:', sevenDaysAgo.toISOString());
        
        studentsData = studentsData.filter(s => {
          if (!s.is_active) return true;
          if (!s.last_active_date) return false;
          const lastActive = new Date(s.last_active_date);
          return lastActive < sevenDaysAgo;
        });
      }

      console.log('✅ После фильтрации:', studentsData.length);
      setStudents(studentsData);

    } catch (error: any) {
      console.error('❌ Исключение при загрузке:', error);
      toast({
        title: "❌ Ошибка",
        description: "Критическая ошибка загрузки",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('🏁 Загрузка завершена');
    }
  };

  // Поиск студентов
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await fetchStudents(filter); // Загрузить всех с текущим фильтром
      return;
    }

    console.log('🔍 Поиск:', searchQuery);
    try {
      setIsLoading(true);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Найдено:', profiles?.length);
      
      const studentsData = profiles?.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || 'Без имени',
        fullName: profile.full_name || 'Без имени',
        role: profile.role || 'student',
        is_active: profile.is_active !== false,
        last_login_at: profile.last_login_at || profile.updated_at,
        last_active_date: profile.last_active_date,
        progress: 0,
        coursesCompleted: 0
      })) || [];

      setStudents(studentsData);
    } catch (error: any) {
      console.error('❌ Ошибка поиска:', error);
      toast({
        title: "❌ Ошибка",
        description: "Ошибка поиска",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
      
      // Вызываем Edge Function для создания студента
      const { data, error } = await supabase.functions.invoke('create-student', {
        body: {
          email: formData.email.trim(),
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          role: formData.role,
          account_expires_at: expiresAt,
          course_ids: formData.selectedCourses,  // ← НОВОЕ: назначение курсов
        },
      });

      if (error) throw error;

      if (data.success) {
        // Сохраняем данные для показа
        setInvitationData({
          invitation_url: `https://onai.academy`,
          email: data.credentials.email,
          temp_password: formData.password, // Показываем введённый пароль
        });

        // Обновляем список студентов
        await fetchStudents(filter);

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
      } else {
        throw new Error(data.error || 'Unknown error');
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

  // Смена роли
  const handleChangeRole = async (studentId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', studentId);

      if (error) throw error;
      toast({
        title: "✅ Роль изменена",
        description: "Роль успешно изменена",
      });
      await fetchStudents(filter);
    } catch (error: any) {
      toast({
        title: "❌ Ошибка",
        description: "Ошибка смены роли",
        variant: "destructive",
      });
    }
  };

  // Деактивация (вместо удаления)
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('⛔ Деактивировать студента навсегда?\n\nПользователь НЕ СМОЖЕТ войти на платформу.\nВсе его данные сохранятся в базе.')) return;
    
    try {
      console.log('⛔ Деактивация студента:', studentId);
      
      // Деактивируем пользователя в profiles
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: false,
          deleted_at: new Date().toISOString(),
          deactivation_reason: 'manual'
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
      
      // КРИТИЧНО: Перезагрузить список
      console.log('🔄 Обновление списка студентов...');
      await fetchStudents(filter);
      console.log('✅ Список обновлён');
      
    } catch (error: any) {
      console.error('❌ Исключение при деактивации:', error);
      toast({
        title: "❌ Ошибка",
        description: "Ошибка деактивации студента",
        variant: "destructive",
      });
    }
  };

  // Деактивация
  const handleToggleActive = async (studentId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', studentId);

      if (error) throw error;
      toast({
        title: "✅ Успешно",
        description: isActive ? 'Деактивирован' : 'Активирован',
      });
      await fetchStudents(filter);
    } catch (error: any) {
      toast({
        title: "❌ Ошибка",
        description: "Ошибка изменения статуса",
        variant: "destructive",
      });
    }
  };

  // Статистика (для отображения)
  const stats = {
    total: students.length,
    active: students.filter((s) => s.is_active).length,
    inactive: students.filter((s) => !s.is_active).length,
  };

  // Локальная фильтрация для отображения
  const filteredStudents = students;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-neon to-[hsl(var(--cyber-blue))] bg-clip-text text-transparent">
            👥 Активность учеников
          </h1>
          <p className="text-muted-foreground mt-2">
            Управление студентами платформы
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-neon to-[hsl(var(--cyber-blue))] hover:opacity-90"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Добавить пользователя
        </Button>
      </motion.div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Всего учеников" value={stats.total} icon="👥" color="blue" />
        <StatCard title="Активных" value={stats.active} icon="✅" color="green" />
        <StatCard title="Неактивных" value={stats.inactive} icon="⏸️" color="gray" />
      </div>

      {/* Поиск и Фильтры */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {/* Поиск */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Поиск по имени или email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Найти'}
            </Button>
          </div>

          {/* Фильтр статуса */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              onClick={() => {
                setFilter("all");
                fetchStudents("all");
              }}
            >
              Все
            </Button>
            <Button
              variant={filter === "active" ? "default" : "outline"}
              onClick={() => {
                setFilter("active");
                fetchStudents("active");
              }}
            >
              Активные
            </Button>
            <Button
              variant={filter === "inactive" ? "default" : "outline"}
              onClick={() => {
                setFilter("inactive");
                fetchStudents("inactive");
              }}
            >
              Неактивные
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Таблица */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Имя</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Последний вход</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.full_name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Badge variant={student.is_active ? "default" : "secondary"}>
                      {student.is_active ? "Активен" : "Неактивен"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {student.last_login_at
                      ? new Date(student.last_login_at).toLocaleDateString()
                      : "Не входил"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeRole(student.id, student.role === 'student' ? 'admin' : 'student')}
                        title="Сменить роль"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteStudent(student.id)}
                        title="Деактивировать студента навсегда"
                      >
                        ⛔ Деактивировать
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить нового пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            
            {/* Полное имя */}
            <div>
              <Label htmlFor="fullName">Полное имя *</Label>
              <Input
                id="fullName"
                placeholder="Иван Иванов"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required
              />
            </div>
            
            {/* Телефон - НОВОЕ */}
            <div>
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 777 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            
            {/* Пароль - НОВОЕ */}
            <div>
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 8 символов"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                minLength={8}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Минимум 8 символов
              </p>
            </div>
            
            {/* Роль */}
            <div>
              <Label htmlFor="role">Роль *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">🎓 Студент</SelectItem>
                  <SelectItem value="curator">👨‍🏫 Куратор</SelectItem>
                  <SelectItem value="tech_support">🛠️ Тех специалист</SelectItem>
                  <SelectItem value="admin">👑 Админ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Курсы (можно выбрать несколько) */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label>Курсы</Label>
                <div className="relative group">
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                    Вы можете выбрать несколько курсов
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="course-integrator"
                    checked={formData.selectedCourses.includes('6518f042-54b9-4b69-8e93-b18df98cd7eb')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData(prev => ({
                          ...prev,
                          selectedCourses: [...prev.selectedCourses, '6518f042-54b9-4b69-8e93-b18df98cd7eb']
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          selectedCourses: prev.selectedCourses.filter(id => id !== '6518f042-54b9-4b69-8e93-b18df98cd7eb')
                        }));
                      }
                    }}
                  />
                  <label htmlFor="course-integrator" className="text-sm cursor-pointer">
                    📚 Интегратор 2.0
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="course-creator"
                    checked={formData.selectedCourses.includes('febcb120-b8b4-4a8a-bd2e-62275f6d0115')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData(prev => ({
                          ...prev,
                          selectedCourses: [...prev.selectedCourses, 'febcb120-b8b4-4a8a-bd2e-62275f6d0115']
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          selectedCourses: prev.selectedCourses.filter(id => id !== 'febcb120-b8b4-4a8a-bd2e-62275f6d0115')
                        }));
                      }
                    }}
                  />
                  <label htmlFor="course-creator" className="text-sm cursor-pointer">
                    🎨 Креатор
                  </label>
                </div>
              </div>
            </div>
            
            {/* Срок действия аккаунта - ТОЛЬКО для студентов */}
            {formData.role === 'student' && (
              <div>
                <Label htmlFor="accountDuration">Срок действия аккаунта *</Label>
                <Select value={formData.accountDuration} onValueChange={(value) => setFormData({...formData, accountDuration: value})}>
                  <SelectTrigger id="accountDuration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddStudent} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                'Создать пользователя'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модал результата */}
      <Dialog open={showInvitationResult} onOpenChange={setShowInvitationResult}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>✅ Приглашение создано!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Email для входа:</p>
              <div className="flex gap-2">
                <Input value={invitationData?.email || ""} readOnly />
                <Button
                  size="icon"
                  onClick={() =>
                    copyToClipboard(invitationData?.email, "Email")
                  }
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Временный пароль:</p>
              <div className="flex gap-2">
                <Input value={invitationData?.temp_password || ""} readOnly />
                <Button
                  size="icon"
                  onClick={() =>
                    copyToClipboard(invitationData?.temp_password, "Пароль")
                  }
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="bg-secondary/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Ссылка на платформу:</p>
              <div className="flex gap-2">
                <Input value={invitationData?.invitation_url || ""} readOnly />
                <Button
                  size="icon"
                  onClick={() =>
                    copyToClipboard(invitationData?.invitation_url, "Ссылка")
                  }
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInvitationResult(false)}>Готово</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Компонент статистики
function StatCard({ title, value, icon, color }: any) {
  const colors = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-500/30",
    green: "from-green-500/10 to-green-500/5 border-green-500/30",
    gray: "from-gray-500/10 to-gray-500/5 border-gray-500/30",
  };

  return (
    <Card className={`bg-gradient-to-br ${colors[color]} border-2`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <span className="text-4xl">{icon}</span>
        </div>
      </CardContent>
    </Card>
  );
}


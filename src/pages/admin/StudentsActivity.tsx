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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function StudentsActivity() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Модалы
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvitationResult, setShowInvitationResult] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Форма
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentRole, setNewStudentRole] = useState("student");

  // Загрузка студентов из базы
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      // Загружаем пользователей из public.users + данные из auth.users
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Для каждого пользователя проверяем последний вход
      const studentsWithActivity = await Promise.all(
        (usersData || []).map(async (user) => {
          try {
            // Получаем данные из auth.users через admin API (если доступно)
            // Пока используем базовые данные
            return {
              ...user,
              is_active: user.role === 'student' || user.role === 'teacher',
              last_login_at: user.created_at, // Можно добавить колонку last_login_at
            };
          } catch {
            return {
              ...user,
              is_active: false,
              last_login_at: null,
            };
          }
        })
      );

      setStudents(studentsWithActivity);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось загрузить список студентов",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Добавление студента через Edge Function
  const handleAddStudent = async () => {
    if (!newStudentEmail || !newStudentName) {
      toast({
        title: "⚠️ Ошибка",
        description: "Заполните email и имя",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Вызываем Edge Function для создания студента
      const { data, error } = await supabase.functions.invoke('create-student', {
        body: {
          email: newStudentEmail.trim(),
          full_name: newStudentName.trim(),
          role: newStudentRole,
        },
      });

      if (error) throw error;

      if (data.success) {
        // Сохраняем данные для показа
        setInvitationData({
          invitation_url: `https://onai.academy`, // Просто ссылка на платформу
          email: data.credentials.email,
          temp_password: data.credentials.temp_password,
        });

        // Обновляем список студентов
        await loadStudents();

        setShowAddModal(false);
        setShowInvitationResult(true);
        setNewStudentEmail("");
        setNewStudentName("");
        setNewStudentRole("student");

        toast({
          title: "✅ Студент создан!",
          description: `${newStudentName} успешно добавлен на платформу`,
        });
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('Error creating student:', error);
      toast({
        title: "❌ Ошибка создания",
        description: error.message || "Не удалось создать студента",
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

  // Фильтрация
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && student.is_active) ||
      (filterStatus === "inactive" && !student.is_active);
    return matchesSearch && matchesFilter;
  });

  // Статистика
  const stats = {
    total: students.length,
    active: students.filter((s) => s.is_active).length,
    inactive: students.filter((s) => !s.is_active).length,
  };

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
          Добавить ученика
        </Button>
      </motion.div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Всего учеников" value={stats.total} icon="👥" color="blue" />
        <StatCard title="Активных" value={stats.active} icon="✅" color="green" />
        <StatCard title="Неактивных" value={stats.inactive} icon="⏸️" color="gray" />
      </div>

      {/* Фильтры */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Поиск */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени или email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {/* Фильтр статуса */}
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
              >
                Все
              </Button>
              <Button
                variant={filterStatus === "active" ? "default" : "outline"}
                onClick={() => setFilterStatus("active")}
              >
                Активные
              </Button>
              <Button
                variant={filterStatus === "inactive" ? "default" : "outline"}
                onClick={() => setFilterStatus("inactive")}
              >
                Неактивные
              </Button>
            </div>
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
                        onClick={() => toast({ title: "Функция в разработке" })}
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={student.is_active ? "destructive" : "default"}
                        onClick={() => toast({ title: "Функция в разработке" })}
                      >
                        {student.is_active ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить нового ученика</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="name">Полное имя</Label>
              <Input
                id="name"
                placeholder="Иван Иванов"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Роль</Label>
              <Select value={newStudentRole} onValueChange={setNewStudentRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">👨‍🎓 Студент</SelectItem>
                  <SelectItem value="teacher">👨‍🏫 Технический специалист</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                'Создать студента'
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


import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, Mail, Key, Camera, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Форма
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setEmail(user.email || "");
        setFullName(user.user_metadata?.full_name || "");
        setAvatarUrl(user.user_metadata?.avatar_url || "");
      }
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    }
  };

  // Загрузить аватар
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера (макс 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "❌ Ошибка",
        description: "Файл слишком большой (макс 2MB)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Загружаем в Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Получаем публичный URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Обновляем профиль
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);

      toast({
        title: "✅ Аватар обновлён",
        description: "Новое фото профиля установлено",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ошибка",
        description: error.message || "Не удалось загрузить аватар",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Обновить профиль
  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email,
        data: { full_name: fullName },
      });
      if (error) throw error;

      toast({
        title: "✅ Профиль обновлён",
        description: "Изменения сохранены",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Сменить пароль
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "❌ Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "❌ Ошибка",
        description: "Пароль должен быть минимум 6 символов",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "✅ Пароль изменён",
        description: "Новый пароль установлен",
      });
    } catch (error: any) {
      toast({
        title: "❌ Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Получить инициалы для аватарки
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Выход из аккаунта
  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // ВАЖНО: Очищаем кеш при выходе
      console.log('👋 Пользователь вышел из системы');
      sessionStorage.clear();

      toast({
        title: "👋 До свидания!",
        description: "Вы успешно вышли из аккаунта",
      });

      // Редирект на страницу логина
      navigate("/login", { replace: true });
    } catch (error: any) {
      toast({
        title: "❌ Ошибка",
        description: error.message || "Не удалось выйти из аккаунта",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Заголовок */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon to-[hsl(var(--cyber-blue))] bg-clip-text text-transparent">
          ⚙️ Настройки профиля
        </h1>
        <p className="text-muted-foreground mt-2">
          Управление вашим аккаунтом
        </p>
      </motion.div>

      <div className="space-y-6">
        {/* Аватарка */}
        <Card>
          <CardHeader>
            <CardTitle>Аватар</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-4 border-neon/30">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Avatar" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-neon/20 to-[hsl(var(--cyber-blue))]/20 text-2xl font-bold">
                  {fullName ? getInitials(fullName) : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Загрузите свой аватар (макс 2MB)
                </p>
                <div>
                  <Input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("avatar-upload")?.click()}
                    disabled={loading}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {loading ? "Загрузка..." : "Загрузить фото"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Основная информация */}
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fullName">Полное имя</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иван Иванов"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <Button onClick={handleUpdateProfile} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              Сохранить изменения
            </Button>
          </CardContent>
        </Card>

        {/* Смена пароля */}
        <Card>
          <CardHeader>
            <CardTitle>Смена пароля</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Повторите пароль"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={loading}>
              <Key className="w-4 h-4 mr-2" />
              Изменить пароль
            </Button>
          </CardContent>
        </Card>

        {/* Выход из аккаунта */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Выход из аккаунта</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Выйти из вашего аккаунта на этом устройстве
            </p>
            <Button 
              variant="destructive" 
              onClick={handleLogout} 
              disabled={loading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </CardContent>
        </Card>

        {/* Уведомления */}
        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Настройки уведомлений будут добавлены позже
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


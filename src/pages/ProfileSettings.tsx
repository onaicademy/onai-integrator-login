import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, Mail, Key, Camera, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    setProfileLoading(true);
    try {
      const [{ data: sessionData }, { data: userData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);

      const currentUser = sessionData?.session?.user || userData?.user;

      if (!currentUser) {
        setUser(null);
        toast({
          title: "⚠️ Требуется авторизация",
          description: "Пожалуйста, войдите в аккаунт ещё раз.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }

      setUser(currentUser);

      const [{ data: profile, error: profileError }, { data: studentProfile, error: studentProfileError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", currentUser.id)
            .maybeSingle(),
          supabase
            .from("student_profiles")
            .select("full_name, email, avatar_url")
            .eq("id", currentUser.id)
            .maybeSingle(),
        ]);

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Ошибка загрузки профиля:", profileError);
      }

      if (studentProfileError && studentProfileError.code !== "PGRST116") {
        console.error("Ошибка загрузки student_profile:", studentProfileError);
      }

      const derivedFullName =
        studentProfile?.full_name ||
        profile?.full_name ||
        currentUser.user_metadata?.full_name ||
        "";

      const derivedEmail =
        profile?.email || studentProfile?.email || currentUser.email || "";

      const derivedAvatar =
        studentProfile?.avatar_url ||
        profile?.avatar_url ||
        currentUser.user_metadata?.avatar_url ||
        "";

      setEmail(derivedEmail);
      setFullName(derivedFullName);
      setAvatarUrl(derivedAvatar);
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось загрузить данные профиля",
        variant: "destructive",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Загрузить аватар
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: "⚠️ Ошибка",
        description: "Пользователь не найден. Войдите в аккаунт и попробуйте снова.",
        variant: "destructive",
      });
      return;
    }

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
      const [{ error: authError }, { error: studentError }] = await Promise.all([
        supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        }),
        supabase
          .from("student_profiles")
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user?.id),
      ]);

      if (authError) throw authError;
      if (studentError && studentError.code !== "PGRST116") throw studentError;

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
      if (!user) {
        throw new Error("Пользователь не авторизован");
      }

      const trimmedEmail = email.trim();
      const trimmedName = fullName.trim();

      const [{ error: authError }, { error: profileError }, { error: studentError }] =
        await Promise.all([
          supabase.auth.updateUser({
            email: trimmedEmail,
            data: { full_name: trimmedName },
          }),
          supabase
            .from("profiles")
            .update({
              email: trimmedEmail,
              full_name: trimmedName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id),
          supabase
            .from("student_profiles")
            .update({
              email: trimmedEmail,
              full_name: trimmedName,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id),
        ]);

      if (authError) throw authError;
      if (profileError) throw profileError;
      if (studentError && studentError.code !== "PGRST116") throw studentError;

      await loadUserData();

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
      Object.keys(localStorage)
        .filter((key) => key.startsWith("sb-") || key === "supabase.auth.token")
        .forEach((key) => localStorage.removeItem(key));
      queryClient.clear();

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
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold text-white mb-2 font-display">
            Настройки профиля
          </h1>
          <p className="text-gray-400 text-lg">
            Управление вашим аккаунтом
          </p>
        </motion.div>

        <div className="space-y-6">
          {/* Аватарка */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00FF88]/30 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#00FF88]" />
                  Аватар
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Avatar className="w-24 h-24 border-4 border-[#00FF88]/30">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt="Avatar" />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-[#00FF88]/20 to-[#00cc88]/10 text-2xl font-bold text-white">
                        {fullName ? getInitials(fullName) : "?"}
                      </AvatarFallback>
                    </Avatar>
                  </motion.div>
                  <div>
                    <p className="text-sm text-gray-400 mb-3">
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
                        className="bg-transparent border-[#00FF88] text-[#00FF88] hover:bg-[#00FF88]/10"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {loading ? "Загрузка..." : "Загрузить фото"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Основная информация */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00FF88]/30 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#00FF88]" />
                  Основная информация
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-white">Полное имя</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Иван Иванов"
                    disabled={profileLoading}
                    className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    disabled={profileLoading}
                    className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={loading || profileLoading}
                  className="bg-[#00FF88] text-black hover:bg-[#00cc88] font-semibold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить изменения
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Смена пароля */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00FF88]/30 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-[#00FF88]" />
                  Смена пароля
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newPassword" className="text-white">Новый пароль</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className="text-white">Подтвердите пароль</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите пароль"
                    className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00FF88]"
                  />
                </div>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={loading}
                  className="bg-[#00FF88] text-black hover:bg-[#00cc88] font-semibold"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Изменить пароль
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Выход из аккаунта */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-[#1a1a24] border-red-900/30 hover:border-red-500/50 transition-all">
              <CardHeader>
                <CardTitle className="text-red-500 flex items-center gap-2">
                  <LogOut className="w-5 h-5" />
                  Выход из аккаунта
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400 mb-4">
                  Выйти из вашего аккаунта на этом устройстве
                </p>
                <Button 
                  variant="destructive" 
                  onClick={handleLogout} 
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Выйти
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Уведомления */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00FF88]/30 transition-all">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#00FF88]" />
                  Уведомления
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Настройки уведомлений будут добавлены позже
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}


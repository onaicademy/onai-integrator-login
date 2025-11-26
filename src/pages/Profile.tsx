import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Loader2, User, Mail, Key, Camera, Save, LogOut } from "lucide-react";
import { CourseModules } from "@/components/profile/v2/CourseModules";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile } from "@/lib/profile-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Форма настроек
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Загрузка профиля
  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) {
        console.warn('⚠️ User ID not found');
        setIsLoading(false);
        return;
      }

      try {
        console.log('📊 Загружаем профиль для:', user.id);
        const data = await getUserProfile(user.id);
        setProfileData(data);
        
        // Заполняем форму настроек
        setFullName(data?.profile?.full_name || '');
        setEmail(data?.profile?.email || '');
        setAvatarUrl(data?.profile?.avatar_url || '');
        
        console.log('✅ Профиль загружен:', data);
      } catch (err: any) {
        console.error('❌ Ошибка загрузки профиля:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user?.id]);

  // Вычисляем прогресс до следующего уровня
  const xpForNextLevel = (profileData?.profile?.level || 1) * 1000;
  const xpProgress = Math.round(((profileData?.profile?.xp || 0) / xpForNextLevel) * 100);
  
  // Получаем первую букву имени для аватара
  const avatarLetter = profileData?.profile?.full_name?.charAt(0).toUpperCase() || 'U';

  // Проверка наличия изменений
  const hasProfileChanges = 
    fullName.trim() !== (profileData?.profile?.full_name || '') || 
    email.trim() !== (profileData?.profile?.email || '');

  // Проверка совпадения паролей
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const canChangePassword = newPassword.length >= 6 && passwordsMatch;

  // ===== ФУНКЦИИ НАСТРОЕК =====

  // Загрузить аватар
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "❌ Ошибка",
        description: "Файл слишком большой (макс 2MB)",
        variant: "destructive",
      });
      return;
    }

    setProfileLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

      await Promise.all([
        supabase.auth.updateUser({ data: { avatar_url: publicUrl } }),
        supabase.from("profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id),
        supabase.from("student_profiles").update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq("id", user.id)
      ]);

      setAvatarUrl(publicUrl);
      toast({ title: "✅ Аватар обновлён", description: "Новое фото профиля установлено" });
      
      // Обновляем профиль
      const data = await getUserProfile(user.id);
      setProfileData(data);
    } catch (error: any) {
      toast({ title: "❌ Ошибка", description: error.message || "Не удалось загрузить аватар", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  // Обновить профиль
  const handleUpdateProfile = async () => {
    if (!user?.id) return;
    
    // Валидация
    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    // Проверка имени
    if (!trimmedName || trimmedName.length < 2) {
      toast({
        title: "❌ Ошибка валидации",
        description: "Имя должно содержать минимум 2 символа",
        variant: "destructive",
      });
      return;
    }

    // Проверка email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      toast({
        title: "❌ Ошибка валидации",
        description: "Введите корректный email адрес",
        variant: "destructive",
      });
      return;
    }

    // Проверка на изменения
    const hasChanges = 
      trimmedName !== profileData?.profile?.full_name || 
      trimmedEmail !== profileData?.profile?.email;

    if (!hasChanges) {
      toast({
        title: "ℹ️ Нет изменений",
        description: "Вы не внесли никаких изменений",
      });
      return;
    }

    setProfileLoading(true);
    try {
      console.log('📝 [handleUpdateProfile] Начинаем обновление профиля:', { name: trimmedName, email: trimmedEmail });

      // Проверяем активную сессию
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [handleUpdateProfile] Ошибка получения сессии:', sessionError);
        throw new Error('Не удалось получить текущую сессию. Попробуйте перелогиниться.');
      }
      
      if (!sessionData.session) {
        console.error('❌ [handleUpdateProfile] Сессия не активна!');
        throw new Error('Сессия не активна. Пожалуйста, войдите в систему заново.');
      }
      
      console.log('✅ [handleUpdateProfile] Сессия активна, пользователь:', sessionData.session.user.email);

      // Определяем, что изменилось
      const nameChanged = trimmedName !== profileData?.profile?.full_name;
      const emailChanged = trimmedEmail !== profileData?.profile?.email;

      console.log('🔍 [handleUpdateProfile] Что изменилось:', { nameChanged, emailChanged });

      // Обновляем в 3 местах: auth.users, profiles, student_profiles
      const updatePromises: Promise<any>[] = [];

      // Auth update - только если что-то изменилось
      if (nameChanged || emailChanged) {
        const authUpdate: any = {};
        if (emailChanged) authUpdate.email = trimmedEmail;
        if (nameChanged) authUpdate.data = { full_name: trimmedName };
        
        console.log('🔐 [handleUpdateProfile] Обновляем auth.users:', authUpdate);
        updatePromises.push(supabase.auth.updateUser(authUpdate));
      }

      // Profiles update
      if (nameChanged || emailChanged) {
        const profileUpdate: any = { updated_at: new Date().toISOString() };
        if (nameChanged) profileUpdate.full_name = trimmedName;
        if (emailChanged) profileUpdate.email = trimmedEmail;
        
        console.log('📊 [handleUpdateProfile] Обновляем profiles:', profileUpdate);
        updatePromises.push(
          supabase.from("profiles").update(profileUpdate).eq("id", user.id)
        );
      }

      // Student profiles update
      if (nameChanged || emailChanged) {
        const studentUpdate: any = { updated_at: new Date().toISOString() };
        if (nameChanged) studentUpdate.full_name = trimmedName;
        if (emailChanged) studentUpdate.email = trimmedEmail;
        
        console.log('🎓 [handleUpdateProfile] Обновляем student_profiles:', studentUpdate);
        updatePromises.push(
          supabase.from("student_profiles").update(studentUpdate).eq("id", user.id)
        );
      }

      // Выполняем все обновления параллельно
      console.log('⏳ [handleUpdateProfile] Выполняем обновления...');
      const results = await Promise.all(updatePromises);
      console.log('✅ [handleUpdateProfile] Обновления выполнены, проверяем результаты...');

      // Проверяем ошибки
      let authResult = null;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        
        // Если это результат от auth.updateUser (у него структура {data, error})
        if (result.data && result.data.user) {
          authResult = result;
          console.log('🔐 [handleUpdateProfile] Auth обновлен:', result.data.user.email);
        }
        
        if (result.error && result.error.code !== "PGRST116") {
          console.error(`❌ [handleUpdateProfile] Ошибка в обновлении ${i}:`, result.error);
          throw result.error;
        }
      }
      
      console.log('✅ [handleUpdateProfile] Все обновления успешны!');

      console.log('✅ Профиль успешно обновлен');

      // Перезагружаем данные профиля
      const data = await getUserProfile(user.id);
      setProfileData(data);
      
      // Обновляем локальные state
      setFullName(data?.profile?.full_name || '');
      setEmail(data?.profile?.email || '');

      toast({ 
        title: "✅ Профиль обновлён", 
        description: "Изменения успешно сохранены" 
      });
    } catch (error: any) {
      console.error('❌ Ошибка обновления профиля:', error);
      toast({ 
        title: "❌ Ошибка", 
        description: error.message || "Не удалось обновить профиль", 
        variant: "destructive" 
      });
    } finally {
      setProfileLoading(false);
    }
  };

  // Сменить пароль
  const handleChangePassword = async () => {
    // Валидация: пустые поля
    if (!newPassword || !confirmPassword) {
      toast({ 
        title: "❌ Ошибка валидации", 
        description: "Заполните оба поля пароля", 
        variant: "destructive" 
      });
      return;
    }

    // Валидация: минимальная длина
    if (newPassword.length < 6) {
      toast({ 
        title: "❌ Ошибка валидации", 
        description: "Пароль должен содержать минимум 6 символов", 
        variant: "destructive" 
      });
      return;
    }

    // Валидация: совпадение паролей
    if (newPassword !== confirmPassword) {
      toast({ 
        title: "❌ Ошибка валидации", 
        description: "Пароли не совпадают", 
        variant: "destructive" 
      });
      return;
    }

    // Дополнительная валидация: сложность пароля
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (newPassword.length >= 8 && (!hasUpperCase || !hasLowerCase || !hasNumber)) {
      toast({ 
        title: "⚠️ Слабый пароль", 
        description: "Рекомендуем использовать заглавные буквы, строчные буквы и цифры",
      });
    }

    setPasswordLoading(true);
    try {
      console.log('🔐 [handleChangePassword] Начинаем смену пароля...');
      
      // Проверяем активную сессию
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ [handleChangePassword] Ошибка получения сессии:', sessionError);
        throw new Error('Не удалось получить текущую сессию. Попробуйте перелогиниться.');
      }
      
      if (!sessionData.session) {
        console.error('❌ [handleChangePassword] Сессия не активна!');
        throw new Error('Сессия не активна. Пожалуйста, войдите в систему заново.');
      }
      
      console.log('✅ [handleChangePassword] Сессия активна, пользователь:', sessionData.session.user.email);
      console.log('🔄 [handleChangePassword] Вызываем supabase.auth.updateUser()...');

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateError) {
        console.error('❌ [handleChangePassword] Ошибка updateUser:', updateError);
        throw updateError;
      }
      
      console.log('✅ [handleChangePassword] updateUser успешен, данные:', updateData);

      // Очищаем поля после успешной смены
      setNewPassword("");
      setConfirmPassword("");

      console.log('✅ [handleChangePassword] Пароль успешно изменен!');

      toast({ 
        title: "✅ Пароль изменён", 
        description: "Новый пароль успешно установлен" 
      });
    } catch (error: any) {
      console.error('❌ Ошибка смены пароля:', error);
      toast({ 
        title: "❌ Ошибка", 
        description: error.message || "Не удалось изменить пароль", 
        variant: "destructive" 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Выход из аккаунта
  const handleLogout = async () => {
    setProfileLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('👋 Пользователь вышел из системы');
      sessionStorage.clear();
      Object.keys(localStorage)
        .filter((key) => key.startsWith("sb-") || key === "supabase.auth.token")
        .forEach((key) => localStorage.removeItem(key));
      queryClient.clear();

      toast({ title: "👋 До свидания!", description: "Вы успешно вышли из аккаунта" });
      navigate("/login", { replace: true });
    } catch (error: any) {
      toast({ title: "❌ Ошибка", description: error.message || "Не удалось выйти из аккаунта", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  // Получить инициалы
  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Индикатор загрузки
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#00ff00] animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="relative z-10 w-full">
        {/* HERO PROFILE SECTION */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-b from-[#00ff00]/5 via-black to-black border-b border-gray-800"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
              {/* Avatar Section */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative"
              >
                <div className="relative group">
                  {/* Animated Ring */}
                  <svg className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]" viewBox="0 0 200 200">
                    <defs>
                      <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00ff00" />
                        <stop offset="50%" stopColor="#00cc00" />
                        <stop offset="100%" stopColor="#00ff00" />
                      </linearGradient>
                    </defs>
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="95"
                      fill="none"
                      stroke="url(#ring-gradient)"
                      strokeWidth="3"
                      strokeDasharray="596.9"
                      strokeDashoffset="149.2"
                      initial={{ strokeDashoffset: 596.9 }}
                      animate={{ strokeDashoffset: 149.2 }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                  </svg>
                  
                  {/* Avatar */}
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-black shadow-2xl shadow-[#00ff00]/20">
                    {profileData?.profile?.avatar_url ? (
                      <img src={profileData.profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10 flex items-center justify-center">
                        <span className="text-5xl sm:text-6xl font-bold text-[#00ff00]">{avatarLetter}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Level Badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute -bottom-2 -right-2 bg-gradient-to-br from-[#00ff00] to-[#00cc00] text-black font-bold rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-4 border-black shadow-lg"
                  >
                    <span className="text-lg sm:text-xl">{profileData?.profile?.level || 1}</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-3"
                >
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 font-display">
                      {profileData?.profile?.full_name || 'Студент'}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <span className="px-3 py-1 bg-[#00ff00]/20 border border-[#00ff00]/30 rounded-full text-sm font-medium text-[#00ff00]">
                        Интегратор {['I', 'II', 'III', 'IV', 'V'][(profileData?.profile?.level || 1) - 1] || 'I'}
                      </span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-gray-400 text-sm">Уровень {profileData?.profile?.level || 1}</span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-[#00ff00] text-sm font-medium">
                        {(profileData?.profile?.xp || 0).toLocaleString()} XP
                      </span>
                    </div>
                  </div>

                  {/* XP Progress Bar */}
                  <div className="max-w-md mx-auto md:mx-0">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span>Прогресс до уровня {(profileData?.profile?.level || 1) + 1}</span>
                      <span>{(profileData?.profile?.xp || 0).toLocaleString()} / {xpForNextLevel.toLocaleString()} XP</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${xpProgress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                        className="h-full bg-gradient-to-r from-[#00ff00] to-[#00cc00] rounded-full relative"
                        style={{ boxShadow: "0 0 10px rgba(0, 255, 0, 0.5)" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex gap-4 sm:gap-6"
              >
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {profileData?.stats?.total_lessons_completed || 0}
                  </div>
                  <div className="text-xs text-gray-400">Уроков</div>
                </div>
                <div className="w-px bg-gray-800" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-[#00ff00] mb-1">
                    {profileData?.stats?.avg_video_progress || 0}%
                  </div>
                  <div className="text-xs text-gray-400">Прогресс</div>
                </div>
                <div className="w-px bg-gray-800" />
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {profileData?.stats?.total_modules_completed || 0}
                  </div>
                  <div className="text-xs text-gray-400">Модулей</div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Quick Actions & Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8"
          >
            {[
              { 
                label: "Всего XP", 
                value: (profileData?.profile?.xp || 0).toLocaleString(), 
                icon: "📊", 
                color: "green" 
              },
              { 
                label: "Достижения", 
                value: `${profileData?.stats?.achievements_unlocked || 0}`, 
                icon: "🏆", 
                color: "yellow" 
              },
              { 
                label: "Модули", 
                value: `${profileData?.stats?.total_modules_completed || 0}`, 
                icon: "📚", 
                color: "blue" 
              },
              { 
                label: "Курсы", 
                value: `${profileData?.stats?.total_courses_enrolled || 0}`, 
                icon: "🎓", 
                color: "green" 
              }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="bg-[#1a1a24] border border-gray-800 rounded-xl p-4 hover:border-[#00ff00]/50 transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{stat.icon}</span>
                  <div className="w-2 h-2 rounded-full bg-[#00ff00] animate-pulse" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Courses Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <CourseModules />
          </motion.div>

          {/* НАСТРОЙКИ ПРОФИЛЯ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6 font-display">Настройки профиля</h2>
            
            <div className="space-y-6">
              {/* Аватар */}
              <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/30 transition-all">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#00ff00]" />
                    Аватар
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <motion.div whileHover={{ scale: 1.05 }} transition={{ duration: 0.2 }}>
                      <Avatar className="w-24 h-24 border-4 border-[#00ff00]/30">
                        {avatarUrl ? <AvatarImage src={avatarUrl} alt="Avatar" /> : null}
                        <AvatarFallback className="bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10 text-2xl font-bold text-white">
                          {fullName ? getInitials(fullName) : avatarLetter}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>
                    <div>
                      <p className="text-sm text-gray-400 mb-3">Загрузите свой аватар (макс 2MB)</p>
                      <div>
                        <Input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          disabled={profileLoading}
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("avatar-upload")?.click()}
                          disabled={profileLoading}
                          className="bg-transparent border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {profileLoading ? "Загрузка..." : "Загрузить фото"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Основная информация */}
              <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/30 transition-all">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-[#00ff00]" />
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
                      disabled={isLoading}
                      className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00ff00]"
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
                      disabled={isLoading}
                      className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00ff00]"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdateProfile} 
                    disabled={profileLoading || isLoading || !hasProfileChanges}
                    className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {hasProfileChanges ? 'Сохранить изменения' : 'Нет изменений'}
                      </>
                    )}
                  </Button>
                  {hasProfileChanges && !profileLoading && (
                    <p className="text-xs text-[#00ff00] mt-2">
                      ✓ Обнаружены изменения - нажмите для сохранения
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Смена пароля */}
              <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/30 transition-all">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-[#00ff00]" />
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
                      className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00ff00]"
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
                      className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00ff00]"
                    />
                  </div>
                  <Button 
                    onClick={handleChangePassword} 
                    disabled={passwordLoading || !canChangePassword}
                    className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Изменение...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Изменить пароль
                      </>
                    )}
                  </Button>
                  {/* Визуальная индикация */}
                  {newPassword && confirmPassword && (
                    <div className="mt-2">
                      {passwordsMatch ? (
                        <p className="text-xs text-[#00ff00]">✓ Пароли совпадают</p>
                      ) : (
                        <p className="text-xs text-red-500">✗ Пароли не совпадают</p>
                      )}
                    </div>
                  )}
                  {newPassword && newPassword.length < 6 && (
                    <p className="text-xs text-orange-500 mt-2">⚠ Минимум 6 символов</p>
                  )}
                </CardContent>
              </Card>

              {/* Выход из аккаунта */}
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
                    disabled={profileLoading}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Выход...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4 mr-2" />
                        Выйти
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Уведомления */}
              <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00ff00]/30 transition-all">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#00ff00]" />
                    Уведомления
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400">
                    Настройки уведомлений будут добавлены позже
                  </p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="border-t border-gray-800 py-8 text-center"
        >
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="text-lg font-bold mb-2">
              <span className="text-[#00ff00]">onAI</span>
              <span className="text-white"> Academy</span>
            </h3>
            <p className="text-xs text-gray-400">
              Powered by Neural Education Systems © 2025
            </p>
          </div>
        </motion.footer>
      </div>
      
      {/* Добавляем стили для shimmer анимации */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default Profile;

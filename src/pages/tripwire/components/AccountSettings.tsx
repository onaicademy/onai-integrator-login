import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Mail, Key, User } from 'lucide-react';
import { api } from '@/utils/apiClient'; // ✅ Используем apiClient с fallback

interface AccountSettingsProps {
  email: string;
  created_at: string;
  full_name?: string;
  onEmailUpdate?: (newEmail: string) => void;
}

/**
 * ⚙️ ACCOUNT SETTINGS - PREMIUM CYBER REDESIGN
 * Настройки аккаунта в стиле Cyber-Architecture
 */
export default function AccountSettings({ email, created_at, full_name, onEmailUpdate }: AccountSettingsProps) {
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { toast } = useToast();

  const handleUpdateEmail = async () => {
    if (!newEmail) {
      toast({
        title: "Ошибка",
        description: "Введите новый email",
        variant: "destructive",
      });
      return;
    }

    // Валидация email формата
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast({
        title: "Ошибка",
        description: "Введите корректный email адрес (например: example@gmail.com)",
        variant: "destructive",
      });
      return;
    }

    // Сохраняем старый email для отката в случае ошибки
    const oldEmail = email;
    
    // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ: сразу обновляем UI
    if (onEmailUpdate) {
      onEmailUpdate(newEmail);
    }

    setIsUpdatingEmail(true);
    try {
      // 🔥 BACKEND-FIRST: apiClient автоматически добавит JWT токен и fallback URL
      const result = await api.post('/api/users/update-email', {
        newEmail,
        userName: full_name || 'Пользователь',
      });

      console.log('✅ Email успешно обновлен через backend:', result);

      toast({
        title: "Email обновлен",
        description: "Проверьте почту для подтверждения нового адреса",
      });
      setNewEmail('');
    } catch (error: any) {
      // Откатываем email назад в случае ошибки
      if (onEmailUpdate) {
        onEmailUpdate(oldEmail);
      }
      
      console.error('❌ Ошибка обновления email:', error);
      
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить email",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 8 символов",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      // 🔥 BACKEND-FIRST: apiClient автоматически добавит JWT токен и fallback URL
      const result = await api.post('/api/users/update-password', {
        newPassword,
        userName: full_name || 'Пользователь',
      });

      console.log('✅ Пароль успешно обновлен через backend:', result);

      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно обновлен",
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('❌ Ошибка обновления пароля:', error);
      
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить пароль",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl lg:text-4xl font-bold text-white font-['Space_Grotesk']
                     uppercase tracking-wider mb-2"
            style={{ textShadow: '0 0 30px rgba(0, 255, 148, 0.4)' }}>
          НАСТРОЙКИ АККАУНТА
        </h2>
        <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono']">
          /// БЕЗОПАСНОСТЬ И НАСТРОЙКИ
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Info & Email */}
        <div className="space-y-8">
          
          {/* Account Info Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-[#00FF94]/20 to-transparent rounded-2xl blur opacity-50" />
            <div className="relative bg-[rgba(10,10,10,0.9)] border border-gray-800 rounded-2xl p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20">
                  <User className="w-6 h-6 text-[#00FF94]" />
                </div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] uppercase">
                  ИНФОРМАЦИЯ
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                  <span className="text-xs text-[#9CA3AF] font-['JetBrains_Mono'] block mb-1">АДРЕС ЭЛЕКТРОННОЙ ПОЧТЫ</span>
                  <p className="text-white font-mono">{email}</p>
                </div>
                <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                  <span className="text-xs text-[#9CA3AF] font-['JetBrains_Mono'] block mb-1">В СИСТЕМЕ С</span>
                  <p className="text-white font-mono">
                    {new Date(created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Update Email Card */}
          <div className="relative group">
            <div className="relative bg-[rgba(10,10,10,0.9)] border border-gray-800 rounded-2xl p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Mail className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] uppercase">
                  СМЕНИТЬ EMAIL
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email" className="text-[#9CA3AF] text-xs font-['JetBrains_Mono']">НОВЫЙ EMAIL</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="bg-black/40 border-gray-800 text-white placeholder:text-gray-600 focus:border-blue-500/50 h-12"
                  />
                </div>
                <Button
                  onClick={handleUpdateEmail}
                  disabled={isUpdatingEmail || !newEmail}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wide h-12 rounded-xl transition-all duration-300"
                >
                  {isUpdatingEmail ? 'ОБНОВЛЕНИЕ...' : 'ОБНОВИТЬ EMAIL'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Password & Security */}
        <div className="space-y-8">
          {/* Security Card */}
          <div className="relative group h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500/20 to-transparent rounded-2xl blur opacity-50" />
            <div className="relative bg-[rgba(10,10,10,0.9)] border border-gray-800 rounded-2xl p-6 lg:p-8 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] uppercase">
                  БЕЗОПАСНОСТЬ
                </h3>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="text-white font-bold text-sm mb-1">СМЕНА ПАРОЛЯ</h4>
                      <p className="text-xs text-[#9CA3AF] leading-relaxed">
                        Используйте надежный пароль, содержащий не менее 6 символов. Не используйте пароли от других сервисов.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-[#9CA3AF] text-xs font-['JetBrains_Mono']">НОВЫЙ ПАРОЛЬ</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-black/40 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500/50 h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-[#9CA3AF] text-xs font-['JetBrains_Mono']">ПОДТВЕРДИТЕ ПАРОЛЬ</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-black/40 border-gray-800 text-white placeholder:text-gray-600 focus:border-purple-500/50 h-12"
                    />
                  </div>
                  <Button
                    onClick={handleUpdatePassword}
                  disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wide h-12 rounded-xl transition-all duration-300"
                >
                  {isUpdatingPassword ? 'ОБНОВЛЕНИЕ...' : 'ИЗМЕНИТЬ ПАРОЛЬ'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

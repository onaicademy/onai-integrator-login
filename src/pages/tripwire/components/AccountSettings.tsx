import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Key, LogOut } from 'lucide-react';
import { api } from '@/utils/apiClient';
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // ✅ CORRECT IMPORT!
import { useNavigate } from 'react-router-dom';

interface AccountSettingsProps {
  email: string;
  created_at: string;
  full_name?: string;
}

/**
 * ⚙️ ACCOUNT SETTINGS - PREMIUM CYBER REDESIGN
 * Настройки аккаунта в стиле Cyber-Architecture
 */
export default function AccountSettings({ email, created_at, full_name }: AccountSettingsProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен содержать минимум 6 символов",
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
      // ✅ ИСПОЛЬЗУЕМ SUPABASE НАПРЯМУЮ - НЕ СБРАСЫВАЕТ СЕССИЮ!
      const { error } = await tripwireSupabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      console.log('✅ Пароль успешно обновлен');

      toast({
        title: "Пароль изменен",
        description: "Ваш пароль успешно обновлен. Сессия сохранена.",
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

  // ✅ Logout handler
  const handleLogout = async () => {
    try {
      await tripwireSupabase.auth.signOut();
      toast({
        title: "Выход выполнен",
        description: "Вы успешно вышли из системы",
      });
      navigate('/login');
    } catch (error: any) {
      console.error('❌ Ошибка выхода:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось выйти из системы",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl lg:text-4xl font-bold text-white font-['JetBrains_Mono']
                     uppercase tracking-wider mb-2"
            style={{ textShadow: '0 0 30px rgba(0, 255, 148, 0.4)' }}>
          НАСТРОЙКИ АККАУНТА
        </h2>
        <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono']">
          /// БЕЗОПАСНОСТЬ И НАСТРОЙКИ
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Account Info Card */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-[#00FF94]/20 to-transparent rounded-2xl blur opacity-50" />
          <div className="relative bg-[rgba(10,10,10,0.9)] border border-gray-800 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-[#00FF94]/10 border border-[#00FF94]/20">
                <User className="w-6 h-6 text-[#00FF94]" />
              </div>
              <h3 className="text-xl font-bold text-white font-['JetBrains_Mono'] uppercase">
                ИНФОРМАЦИЯ
              </h3>
            </div>
            
            <div className="space-y-4">
              {email && (
                <div className="p-4 bg-black/40 rounded-xl border border-gray-800">
                  <span className="text-xs text-[#9CA3AF] font-['JetBrains_Mono'] block mb-1">АДРЕС ЭЛЕКТРОННОЙ ПОЧТЫ</span>
                  <p className="text-white font-mono">{email}</p>
                </div>
              )}
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

        {/* Security Card - Password Change */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500/20 to-transparent rounded-2xl blur opacity-50" />
          <div className="relative bg-[rgba(10,10,10,0.9)] border border-gray-800 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-white font-['JetBrains_Mono'] uppercase">
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

        {/* Logout Button */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-red-500/20 to-transparent rounded-2xl blur opacity-50" />
          <div className="relative bg-[rgba(10,10,10,0.9)] border border-gray-800 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white font-['JetBrains_Mono'] uppercase">
                ВЫХОД
              </h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Выход из учетной записи. Вы можете войти снова в любое время, используя свой email и пароль.
              </p>
              <Button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-['JetBrains_Mono'] font-bold uppercase tracking-wide h-12 rounded-xl transition-all duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ВЫЙТИ ИЗ СИСТЕМЫ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

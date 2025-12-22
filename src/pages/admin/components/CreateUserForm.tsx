import { useState, useEffect } from 'react';

import { X, Mail, User, Loader2, CheckCircle, Key, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/utils/apiClient';
import { tripwireSupabase } from '@/lib/supabase-tripwire';

interface CreateUserFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Генератор случайного пароля
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&';
  const length = 12;
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function CreateUserForm({ onClose, onSuccess }: CreateUserFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  
  // 🔥 FIX: Автогенерация пароля при загрузке формы
  useEffect(() => {
    if (!password) {
      const autoPassword = generatePassword();
      setPassword(autoPassword);
      console.log('🔐 [CREATE_USER] Auto-generated password:', autoPassword);
    }
  }, []); // Empty dependency - run once on mount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ✅ FIX: Валидация перед отправкой
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Неверный формат email адреса');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Пароль должен быть минимум 8 символов');
      setLoading(false);
      return;
    }

    if (fullName.trim().length < 2) {
      setError('ФИО должно содержать минимум 2 символа');
      setLoading(false);
      return;
    }

    try {
      const {
        data: { session },
      } = await tripwireSupabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Не авторизован');
      }

      const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
      const response = await fetch(`${API_URL}/api/admin/tripwire/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password, // Отправляем пароль на backend
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка создания пользователя');
      }

      // 🔥 FIX: Используем пароль из response, если есть, иначе показываем отправленный
      const displayPassword = data.generated_password || password;
      console.log('✅ [CREATE_USER] Response data:', data);
      console.log('🔑 [CREATE_USER] Display password:', displayPassword);
      
      setGeneratedPassword(displayPassword);
      setGeneratedEmail(data.email);
      setSuccess(true);
      onSuccess();

      // Закрыть через 8 секунд
      setTimeout(() => {
        onClose();
      }, 8000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#0A0A0A] border-2 border-[#00FF94]/50 shadow-[0_0_60px_rgba(0,255,148,0.6)] p-0 overflow-hidden">
        {/* Header */}
        <div className="relative p-8 border-b border-gray-800">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00FF94]/10 to-transparent pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div>
              <h2
                className="text-3xl font-bold text-white font-['JetBrains_Mono'] uppercase tracking-wider"
                style={{ textShadow: '0 0 30px rgba(0, 255, 148, 0.5)' }}
              >
                СОЗДАТЬ АККАУНТ
              </h2>
              <p className="text-sm text-[#9CA3AF] font-['JetBrains_Mono'] mt-2">
                /// NEW TRIPWIRE STUDENT
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800
                       flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {!success ? (
            // Form
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-[#9CA3AF] font-['JetBrains_Mono'] uppercase">
                  <User className="w-4 h-4" />
                  <span>ФИО УЧЕНИКА</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иван Петров"
                  required
                  className="w-full h-14 px-4 bg-[#1a1a24] border-2 border-gray-700 
                           text-white placeholder:text-gray-500 rounded-xl
                           focus:border-[#00FF94] focus:ring-2 focus:ring-[#00FF94]/20
                           transition-all outline-none"
                />
              </div>

              {/* Email */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-[#9CA3AF] font-['JetBrains_Mono'] uppercase">
                  <Mail className="w-4 h-4" />
                  <span>EMAIL АДРЕС</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ivan@example.com"
                  required
                  className="w-full h-14 px-4 bg-[#1a1a24] border-2 border-gray-700 
                           text-white placeholder:text-gray-500 rounded-xl
                           focus:border-[#00FF94] focus:ring-2 focus:ring-[#00FF94]/20
                           transition-all outline-none"
                />
              </div>

              {/* Password */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-[#9CA3AF] font-['JetBrains_Mono'] uppercase">
                  <Key className="w-4 h-4" />
                  <span>ПАРОЛЬ</span>
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите или сгенерируйте пароль"
                    required
                    className="flex-1 h-14 px-4 bg-[#1a1a24] border-2 border-gray-700 
                             text-white placeholder:text-gray-500 rounded-xl font-['JetBrains_Mono']
                             focus:border-[#00FF94] focus:ring-2 focus:ring-[#00FF94]/20
                             transition-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(generatePassword())}
                    className="h-14 px-6 bg-[#1a1a24] border-2 border-[#00FF94]/50 
                             hover:bg-[#00FF94]/10 text-[#00FF94] rounded-xl
                             flex items-center gap-2 transition-all font-['JetBrains_Mono']
                             hover:border-[#00FF94] hover:shadow-[0_0_20px_rgba(0,255,148,0.3)]"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span className="font-semibold">ГЕНЕРИРОВАТЬ</span>
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-gradient-to-r from-[#00FF94] to-[#00CC6A] 
                         hover:from-[#00CC6A] hover:to-[#00FF94]
                         text-black font-bold font-['JetBrains_Mono'] uppercase tracking-wider
                         rounded-xl transition-all duration-300 flex items-center justify-center gap-3
                         disabled:opacity-50 disabled:cursor-not-allowed
                         shadow-[0_0_30px_rgba(0,255,148,0.4)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>СОЗДАНИЕ...</span>
                  </>
                ) : (
                  <span>СОЗДАТЬ АККАУНТ</span>
                )}
              </button>
            </form>
          ) : (
            // Success State
            <div className="text-center space-y-6 py-8">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-[#00FF94] blur-3xl opacity-50 animate-pulse" />
                <div
                  className="relative w-24 h-24 mx-auto rounded-full bg-[#00FF94]/20 
                              flex items-center justify-center border-2 border-[#00FF94]/60"
                >
                  <CheckCircle className="w-16 h-16 text-[#00FF94]" strokeWidth={2.5} />
                </div>
              </div>

              <div>
                <h3 className="text-3xl font-bold text-white font-['JetBrains_Mono'] mb-2">
                  АККАУНТ СОЗДАН!
                </h3>
                <p className="text-[#9CA3AF]">
                  Учетные данные отправлены на <strong className="text-white">{generatedEmail}</strong>
                </p>
              </div>

              {/* Generated Credentials */}
              <div className="bg-[#00FF94]/10 border-2 border-[#00FF94]/30 rounded-xl p-6 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    LOGIN
                  </span>
                  <p className="text-lg font-bold text-white">{generatedEmail}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-xs font-['JetBrains_Mono'] text-[#9CA3AF] uppercase">
                    PASSWORD
                  </span>
                  <p className="text-lg font-bold text-[#00FF94] font-['JetBrains_Mono']">
                    {generatedPassword}
                  </p>
                </div>
              </div>

              <p className="text-sm text-[#9CA3AF]">
                Окно автоматически закроется через 8 секунд...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}




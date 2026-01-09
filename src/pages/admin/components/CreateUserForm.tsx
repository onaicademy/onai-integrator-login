import { useState, useEffect } from 'react';

import { X, Mail, User, Loader2, CheckCircle, Key, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { api } from '@/utils/apiClient';
import { tripwireSupabase } from '@/lib/supabase-tripwire';

// 📊 Статусы создания пользователя
interface CreationStatus {
  status: string;
  message: string;
  error?: string;
  data?: any;
  timestamp: string;
}

// 🎯 Чекпоинты для отображения
const CHECKPOINTS = [
  { key: 'checking', label: 'Проверка email адреса', icon: '🔍' },
  { key: 'creating_auth', label: 'Создание учетной записи', icon: '🔐' },
  { key: 'creating_profile', label: 'Создание профиля в базе данных', icon: '📝' },
  { key: 'sending_email', label: 'Отправка приглашения', icon: '📧' },
  { key: 'completed', label: 'Завершено', icon: '🎉' },
];

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
  
  // 🚀 NEW: Прогресс-бар состояния
  const [creationStatuses, setCreationStatuses] = useState<CreationStatus[]>([]);
  const [currentStep, setCurrentStep] = useState('');
  
  // 🔥 FIX: Автогенерация пароля при загрузке формы
  useEffect(() => {
    if (!password) {
      const autoPassword = generatePassword();
      setPassword(autoPassword);
      // 🔒 SECURITY: Never log passwords - removed console.log
    }
  }, []); // Empty dependency - run once on mount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCreationStatuses([]);
    setCurrentStep('');

    // ✅ Валидация перед отправкой
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

    // 🔄 RETRY МЕХАНИЗМ
    const MAX_RETRIES = 2;
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
      try {
        const {
          data: { session },
        } = await tripwireSupabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error('Не авторизован. Пожалуйста, войдите в систему снова');
        }

        // 🚀 SSE endpoint для real-time статусов
        const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
        
        if (retryCount > 0) {
          setCreationStatuses(prev => [...prev, {
            status: 'retry',
            message: `⚠️ Повторная попытка ${retryCount} из ${MAX_RETRIES}...`,
            timestamp: new Date().toISOString()
          }]);
        }

        const response = await fetch(`${API_URL}/api/admin/tripwire/users/create-with-progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            full_name: fullName,
            email: email,
            password: password,
            currentUserId: session.user.id,
            currentUserEmail: session.user.email,
            currentUserName: fullName,
          }),
        });

        if (!response.ok) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
            continue;
          }
          throw new Error(`Ошибка соединения с сервером (HTTP ${response.status})`);
        }

        // 📡 Читаем SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('Не удалось установить соединение SSE');
        }

        let buffer = '';
        let lastStatusTime = Date.now();
        const STATUS_TIMEOUT = 30000; // 30 секунд timeout

        while (true) {
          // Проверка timeout
          if (Date.now() - lastStatusTime > STATUS_TIMEOUT) {
            throw new Error('Превышено время ожидания ответа от сервера');
          }

          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          lastStatusTime = Date.now();

          // Обрабатываем каждую строку SSE
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonData = line.substring(6);
              try {
                const status: CreationStatus = JSON.parse(jsonData);
                
                console.log('📊 [SSE]', status);
                
                setCreationStatuses(prev => [...prev, status]);
                setCurrentStep(status.status);

                // Если error - показываем
                if (status.status === 'error') {
                  setError(status.error || status.message);
                  setLoading(false);
                  return;
                }

                // Если completed - показываем success
                if (status.status === 'completed') {
                  setGeneratedPassword(password);
                  setGeneratedEmail(email);
                  setSuccess(true);
                  onSuccess();

                  // Закрыть через 8 секунд
                  setTimeout(() => {
                    onClose();
                  }, 8000);
                  return;
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', parseError);
              }
            }
          }
        }

        // Если цикл завершился без completed - это ошибка
        throw new Error('Соединение прервано до завершения создания');

      } catch (err: any) {
        console.error('❌ Creation error:', err);
        
        if (retryCount < MAX_RETRIES && err.message.includes('соединени')) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          continue;
        }
        
        // Все попытки исчерпаны
        setError(err.message || 'Произошла неизвестная ошибка при создании пользователя');
        setLoading(false);
        return;
      }
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

              {/* 🚀 ЛИНЕЙНЫЙ ПРОГРЕСС-БАР С РЕАЛЬНЫМИ СТАТУСАМИ */}
              {loading && creationStatuses.length > 0 && (
                <div className="space-y-3 pt-4">
                  {/* Прогресс-бар */}
                  <div className="relative">
                    <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#00FF94] to-[#00CC6A] transition-all duration-500 ease-out relative"
                        style={{ 
                          width: `${(() => {
                            const completedStatuses = ['checked', 'auth_created', 'profile_created', 'email_sent', 'completed'];
                            const completedCount = completedStatuses.filter(s => 
                              creationStatuses.some(cs => cs.status === s)
                            ).length;
                            return Math.round((completedCount / CHECKPOINTS.length) * 100);
                          })()}%` 
                        }}
                      >
                        <div className="absolute inset-0 bg-[#00FF94] blur-sm opacity-50"></div>
                      </div>
                    </div>
                    
                    <div className="absolute -top-6 right-0">
                      <span className="text-[#00FF94] font-['JetBrains_Mono'] text-sm font-bold">
                        {(() => {
                          const completedStatuses = ['checked', 'auth_created', 'profile_created', 'email_sent', 'completed'];
                          const completedCount = completedStatuses.filter(s => 
                            creationStatuses.some(cs => cs.status === s)
                          ).length;
                          return Math.round((completedCount / CHECKPOINTS.length) * 100);
                        })()}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Детальные статусы */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {creationStatuses.map((status, index) => {
                      const isError = !!status.error;
                      
                      return (
                        <div 
                          key={index}
                          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-['JetBrains_Mono'] ${
                            isError 
                              ? 'bg-red-500/10 border border-red-500/30' 
                              : 'bg-gray-800/50 border border-gray-700/50'
                          }`}
                        >
                          {isError ? (
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Check className="w-4 h-4 text-[#00FF94] flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={isError ? 'text-red-400' : 'text-[#00FF94]'}>
                              {status.message}
                            </p>
                            {status.error && (
                              <p className="text-red-300 mt-1 break-words">
                                ❌ {status.error}
                              </p>
                            )}
                          </div>
                          {isError && (
                            <button
                              onClick={() => {
                                const errorText = `ОШИБКА СОЗДАНИЯ УЧЕНИКА\n\nЭтап: ${status.message}\nОшибка: ${status.error}\nВремя: ${new Date(status.timestamp).toLocaleString('ru-RU')}`;
                                navigator.clipboard.writeText(errorText);
                                alert('✅ Ошибка скопирована в буфер обмена');
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0 text-base"
                              title="Копировать ошибку"
                            >
                              📋
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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




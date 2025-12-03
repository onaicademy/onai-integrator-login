/**
 * Telegram Connection Component
 * Компонент для подключения/отключения AI-наставника через Telegram
 * При отключении прогресс и база знаний НЕ теряются!
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, CheckCircle2, Loader2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function TelegramConnect() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [botUsername, setBotUsername] = useState('@onaimentor_bot');

  useEffect(() => {
    if (user?.id) {
      checkTelegramStatus();
      
      // Проверяем каждые 5 секунд
      const interval = setInterval(checkTelegramStatus, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  async function checkTelegramStatus() {
    if (!user?.id) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/telegram-connection/status?userId=${user.id}`);
      const data = await res.json();
      
      if (data.success) {
      setIsConnected(data.connected || false);
        if (data.bot_username) {
          setBotUsername(data.bot_username);
        }
      }
    } catch (err) {
      console.error('Failed to check Telegram status:', err);
    } finally {
      setIsChecking(false);
    }
  }

  async function handleConnect() {
    if (!user?.id) {
      toast.error('Необходимо войти в систему');
      return;
    }

    setIsConnecting(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/telegram-connection/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to generate link');
      }

      const { deepLink, botUsername: botName } = await response.json();
      
      if (botName) {
        setBotUsername(botName);
      }
      
      window.open(deepLink, '_blank');
      
      toast.success('🤖 Откроется Telegram! Нажми START для подключения AI-наставника', {
        duration: 5000,
      });

      // Быстрая проверка: каждую секунду первые 15 секунд
      let attempts = 0;
      const quickCheck = setInterval(async () => {
        await checkTelegramStatus();
        attempts++;
        if (attempts >= 15 || isConnected) {
          clearInterval(quickCheck);
        }
      }, 1000);
    } catch (error) {
      console.error('Ошибка подключения Telegram:', error);
      toast.error('Не удалось подключить Telegram. Попробуйте еще раз.');
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!user?.id) return;

    const confirmed = confirm(
      '🔌 Отключить AI-наставника?\n\n' +
      '✅ Твой прогресс и база знаний сохранятся!\n' +
      '❌ Но ты не будешь получать мотивационные сообщения и напоминания.\n\n' +
      'Ты можешь подключить Telegram заново в любой момент.'
    );

    if (!confirmed) return;

    setIsDisconnecting(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/telegram-connection/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      const data = await response.json();
      
      setIsConnected(false);
      
      toast.success('🔌 Telegram отключен', {
        description: data.note || 'Твой прогресс сохранен. Можешь подключить заново в любой момент.',
        duration: 5000,
      });
    } catch (error) {
      console.error('Ошибка отключения Telegram:', error);
      toast.error('Не удалось отключить Telegram. Попробуйте еще раз.');
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (isChecking) {
    return (
      <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00FF88]/30 transition-all">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#00FF88]" />
            <span className="text-gray-400">Проверка подключения...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1a24] border-gray-800 hover:border-[#00FF88]/30 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${isConnected ? 'bg-[#00FF88]/20 border-[#00FF88]/30' : 'bg-[#0088cc]/20 border-[#0088cc]/30'} flex items-center justify-center border`}>
              <MessageCircle className={`w-6 h-6 ${isConnected ? 'text-[#00FF88]' : 'text-[#0088cc]'}`} />
          </div>
          <div>
              <CardTitle className="text-white flex items-center gap-2">
                AI-Наставник в Telegram
                {isConnected && (
                  <span className="flex items-center gap-1 text-xs font-normal px-2 py-1 rounded-full bg-[#00FF88]/10 border border-[#00FF88]/30 text-[#00FF88]">
                    <CheckCircle2 className="w-3 h-3" />
                    Подключен
                  </span>
                )}
                {!isConnected && (
                  <span className="flex items-center gap-1 text-xs font-normal px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
                    <XCircle className="w-3 h-3" />
                    Отключен
                  </span>
                )}
              </CardTitle>
            <CardDescription className="text-gray-400">
                {isConnected ? 'Получаешь персональные мотивационные сообщения' : 'Подключи для получения мотивации и напоминаний'}
            </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            {/* Статус */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30">
              <CheckCircle2 className="w-5 h-5 text-[#00FF88] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-white font-medium">Telegram подключен ✅</p>
                <p className="text-sm text-gray-400">
                  AI-Наставник отправляет тебе персональные мотивационные сообщения каждый день в 9:00 утра
                </p>
              </div>
            </div>
            
            {/* Что получаешь */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Что ты получаешь:</h4>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Ежедневную мотивацию на основе твоего прогресса (9:00)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Персональные советы по обучению от AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Напоминания о задачах из Kanban (за 15-60 мин)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Поддержка твоего стрика обучения 🔥</span>
                </li>
              </ul>
            </div>

            {/* Кнопка отключения */}
            <div className="pt-2 space-y-2">
              <Button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                variant="outline"
                className="w-full border-gray-700 text-gray-400 hover:bg-red-900/20 hover:text-red-400 hover:border-red-800 transition-all"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Отключение...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Отключить уведомления
                  </>
                )}
              </Button>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-900/10 border border-blue-800/30">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-400">
                  При отключении твой прогресс и база знаний сохранятся. Ты можешь подключить Telegram заново в любой момент.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center pt-2">
              💡 Бот: <a href={`https://t.me/${botUsername.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline">{botUsername}</a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Что получишь */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Что ты получишь:</h4>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Ежедневные мотивационные сообщения от AI (9:00 утра)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Персональные советы на основе твоего прогресса</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Напоминания о задачах из Kanban (за 15-60 мин)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Поддержка и мотивация 24/7 🚀</span>
                </li>
              </ul>
            </div>

            {/* Кнопка подключения */}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-[#0088cc] hover:bg-[#006699] text-white font-medium transition-all flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Подключение...
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4" />
                  Подключить AI-наставника
                </>
              )}
            </Button>

            {/* Инструкция */}
            <div className="space-y-2 text-xs text-gray-500">
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">1.</span>
                <span>Нажми кнопку "Подключить AI-наставника"</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">2.</span>
                <span>Откроется Telegram бот {botUsername}</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">3.</span>
                <span>Нажми START в боте</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">4.</span>
                <span>Готово! Получишь приветственное сообщение 🎉</span>
              </p>
            </div>

            <p className="text-xs text-gray-500 text-center pt-2">
              💡 Подключение Telegram также активирует напоминания о задачах в Kanban
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Telegram Connection Component
 * Компонент для подключения AI-наставника через Telegram
 * Используется общий telegram_chat_id для Kanban и AI-Mentor
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TELEGRAM_BOT_USERNAME = 'onaimentor_bot';

export function TelegramConnect() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

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
      const res = await fetch(`${BACKEND_URL}/api/telegram/status/${user.id}`);
      const data = await res.json();
      setIsConnected(data.connected || false);
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
      const response = await fetch(`${BACKEND_URL}/api/telegram/generate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const { token } = await response.json();
      const telegramUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}`;
      
      window.open(telegramUrl, '_blank');
      
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

  if (isChecking) {
    return (
      <Card className="border-[#00FF88]/30 bg-black/50 backdrop-blur-md">
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
    <Card className="border-[#00FF88]/30 bg-black/50 backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#0088cc]/20 flex items-center justify-center border border-[#0088cc]/30">
            <MessageCircle className="w-6 h-6 text-[#0088cc]" />
          </div>
          <div>
            <CardTitle className="text-white">AI-Наставник в Telegram</CardTitle>
            <CardDescription className="text-gray-400">
              {isConnected ? 'Подключен и активен' : 'Получай персональные мотивационные сообщения'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30">
              <CheckCircle2 className="w-5 h-5 text-[#00FF88]" />
              <div className="flex-1">
                <p className="text-white font-medium">Telegram подключен</p>
                <p className="text-sm text-gray-400">
                  AI-Наставник будет отправлять тебе персональные мотивационные сообщения каждый день
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Что ты будешь получать:</h4>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Ежедневную мотивацию на основе твоего прогресса</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Персональные советы по обучению</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Напоминания продолжить обучение</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Напоминания о задачах из Kanban</span>
                </li>
              </ul>
            </div>

            <p className="text-xs text-gray-500">
              💡 Бот: <a href={`https://t.me/${TELEGRAM_BOT_USERNAME}`} target="_blank" rel="noopener noreferrer" className="text-[#0088cc] hover:underline">@{TELEGRAM_BOT_USERNAME}</a>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white">Что ты получишь:</h4>
              <ul className="space-y-1.5 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Ежедневные мотивационные сообщения от AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Персональные советы по обучению</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Напоминания о задачах из Kanban</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00FF88] mt-0.5">✓</span>
                  <span>Поддержка и мотивация 24/7</span>
                </li>
              </ul>
            </div>

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

            <div className="space-y-2 text-xs text-gray-500">
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">1.</span>
                <span>Нажми кнопку "Подключить"</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">2.</span>
                <span>Откроется Telegram бот</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">3.</span>
                <span>Нажми START в боте</span>
              </p>
              <p className="flex items-start gap-1.5">
                <span className="text-[#00FF88] mt-0.5">4.</span>
                <span>Готово! Бот подключен автоматически</span>
              </p>
            </div>

            <p className="text-xs text-gray-500 text-center">
              💡 Подключение Telegram также активирует напоминания в Kanban
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



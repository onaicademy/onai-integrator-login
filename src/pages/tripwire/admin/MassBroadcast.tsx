import { useState } from 'react';
import { Send, MessageSquare, Mail, Users, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/utils/apiClient';

/**
 * 📧📱 МАССОВЫЕ РАССЫЛКИ (EMAIL + SMS)
 * 
 * Интерфейс для отправки массовых уведомлений всем студентам
 */

const MassBroadcast = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Email данные
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  
  // SMS данные
  const [smsMessage, setSmsMessage] = useState('');
  const [shortLink, setShortLink] = useState('onai.academy/l/abc123');
  
  // Статистика
  const [stats, setStats] = useState<{
    totalStudents: number;
    excludedCount: number;
    emailRecipients: number;
    smsRecipients: number;
  } | null>(null);

  // SMS лимиты
  const SMS_LIMIT = 70; // 70 символов для дешёвого тарифа
  const SHORT_LINK_PLACEHOLDER = '{SHORT_LINK}';
  
  // Вычисляем длину SMS с учётом короткой ссылки
  const getSmsLength = () => {
    const messageWithLink = smsMessage.replace(SHORT_LINK_PLACEHOLDER, shortLink);
    return messageWithLink.length;
  };

  const smsLength = getSmsLength();
  const smsRemaining = SMS_LIMIT - smsLength;
  const isSmsOverLimit = smsLength > SMS_LIMIT;

  // Вставка переменной {SHORT_LINK} в SMS
  const insertShortLink = () => {
    const textarea = document.getElementById('sms-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = smsMessage;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setSmsMessage(before + SHORT_LINK_PLACEHOLDER + after);
    
    // Вернуть фокус на textarea
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + SHORT_LINK_PLACEHOLDER.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Загрузка статистики получателей
  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/api/tripwire/admin/mass-broadcast/stats');
      setStats(data);
    } catch (error: any) {
      toast({
        title: '❌ Ошибка',
        description: error?.message || 'Не удалось загрузить статистику',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Синхронизация списка получателей
  const syncRecipients = async () => {
    setIsSyncing(true);
    try {
      const data = await apiRequest('/api/tripwire/admin/mass-broadcast/sync', {
        method: 'POST',
      });
      
      // Обновить статистику
      setStats({
        totalStudents: data.totalStudents,
        excludedCount: data.excludedCount,
        emailRecipients: data.emailRecipients,
        smsRecipients: data.smsRecipients,
      });

      toast({
        title: '✅ Синхронизация завершена',
        description: `Найдено ${data.emailRecipients} email и ${data.smsRecipients} телефонов`,
      });
    } catch (error: any) {
      toast({
        title: '❌ Ошибка синхронизации',
        description: error?.message || 'Не удалось синхронизировать данные',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Отправка массовой рассылки
  const sendBroadcast = async () => {
    // Валидация
    if (!emailSubject.trim()) {
      toast({
        title: '⚠️ Ошибка',
        description: 'Введите тему письма',
        variant: 'destructive',
      });
      return;
    }

    if (!emailMessage.trim()) {
      toast({
        title: '⚠️ Ошибка',
        description: 'Введите текст email',
        variant: 'destructive',
      });
      return;
    }

    if (smsMessage.trim() && isSmsOverLimit) {
      toast({
        title: '⚠️ Ошибка',
        description: `SMS превышает лимит на ${Math.abs(smsRemaining)} символов`,
        variant: 'destructive',
      });
      return;
    }

    // Подтверждение
    const confirmed = window.confirm(
      `Вы уверены?\n\n` +
      `Будет отправлено:\n` +
      `📧 EMAIL: ${stats?.emailRecipients || 0} студентов\n` +
      `📱 SMS: ${stats?.smsRecipients || 0} студентов\n\n` +
      `Это действие нельзя отменить!`
    );

    if (!confirmed) return;

    setIsSending(true);

    try {
      const response = await apiRequest('/api/tripwire/admin/mass-broadcast/send', {
        method: 'POST',
        body: JSON.stringify({
          email: {
            subject: emailSubject,
            message: emailMessage,
          },
          sms: smsMessage.trim() ? {
            message: smsMessage,
            shortLink: shortLink,
          } : null,
        }),
      });

      toast({
        title: '🎉 Рассылка завершена!',
        description: (
          <div className="space-y-1">
            <p>📧 Email: {response.emailSuccess} отправлено</p>
            {response.smsSuccess > 0 && (
              <p>📱 SMS: {response.smsSuccess} отправлено</p>
            )}
          </div>
        ),
      });

      // Очистить форму
      setEmailSubject('');
      setEmailMessage('');
      setSmsMessage('');

    } catch (error: any) {
      toast({
        title: '❌ Ошибка отправки',
        description: error?.message || 'Не удалось отправить рассылку',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Загрузка статистики при монтировании
  useState(() => {
    loadStats();
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Send className="w-8 h-8 text-[#00FF88]" />
            Массовые рассылки
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Отправка EMAIL и SMS всем студентам платформы
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={syncRecipients}
            disabled={isSyncing || isSending}
            variant="default"
            className="bg-[#00FF88] hover:bg-[#00DD77] text-black"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
          </Button>
          <Button
            onClick={loadStats}
            disabled={isLoading || isSyncing}
            variant="outline"
          >
            <Users className="w-4 h-4 mr-2" />
            {isLoading ? 'Загрузка...' : 'Обновить'}
          </Button>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Всего студентов</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalStudents}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Исключено</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-500">
                {stats.excludedCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">админы + sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                EMAIL получат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {stats.emailRecipients}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS получат
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {stats.smsRecipients}
              </p>
              {stats.smsRecipients > 0 ? (
                <p className="text-xs text-gray-400 mt-1">из landing_leads БД</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">нет телефонов в БД</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Предупреждение о исключённых */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Исключены из рассылки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Следующие аккаунты <strong>НЕ получат</strong> рассылку:
          </p>
          <ul className="text-xs text-orange-600 dark:text-orange-400 mt-2 space-y-1">
            <li>• test.student.tripwire@test.com (тестовый)</li>
            <li>• smmmcwin@gmail.com (админ)</li>
            <li>• rakhat@onaiacademy.kz (sales manager)</li>
            <li>• amina@onaiacademy.kz (sales manager)</li>
            <li>• aselya@onaiacademy.kz (sales manager)</li>
            <li>• ayaulym@onaiacademy.kz (sales manager)</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EMAIL Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              EMAIL рассылка
            </CardTitle>
            <CardDescription>
              Письмо будет отправлено через Resend по единому шаблону
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email-subject">Тема письма</Label>
              <Input
                id="email-subject"
                placeholder="⚡ Важная новость от onAI Academy"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email-message">Текст письма</Label>
              <Textarea
                id="email-message"
                placeholder="Привет! У нас важная новость..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="mt-1 min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Текст будет оформлен в фирменном стиле onAI Academy
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SMS Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              SMS рассылка
            </CardTitle>
            <CardDescription>
              Короткое текстовое сообщение через Mobizon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="short-link">Короткая ссылка</Label>
              <Input
                id="short-link"
                placeholder="onai.academy/l/abc123"
                value={shortLink}
                onChange={(e) => setShortLink(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Эта ссылка будет подставлена вместо переменной {SHORT_LINK_PLACEHOLDER}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="sms-textarea">Текст SMS</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={insertShortLink}
                    className="text-xs"
                  >
                    Вставить {SHORT_LINK_PLACEHOLDER}
                  </Button>
                </div>
              </div>
              <Textarea
                id="sms-textarea"
                placeholder="Эфир завтра! Готовься: {SHORT_LINK}"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className={`mt-1 min-h-[200px] font-mono text-sm ${
                  isSmsOverLimit ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              />
              
              {/* Счётчик символов */}
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm">
                  {isSmsOverLimit ? (
                    <span className="text-red-600 font-semibold">
                      ⚠️ Превышен лимит на {Math.abs(smsRemaining)} символов
                    </span>
                  ) : (
                    <span className={smsRemaining < 10 ? 'text-orange-600' : 'text-gray-600'}>
                      Осталось: {smsRemaining} символов
                    </span>
                  )}
                </div>
                <div className={`text-sm font-mono ${
                  isSmsOverLimit ? 'text-red-600 font-bold' : 'text-gray-500'
                }`}>
                  {smsLength} / {SMS_LIMIT}
                </div>
              </div>

              {/* Предпросмотр SMS с ссылкой */}
              {smsMessage.includes(SHORT_LINK_PLACEHOLDER) && (
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Предпросмотр:</p>
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {smsMessage.replace(SHORT_LINK_PLACEHOLDER, shortLink)}
                  </p>
                </div>
              )}

              {stats?.smsRecipients === 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ SMS не будут отправлены: нет телефонов в БД
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Кнопка отправки */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Готовы отправить?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Убедитесь, что проверили текст перед отправкой
              </p>
            </div>
            <Button
              size="lg"
              onClick={sendBroadcast}
              disabled={isSending || !emailSubject || !emailMessage || isSmsOverLimit}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Отправить рассылку
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MassBroadcast;

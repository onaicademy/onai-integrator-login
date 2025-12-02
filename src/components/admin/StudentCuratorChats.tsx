import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Calendar, MessageSquare, Bot, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Thread {
  id: string;
  openai_thread_id: string;
  title: string;
  created_at: string;
  message_count: number;
}

interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface StudentCuratorChatsProps {
  userId: string;
}

export function StudentCuratorChats({ userId }: StudentCuratorChatsProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка списка threads
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setLoadingThreads(true);
        setError(null);
        
        const response = await api.get<{ threads: Thread[] }>(
          `/api/admin/students/${userId}/curator-chats`
        );
        
        setThreads(response.threads || []);
        
        // Автоматически выбираем первый thread
        if (response.threads && response.threads.length > 0) {
          setSelectedThread(response.threads[0]);
        }
      } catch (err: any) {
        console.error('❌ Ошибка загрузки threads:', err);
        setError('Не удалось загрузить список чатов');
      } finally {
        setLoadingThreads(false);
      }
    };

    if (userId) {
      fetchThreads();
    }
  }, [userId]);

  // Загрузка сообщений для выбранного thread
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedThread) {
        setMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);
        setError(null);
        
        const response = await api.get<{ messages: Message[] }>(
          `/api/admin/students/${userId}/curator-chats/${selectedThread.id}/messages`
        );
        
        setMessages(response.messages || []);
      } catch (err: any) {
        console.error('❌ Ошибка загрузки сообщений:', err);
        setError('Не удалось загрузить сообщения');
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedThread, userId]);

  // Отображение ошибки
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-400">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  // Нет чатов
  if (!loadingThreads && threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <MessageCircle className="w-16 h-16 mb-4 text-gray-600" />
        <p className="text-lg font-semibold">Нет истории чатов</p>
        <p className="text-sm text-gray-500 mt-2">
          Студент ещё не общался с AI-Куратором
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Левая панель: список threads */}
      <Card className="md:col-span-1 bg-zinc-950 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4 text-[#00FF88]" />
            Чаты ({threads.length})
          </CardTitle>
          <CardDescription className="text-xs text-gray-500">
            Выберите чат для просмотра
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {loadingThreads ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 bg-gray-800" />
                ))}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all hover:bg-zinc-900',
                      'border border-transparent',
                      selectedThread?.id === thread.id
                        ? 'bg-zinc-900 border-[#00FF88]/30'
                        : 'hover:border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {thread.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(thread.created_at), 'd MMM yyyy', {
                              locale: ru,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="px-2 py-0.5 bg-[#00FF88]/10 rounded-full">
                          <span className="text-xs font-medium text-[#00FF88]">
                            {thread.message_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Правая панель: сообщения */}
      <Card className="md:col-span-2 bg-zinc-950 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <MessageCircle className="w-4 h-4 text-[#00FF88]" />
            {selectedThread ? selectedThread.title : 'Выберите чат'}
          </CardTitle>
          {selectedThread && (
            <CardDescription className="text-xs text-gray-500">
              {format(new Date(selectedThread.created_at), 'd MMMM yyyy, HH:mm', {
                locale: ru,
              })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] px-4">
            {loadingMessages ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 bg-gray-800" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageCircle className="w-12 h-12 mb-3 text-gray-700" />
                <p className="text-sm">Нет сообщений в этом чате</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Иконка в зависимости от роли */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-blue-500/20' 
                          : 'bg-[#00FF88]/20'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Bot className="w-4 h-4 text-[#00FF88]" />
                        )}
                      </div>
                      
                      {/* Сообщение */}
                      <div className="flex-1">
                        <div className={`rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-zinc-900 border border-gray-800'
                            : 'bg-zinc-900 border border-[#00FF88]/20'
                        }`}>
                          <p className={`text-sm whitespace-pre-wrap ${
                            message.role === 'user' ? 'text-white' : 'text-gray-200'
                          }`}>
                            {message.content}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {message.role === 'user' 
                            ? format(new Date(message.created_at), 'HH:mm', { locale: ru })
                            : 'AI-Куратор'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}


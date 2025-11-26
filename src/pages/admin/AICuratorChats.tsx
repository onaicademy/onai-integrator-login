import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Search,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  Bot,
  Mic,
  FileText,
  Smile,
  Frown,
  Meh,
  BookOpen,
  Calendar,
  BarChart3,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  mockAIThreads,
  getMockMessages,
  getMockMetrics,
  type MockAIThread,
  type MockAIMessage,
  type MockAIMetrics,
} from "@/lib/mock-ai-chat-data";

export default function AICuratorChats() {
  const [threads, setThreads] = useState<MockAIThread[]>(mockAIThreads);
  const [filteredThreads, setFilteredThreads] = useState<MockAIThread[]>(mockAIThreads);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedThread, setSelectedThread] = useState<MockAIThread | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<MockAIMessage[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<MockAIMetrics | null>(null);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const { toast } = useToast();

  // Фильтрация threads по поисковому запросу
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredThreads(threads);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = threads.filter(
      (thread) =>
        thread.user_name.toLowerCase().includes(query) ||
        thread.user_email.toLowerCase().includes(query) ||
        thread.title.toLowerCase().includes(query)
    );
    setFilteredThreads(filtered);
  }, [searchQuery, threads]);

  // Открытие диалога с детальной информацией
  const handleOpenThread = (thread: MockAIThread) => {
    setSelectedThread(thread);
    const messages = getMockMessages(thread.id);
    const metrics = getMockMetrics(thread.id);
    setSelectedMessages(messages);
    setSelectedMetrics(metrics);
    setShowChatDialog(true);
  };

  // Получение иконки для настроения
  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return <Smile className="w-4 h-4 text-green-500" />;
      case "negative":
        return <Frown className="w-4 h-4 text-red-500" />;
      default:
        return <Meh className="w-4 h-4 text-yellow-500" />;
    }
  };

  // Форматирование времени ответа
  const formatResponseTime = (ms?: number) => {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}мс`;
    return `${(ms / 1000).toFixed(1)}с`;
  };

  // Статистика по всем диалогам
  const totalStats = {
    totalThreads: threads.length,
    totalMessages: threads.reduce((sum, t) => sum + t.message_count, 0),
    activeThreads: threads.filter((t) => {
      const daysSinceUpdate = (Date.now() - new Date(t.last_message_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate < 7;
    }).length,
    avgMessagesPerThread: Math.round(
      threads.reduce((sum, t) => sum + t.message_count, 0) / threads.length
    ),
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 font-display">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            Диалоги с AI-куратором
          </h1>
          <p className="text-muted-foreground mt-1">
            Просмотр и анализ истории общения пользователей с AI-куратором
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего диалогов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalThreads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего сообщений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активных диалогов
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{totalStats.activeThreads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ср. сообщений/диалог
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.avgMessagesPerThread}</div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск диалогов</CardTitle>
          <CardDescription>
            Найдите диалог по имени пользователя, email или теме
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Поиск по имени, email или теме..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Список диалогов */}
      <Card>
        <CardHeader>
          <CardTitle>Список диалогов</CardTitle>
          <CardDescription>
            {filteredThreads.length} из {threads.length} диалогов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredThreads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Диалоги не найдены
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleOpenThread(thread)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{thread.user_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {thread.message_count} сообщений
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{thread.user_email}</p>
                      <p className="text-sm font-medium">{thread.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(thread.last_message_at), "dd.MM.yyyy HH:mm", {
                          locale: ru,
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Диалог с детальной информацией */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Диалог с {selectedThread?.user_name}
            </DialogTitle>
            <DialogDescription>
              {selectedThread?.title} • {selectedThread?.message_count} сообщений
            </DialogDescription>
          </DialogHeader>

          {selectedThread && selectedMetrics && (
            <Tabs defaultValue="messages" className="flex-1 flex flex-col overflow-hidden">
              <TabsList>
                <TabsTrigger value="messages">Сообщения</TabsTrigger>
                <TabsTrigger value="metrics">Метрики</TabsTrigger>
                <TabsTrigger value="analysis">Анализ</TabsTrigger>
              </TabsList>

              {/* Вкладка сообщений */}
              <TabsContent value="messages" className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4 py-4">
                    {selectedMessages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {message.role === "assistant" && (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "rounded-lg p-3 max-w-[80%]",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {message.is_voice_message && (
                              <Badge variant="outline" className="text-xs">
                                <Mic className="w-3 h-3 mr-1" />
                                Голос
                              </Badge>
                            )}
                            {message.has_attachments && (
                              <Badge variant="outline" className="text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                Вложение
                              </Badge>
                            )}
                            {message.sentiment && getSentimentIcon(message.sentiment)}
                            {message.lesson_reference && (
                              <Badge variant="outline" className="text-xs">
                                <BookOpen className="w-3 h-3 mr-1" />
                                Урок {message.lesson_reference}
                                {message.lesson_timestamp &&
                                  ` (${Math.floor(message.lesson_timestamp / 60)}:${String(
                                    message.lesson_timestamp % 60
                                  ).padStart(2, "0")})`}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                            <Clock className="w-3 h-3" />
                            {format(new Date(message.created_at), "dd.MM.yyyy HH:mm", {
                              locale: ru,
                            })}
                            {message.response_time_ms && (
                              <>
                                <span>•</span>
                                <span>Ответ: {formatResponseTime(message.response_time_ms)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {message.role === "user" && (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Вкладка метрик */}
              <TabsContent value="metrics" className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Общая статистика</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Всего сообщений:</span>
                        <span className="font-medium">{selectedMetrics.total_messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Сообщений пользователя:</span>
                        <span className="font-medium">{selectedMetrics.user_messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Ответов AI:</span>
                        <span className="font-medium">{selectedMetrics.assistant_messages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Среднее время ответа:</span>
                        <span className="font-medium">
                          {formatResponseTime(selectedMetrics.avg_response_time_ms)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Настроение</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Smile className="w-4 h-4 text-green-500" />
                          Позитивных:
                        </span>
                        <span className="font-medium text-green-500">
                          {selectedMetrics.positive_interactions}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Meh className="w-4 h-4 text-yellow-500" />
                          Нейтральных:
                        </span>
                        <span className="font-medium">{selectedMetrics.neutral_interactions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Frown className="w-4 h-4 text-red-500" />
                          Негативных:
                        </span>
                        <span className="font-medium text-red-500">
                          {selectedMetrics.negative_interactions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Средний балл:</span>
                        <span className="font-medium">
                          {selectedMetrics.avg_sentiment_score.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Активность</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Обсуждено уроков:</span>
                        <span className="font-medium">{selectedMetrics.lessons_discussed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Задано вопросов:</span>
                        <span className="font-medium">{selectedMetrics.questions_asked}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Вкладка анализа */}
              <TabsContent value="analysis" className="flex-1 overflow-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI-анализ диалога</CardTitle>
                    <CardDescription>
                      Автоматический анализ эффективности общения (будет реализовано позже)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>AI-анализ будет доступен после интеграции с AI-наставником</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


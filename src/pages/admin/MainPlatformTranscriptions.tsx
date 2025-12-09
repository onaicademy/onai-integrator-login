import { useState } from 'react';
import { getAuthToken, apiRequest } from '@/utils/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowLeft, Video, Download, FileText, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Lesson {
  id: number;
  title: string;
  bunny_video_id: string;
  module_id: number;
  modules: {
    id: number;
    title: string;
  };
  transcription_status: 'not_started' | 'pending' | 'processing' | 'completed' | 'failed';
  transcript_text: string | null;
  transcribed_at: string | null;
}

export default function MainPlatformTranscriptions() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  
  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Транскрибация скопирована в буфер обмена!');
  };

  // Загрузить список уроков
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['admin', 'transcriptions', 'main-platform'],
    queryFn: async () => {
      const data = await apiRequest('/api/admin/transcriptions/lessons', {
        method: 'GET'
      });
      return data.lessons as Lesson[];
    }
  });

  // Транскрибировать все
  const transcribeAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/transcriptions/transcribe-all', {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      toast.success(`Запущена транскрибация ${data.total_lessons} уроков`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'transcriptions', 'main-platform'] });
    },
    onError: () => {
      toast.error('Ошибка запуска транскрибации');
    }
  });

  // Фильтрация
  const filteredLessons = lessons?.filter(lesson => {
    const matchesStatus = statusFilter === 'all' || lesson.transcription_status === statusFilter;
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Статистика
  const stats = {
    total: lessons?.length || 0,
    completed: lessons?.filter(l => l.transcription_status === 'completed').length || 0,
    pending: lessons?.filter(l => l.transcription_status === 'pending' || l.transcription_status === 'processing').length || 0,
    not_started: lessons?.filter(l => l.transcription_status === 'not_started').length || 0,
    failed: lessons?.filter(l => l.transcription_status === 'failed').length || 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/admin/dashboard" className="text-muted-foreground hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
        </Link>
            <h1 className="text-3xl font-bold">Транскрипции и Субтитры</h1>
          </div>
          <p className="text-muted-foreground">Управление субтитрами для основной платформы (Main Platform)</p>
        </div>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'transcriptions', 'main-platform'] })} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Всего транскрипций</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Готовые (completed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats.completed}
        </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Средний размер текста</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {lessons && lessons.length > 0 
                ? Math.round(
                    lessons
                      .filter(l => l.transcript_text)
                      .reduce((sum, l) => sum + (l.transcript_text?.length || 0), 0) / 
                    (lessons.filter(l => l.transcript_text).length || 1) / 1024
                  )
                : 0} KB
            </div>
          </CardContent>
        </Card>
        </div>

      {/* Transcriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Список транскрипций</CardTitle>
          <CardDescription>Все доступные субтитры для уроков основной платформы</CardDescription>
        </CardHeader>
        <CardContent>
        {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : !filteredLessons || filteredLessons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Нет транскрипций</div>
          ) : (
            <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {filteredLessons.map((lesson) => (
                  <Card key={lesson.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        {/* Left: Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-[#00FF88]" />
                            <span className="font-semibold text-lg">
                              {lesson.title}
                      </span>
                            <Badge variant={lesson.transcription_status === 'completed' ? 'default' : 'secondary'}>
                              {lesson.transcription_status}
                            </Badge>
                  </div>
                  
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>📚 Модуль: {lesson.modules?.title || 'Unknown'} • Lesson ID: {lesson.id}</div>
                            <div>📹 Video ID: <code className="text-xs">{lesson.bunny_video_id.substring(0, 20)}...</code></div>
                            <div>📄 Text Size: {((lesson.transcript_text?.length || 0) / 1024).toFixed(1)} KB</div>
                            {lesson.transcribed_at && (
                              <div>📅 Created: {new Date(lesson.transcribed_at).toLocaleDateString('ru-RU')}</div>
                  )}
                </div>

                          {/* Preview */}
                          {lesson.transcript_text && (
                            <div className="mt-2 p-3 bg-muted rounded-md">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {lesson.transcript_text.substring(0, 200)}...
                      </p>
                    </div>
                          )}
                  </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          {lesson.transcript_text && (
                            <Button
                              onClick={() => setSelectedLesson(lesson)}
                              variant="outline"
                              size="sm"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              Текст
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Text Preview Dialog */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh]">
            <CardHeader>
              <CardTitle>Транскрипция текстом</CardTitle>
              <CardDescription>
                {selectedLesson.title} - {selectedLesson.modules?.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="whitespace-pre-wrap text-sm">
                  {selectedLesson.transcript_text || 'Текст отсутствует'}
                </div>
              </ScrollArea>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setSelectedLesson(null)}>
                  Закрыть
                </Button>
          </div>
            </CardContent>
          </Card>
          </div>
        )}
    </div>
  );
}


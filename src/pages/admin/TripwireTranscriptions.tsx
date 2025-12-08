/**
 * Tripwire Transcriptions Admin Panel
 * Управление транскрипциями и субтитрами
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Video, Download, Upload, Trash2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { tripwireSupabase } from '@/lib/supabase-tripwire';
import { toast } from 'sonner';

interface Transcription {
  id: string;
  video_id: string;
  lesson_id: number;
  module_id: number;
  transcript_text?: string;
  transcript_vtt?: string;
  language: string;
  status: string;
  generated_by?: string;
  generated_at?: string;
  created_at: string;
}

export default function TripwireTranscriptions() {
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null);

  // Загрузить все транскрипции
  const loadTranscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await tripwireSupabase
        .from('video_transcriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTranscriptions(data || []);
      toast.success(`Загружено ${data?.length || 0} транскрипций`);
    } catch (error: any) {
      console.error('❌ Error loading transcriptions:', error);
      toast.error('Ошибка загрузки транскрипций');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscriptions();
  }, []);

  // Скачать VTT файл
  const downloadVTT = (trans: Transcription) => {
    if (!trans.transcript_vtt) {
      toast.error('VTT файл отсутствует');
      return;
    }

    const blob = new Blob([trans.transcript_vtt], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitles_lesson_${trans.lesson_id}_${trans.language}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('VTT файл скачан');
  };

  // Удалить транскрипцию
  const deleteTranscription = async (id: string) => {
    if (!confirm('Удалить эту транскрипцию?')) return;

    try {
      const { error } = await tripwireSupabase
        .from('video_transcriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Транскрипция удалена');
      loadTranscriptions();
    } catch (error: any) {
      console.error('❌ Error deleting:', error);
      toast.error('Ошибка удаления');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Транскрипции и Субтитры</h1>
          <p className="text-muted-foreground">Управление субтитрами для Tripwire уроков</p>
        </div>
        <Button onClick={loadTranscriptions} variant="outline">
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
            <div className="text-3xl font-bold">{transcriptions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Готовые (completed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {transcriptions.filter(t => t.status === 'completed').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Средний размер VTT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(
                transcriptions.reduce((sum, t) => sum + (t.transcript_vtt?.length || 0), 0) / 
                (transcriptions.length || 1) / 1024
              )} KB
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Список транскрипций</CardTitle>
          <CardDescription>Все доступные субтитры для уроков</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : transcriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Нет транскрипций</div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {transcriptions.map((trans) => (
                  <Card key={trans.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        {/* Left: Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-[#00FF88]" />
                            <span className="font-semibold">
                              Lesson {trans.lesson_id} (Module {trans.module_id})
                            </span>
                            <Badge variant={trans.status === 'completed' ? 'default' : 'secondary'}>
                              {trans.status}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>📹 Video ID: <code className="text-xs">{trans.video_id.substring(0, 20)}...</code></div>
                            <div>🌐 Language: {trans.language}</div>
                            <div>📊 VTT Size: {((trans.transcript_vtt?.length || 0) / 1024).toFixed(1)} KB</div>
                            <div>📄 Text Size: {((trans.transcript_text?.length || 0) / 1024).toFixed(1)} KB</div>
                            <div>🤖 Generated by: {trans.generated_by || 'N/A'}</div>
                            <div>📅 Created: {new Date(trans.created_at).toLocaleDateString('ru-RU')}</div>
                          </div>

                          {/* Preview */}
                          {trans.transcript_text && (
                            <div className="mt-2 p-3 bg-muted rounded-md">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {trans.transcript_text.substring(0, 200)}...
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            onClick={() => downloadVTT(trans)}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            VTT
                          </Button>
                          
                          <Button
                            onClick={() => setSelectedTranscription(trans)}
                            variant="outline"
                            size="sm"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Текст
                          </Button>

                          <Button
                            onClick={() => deleteTranscription(trans.id)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
      {selectedTranscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh]">
            <CardHeader>
              <CardTitle>Транскрипция текстом</CardTitle>
              <CardDescription>
                Lesson {selectedTranscription.lesson_id} - {selectedTranscription.language}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="whitespace-pre-wrap text-sm">
                  {selectedTranscription.transcript_text || 'Текст отсутствует'}
                </div>
              </ScrollArea>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setSelectedTranscription(null)}>
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

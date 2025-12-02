import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Lesson {
  id: number;
  title: string;
  bunny_video_id: string;
  modules: { title: string };
  transcription_status: string;
  word_count: number;
  transcribed_at: string | null;
}

interface Props {
  lessons: Lesson[];
  onSelectLesson: (lesson: Lesson) => void;
}

export default function TranscriptionList({ lessons, onSelectLesson }: Props) {
  const queryClient = useQueryClient();

  const transcribeMutation = useMutation({
    mutationFn: async (lessonId: number) => {
      const response = await fetch(`/api/admin/transcriptions/lesson/${lessonId}/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to start transcription');
      return response.json();
    },
    onSuccess: () => {
      toast.success('✅ Транскрибация запущена');
      queryClient.invalidateQueries({ queryKey: ['admin', 'transcriptions'] });
    },
    onError: () => {
      toast.error('❌ Ошибка запуска транскрибации');
    }
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      pending: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      failed: 'bg-red-500/20 text-red-400 border-red-500/40',
      not_started: 'bg-gray-500/20 text-gray-400 border-gray-500/40'
    };

    const labels = {
      completed: '✅ Готово',
      processing: '⚙️ Обработка...',
      pending: '⏳ Ожидание',
      failed: '❌ Ошибка',
      not_started: '⚪ Не начато'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-800 border border-emerald-500/20 rounded-lg">
        <div className="text-gray-400 text-lg">📭 Уроки не найдены</div>
        <div className="text-gray-500 text-sm mt-2">Попробуйте изменить фильтры</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lessons.map(lesson => (
        <div 
          key={lesson.id} 
          className="bg-gray-800 border border-emerald-500/20 rounded-lg p-4 hover:border-emerald-500/40 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-white font-medium">{lesson.title}</h3>
                {getStatusBadge(lesson.transcription_status)}
              </div>
              <div className="text-sm text-gray-400">
                📚 Модуль: {lesson.modules.title}
                {lesson.word_count > 0 && ` • 📝 ${lesson.word_count} слов`}
                {lesson.transcribed_at && ` • 🕐 ${new Date(lesson.transcribed_at).toLocaleString('ru-RU')}`}
              </div>
            </div>

            <div className="flex gap-2">
              {lesson.transcription_status === 'completed' && (
                <button
                  onClick={() => onSelectLesson(lesson)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  👁️ Просмотр
                </button>
              )}
              
              {(lesson.transcription_status === 'not_started' || lesson.transcription_status === 'failed') && (
                <button
                  onClick={() => transcribeMutation.mutate(lesson.id)}
                  disabled={transcribeMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  {transcribeMutation.isPending ? '⏳ Запуск...' : '🎙️ Транскрибировать'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiRequest } from '@/utils/apiClient';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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

export default function Transcriptions() {
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<number | null>(null);
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
    queryKey: ['tripwire', 'admin', 'transcriptions'],
    queryFn: async () => {
      const data = await apiRequest<{ lessons: Lesson[] }>('/api/tripwire/admin/transcriptions/lessons');
      return data.lessons;
    }
  });

  // Транскрибировать все
  const transcribeAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/tripwire/admin/transcriptions/transcribe-all', { method: 'POST' });
    },
    onSuccess: (data) => {
      toast.success(`Запущена транскрибация ${data.total_lessons} уроков`);
      queryClient.invalidateQueries({ queryKey: ['tripwire', 'admin', 'transcriptions'] });
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
    <div className="min-h-screen relative overflow-hidden rounded-3xl bg-[#030303] border border-white/5">
      {/* ✅ BACKGROUND GRID */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* ✅ HEADER (NOT FIXED) */}
      <div className="relative z-10 px-8 py-8 border-b border-white/5">
        <Link to="/integrator/admin" className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-[#00FF94] transition-colors" >
          <ArrowLeft size={20} />
          Назад в админку
        </Link>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 px-8 py-12">
        <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Транскрибации уроков
        </h1>
        
        <p className="text-[#9CA3AF] mb-12">
          Управление автоматическими транскрибациями видео через Groq Whisper
        </p>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">Всего уроков</div>
            <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stats.total}</div>
          </div>
          <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl border border-[#00FF94]/20 rounded-2xl p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">Готово</div>
            <div className="text-2xl font-bold text-[#00FF94]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stats.completed}</div>
          </div>
          <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">В процессе</div>
            <div className="text-2xl font-bold text-yellow-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stats.pending}</div>
          </div>
          <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl border border-white/5 rounded-2xl p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">Не начато</div>
            <div className="text-2xl font-bold text-[#9CA3AF]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stats.not_started}</div>
          </div>
          <div className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl border border-[#FF3366]/20 rounded-2xl p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">Ошибки</div>
            <div className="text-2xl font-bold text-[#FF3366]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{stats.failed}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => transcribeAllMutation.mutate()}
            disabled={transcribeAllMutation.isPending || stats.not_started === 0}
            className="bg-[#00FF94] hover:bg-[#00FF94]/80 disabled:bg-gray-800 disabled:text-gray-500 text-black px-6 py-3 rounded-xl font-bold transition-colors"
          >
            {transcribeAllMutation.isPending ? (
              '⏳ Запуск...'
            ) : (
              `🚀 Транскрибировать все (${stats.not_started})`
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="🔍 Поиск по названию урока..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-[rgba(20,20,20,0.6)] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00FF94]/50 transition-colors"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[rgba(20,20,20,0.6)] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00FF94]/50 transition-colors"
          >
            <option value="all">Все статусы</option>
            <option value="completed">Готово</option>
            <option value="processing">В процессе</option>
            <option value="pending">Ожидание</option>
            <option value="not_started">Не начато</option>
            <option value="failed">Ошибки</option>
          </select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-[#9CA3AF]">
            ⏳ Загрузка уроков...
          </div>
        ) : filteredLessons && filteredLessons.length > 0 ? (
          <div className="space-y-4">
            {filteredLessons.map((lesson) => (
              <div 
                key={lesson.id}
                className="bg-[rgba(20,20,20,0.6)] backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden transition-all duration-300"
              >
                {/* Header */}
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedLessonId(expandedLessonId === lesson.id ? null : lesson.id)}
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">{lesson.title}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-[#9CA3AF]">
                        📚 Модуль: {lesson.modules?.title || 'Unknown'}
                      </span>
                      {lesson.transcription_status === 'completed' ? (
                        <span className="text-[#00FF94]">✅ Готово</span>
                      ) : (
                        <span className="text-[#9CA3AF]">⚪ Не начато</span>
                      )}
                    </div>
                  </div>
                  
                  {lesson.transcription_status === 'completed' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (lesson.transcript_text) {
                          copyToClipboard(lesson.transcript_text);
                        }
                      }}
                      className="px-4 py-2 bg-[#00FF94] hover:bg-[#00FF94]/80 text-black rounded-xl font-semibold transition-colors"
                    >
                      📋 Copy
                    </button>
                  )}
                </div>

                {/* Expanded Content */}
                {expandedLessonId === lesson.id && lesson.transcript_text && (
                  <div className="border-t border-white/5 p-6 bg-black/20">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-[#00FF94] uppercase tracking-wider">
                        Транскрибация
                      </h4>
                      <span className="text-xs text-[#9CA3AF]">
                        {lesson.transcript_text.length.toLocaleString()} символов
                      </span>
                    </div>
                    <div className="bg-[rgba(20,20,20,0.8)] rounded-xl p-4 max-h-96 overflow-y-auto">
                      <p className="text-white leading-relaxed whitespace-pre-wrap">
                        {lesson.transcript_text}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[#9CA3AF]">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-lg">Уроки не найдены</p>
            <p className="text-sm mt-2">Попробуйте изменить фильтры</p>
          </div>
        )}

      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, Copy } from 'lucide-react';

interface Props {
  lesson: {
    id: number;
    title: string;
  };
  onClose: () => void;
}

export default function TranscriptionModal({ lesson, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'text' | 'srt' | 'vtt'>('text');

  const { data, isLoading } = useQuery({
    queryKey: ['transcription', lesson.id],
    queryFn: async () => {
      const response = await fetch(`/api/admin/transcriptions/lesson/${lesson.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch transcription');
      return response.json();
    }
  });

  const handleCopy = (text: string, format: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`✅ ${format} скопирован в буфер обмена`);
  };

  const currentContent = {
    text: data?.transcription.text || '',
    srt: data?.transcription.srt || '',
    vtt: data?.transcription.vtt || ''
  }[activeTab];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-emerald-500/20 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-500/20">
          <div>
            <h2 className="text-2xl font-bold text-white">🎙️ {lesson.title}</h2>
            {data && (
              <p className="text-sm text-gray-400 mt-1">
                📝 {data.transcription.word_count} слов • 🕐 {new Date(data.transcription.generated_at).toLocaleString('ru-RU')}
              </p>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 px-6 pt-4 border-b border-emerald-500/20">
          <button
            onClick={() => setActiveTab('text')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'text'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📄 Текст
          </button>
          <button
            onClick={() => setActiveTab('srt')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'srt'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📹 SRT
          </button>
          <button
            onClick={() => setActiveTab('vtt')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'vtt'
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎬 VTT
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">
              ⏳ Загрузка транскрибации...
            </div>
          ) : (
            <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm">
              {currentContent}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-emerald-500/20">
          <button
            onClick={() => handleCopy(currentContent, activeTab.toUpperCase())}
            disabled={isLoading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Copy size={18} />
            Копировать {activeTab.toUpperCase()}
          </button>
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}


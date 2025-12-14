import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/utils/apiClient';

interface VideoProcessingOverlayProps {
  videoId: string;
  onComplete: () => void;
}

export const VideoProcessingOverlay = ({ videoId, onComplete }: VideoProcessingOverlayProps) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    let pollCount = 0;
    const maxPolls = 120; // 120 * 3s = 6 минут макс

    const checkStatus = async () => {
      try {
        pollCount++;
        console.log(`🔍 [Processing] Checking status for video: ${videoId} (attempt ${pollCount})`);

        const response = await api.get(`/api/videos/bunny-status/${videoId}`);
        const { status: videoStatus, encodeProgress } = response;

        console.log(`📊 [Processing] Status: ${videoStatus}, Progress: ${encodeProgress}%`);

        setProgress(encodeProgress || 0);

        // Status codes from Bunny CDN:
        // 0 = Created, 1 = Uploading, 2 = Uploaded, 3 = Processing, 4 = Encoded, 5 = Error
        if (videoStatus === 4) {
          console.log('✅ [Processing] Video encoded! Reloading page...');
          setStatus('complete');
          setTimeout(() => {
            window.location.reload(); // Перезагружаем страницу
          }, 1000);
          return;
        }

        if (videoStatus === 5) {
          console.error('❌ [Processing] Video encoding failed!');
          setStatus('error');
          return;
        }

        // Продолжаем проверку
        if (pollCount < maxPolls) {
          setTimeout(checkStatus, 3000); // Проверяем каждые 3 секунды
        } else {
          console.warn('⚠️ [Processing] Max polling attempts reached');
          setStatus('timeout');
        }
      } catch (error) {
        console.error('❌ [Processing] Error checking status:', error);
        // Продолжаем попытки даже при ошибке
        if (pollCount < maxPolls) {
          setTimeout(checkStatus, 3000);
        }
      }
    };

    checkStatus();
  }, [videoId]);

  if (status === 'complete') {
    return null; // Скрываем после завершения
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div className="max-w-md w-full p-8 space-y-6">
        {/* Animated Icon */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-center"
        >
          <div className="text-8xl mb-4">🎬</div>
        </motion.div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center">
          Видео обрабатывается...
        </h2>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Прогресс</span>
            <span className="font-bold text-[#00FF88]">{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-[#00FF88] to-[#00cc88] h-full rounded-full"
            />
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-2 text-center text-sm text-gray-400">
          {progress < 25 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <span className="animate-spin">⏳</span>
              Начинаем обработку...
            </motion.p>
          )}
          {progress >= 25 && progress < 50 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <span className="animate-pulse">🔥</span>
              Кодируем видео...
            </motion.p>
          )}
          {progress >= 50 && progress < 95 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2"
            >
              <span className="animate-bounce">⚡</span>
              Почти готово!
            </motion.p>
          )}
          {progress >= 95 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 text-[#00FF88] font-semibold"
            >
              <span className="animate-pulse">✅</span>
              Завершаем... Страница скоро перезагрузится!
            </motion.p>
          )}
        </div>

        {status === 'error' && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-center text-red-400">
            ❌ Ошибка обработки видео
          </div>
        )}

        {status === 'timeout' && (
          <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-center text-yellow-400">
            ⚠️ Обработка занимает больше времени...
          </div>
        )}

        {/* Hint */}
        <p className="text-xs text-gray-500 text-center">
          Не закрывайте страницу. Обработка займёт 1-3 минуты.
        </p>
      </div>
    </motion.div>
  );
};

/**
 * 🎬 VIDEO PROCESSING OVERLAY
 * Красивый overlay для отображения прогресса обработки видео на BunnyCDN
 * 
 * Features:
 * - ✅ Real-time progress bar (0-100%)
 * - ✅ Circular SVG progress indicator
 * - ✅ Animated status messages
 * - ✅ Error handling
 * - ✅ Neon green theme (#00FF88)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

interface VideoProcessingOverlayProps {
  videoId: string;
  statusLabel: string | null;
  progress: number;
  isLoading: boolean;
  error: string | null;
  isFailed: boolean;
  onRetry?: () => void;
  onRefresh?: () => void;
}

export const VideoProcessingOverlay: React.FC<VideoProcessingOverlayProps> = ({
  videoId,
  statusLabel,
  progress,
  isLoading,
  error,
  isFailed,
  onRetry,
  onRefresh,
}) => {
  return (
    <div className="aspect-video bg-gradient-to-br from-[#0a0a0f] via-[#0f1419] to-[#0a0a0f] flex items-center justify-center relative overflow-hidden rounded-2xl border border-[#00FF88]/20">
      {/* ✨ Animated Background with neon theme */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00FF88]/20 to-[#00cc88]/20 animate-pulse" />
      </div>

      {/* 🌟 Matrix-style particles effect */}
      <div className="absolute inset-0 overflow-hidden opacity-5">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#00FF88] rounded-full"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: -10,
              opacity: 0 
            }}
            animate={{ 
              y: '110%',
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-8">
        {/* Header with icon */}
        <div className="flex flex-col items-center gap-6">
          {/* Animated loader or status icon */}
          <div className="relative w-24 h-24">
            {isFailed ? (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-full h-full flex items-center justify-center"
              >
                <AlertCircle className="w-24 h-24 text-red-500 animate-pulse" />
              </motion.div>
            ) : progress === 100 ? (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-full h-full flex items-center justify-center"
              >
                <CheckCircle2 className="w-24 h-24 text-[#00FF88] animate-bounce" />
              </motion.div>
            ) : (
              <>
                {/* SVG Circular Progress */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(0, 255, 136, 0.1)"
                    strokeWidth="3"
                  />
                  {/* Progress circle with gradient */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#neonGradient)"
                    strokeWidth="3"
                    strokeDasharray={`${(progress / 100) * 282.7} 282.7`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ 
                      transition: 'stroke-dasharray 0.3s ease',
                      filter: 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.6))'
                    }}
                  />
                  <defs>
                    <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00FF88" />
                      <stop offset="100%" stopColor="#00cc88" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Spinning icon in center */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader className="w-10 h-10 text-[#00FF88]" />
                  </motion.div>
                </div>
              </>
            )}
          </div>

          {/* Status text */}
          <div className="text-center space-y-2">
            <h3 
              className="text-2xl font-bold font-['JetBrains_Mono'] text-white"
              style={{
                textShadow: isFailed ? '0 0 20px rgba(239, 68, 68, 0.8)' : '0 0 20px rgba(0, 255, 136, 0.6)'
              }}
            >
              {isFailed ? '❌ Ошибка обработки' : statusLabel || '🎬 Загрузка видео...'}
            </h3>
            {error && (
              <p className="text-sm text-red-400 font-['Manrope'] bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30">
                {error}
              </p>
            )}
          </div>

          {/* Progress bar */}
          {!isFailed && (
            <div className="w-full space-y-3">
              <div className="relative h-3 bg-[#0a0a0f] rounded-full overflow-hidden border border-[#00FF88]/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-[#00FF88] to-[#00cc88] rounded-full relative"
                  style={{
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.8)'
                  }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
              <p className="text-center text-lg font-bold font-['JetBrains_Mono'] text-[#00FF88]" style={{ textShadow: '0 0 10px rgba(0, 255, 136, 0.6)' }}>
                {progress}%
              </p>
            </div>
          )}

          {/* Error action buttons */}
          {isFailed && (
            <div className="w-full flex gap-3">
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="flex-1 px-6 py-3 bg-[#00FF88] hover:bg-[#00cc88] text-black font-bold rounded-xl font-['Manrope'] flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,136,0.6)]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Обновить статус
                </button>
              )}
            </div>
          )}

          {/* Helper text with dynamic messages */}
          <motion.p 
            key={progress} // Re-animate on progress change
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-white/60 font-['Manrope'] text-center mt-2"
          >
            {isFailed ? (
              '❌ При обработке видео произошла ошибка. Пожалуйста, обновите страницу или свяжитесь с администратором.'
            ) : progress === 100 ? (
              '✅ Видео готово! Загрузка плеера...'
            ) : progress >= 80 ? (
              '⚡ Почти готово! Финальная обработка...'
            ) : progress >= 50 ? (
              '🔥 Кодируем видео в разных разрешениях...'
            ) : progress >= 20 ? (
              '🎬 Обработка видео в процессе...'
            ) : (
              '⏳ Видео обрабатывается на сервере. Это займет 1-3 минуты...'
            )}
          </motion.p>

          {/* Video ID hint (только для debug) */}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-white/30 font-['JetBrains_Mono'] text-center">
              ID: {videoId}
            </p>
          )}
        </div>
      </div>

      {/* Add shimmer animation CSS */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

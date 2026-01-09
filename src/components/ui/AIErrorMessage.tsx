/**
 * AI Error Message Component
 *
 * User-friendly компонент для отображения ошибок rate limit.
 * Показывает ироничное сообщение, countdown и прогресс-бар.
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Coffee, Zap, Bot, RefreshCw } from 'lucide-react';

interface AIErrorMessageProps {
  message: string;
  waitSeconds: number;
  onRetry?: () => void;
  autoRetry?: boolean;
}

export function AIErrorMessage({
  message,
  waitSeconds,
  onRetry,
  autoRetry = true,
}: AIErrorMessageProps) {
  const [countdown, setCountdown] = useState(waitSeconds);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(() => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      onRetry();
      // Reset after short delay
      setTimeout(() => setIsRetrying(false), 2000);
    }
  }, [onRetry, isRetrying]);

  useEffect(() => {
    if (countdown <= 0) {
      if (autoRetry) {
        handleRetry();
      }
      return;
    }

    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, autoRetry, handleRetry]);

  // Случайная иконка для разнообразия
  const icons = [Bot, Coffee, Zap];
  const IconComponent = icons[Math.floor(Date.now() / 1000) % icons.length];

  const progress = Math.max(0, ((waitSeconds - countdown) / waitSeconds) * 100);

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-2xl
                    bg-gradient-to-br from-amber-500/10 to-orange-500/10
                    border border-amber-500/30 max-w-md mx-auto
                    animate-in fade-in duration-300">
      {/* Icon */}
      <div className="relative mb-4">
        <IconComponent className="w-12 h-12 text-amber-400 animate-pulse" />
        <Loader2 className="w-6 h-6 text-amber-300 absolute -bottom-1 -right-1 animate-spin" />
      </div>

      {/* Message */}
      <p className="text-lg font-medium text-amber-100 text-center mb-2">
        {message}
      </p>

      {/* Countdown */}
      {countdown > 0 && (
        <p className="text-sm text-amber-300/70 mb-4">
          {autoRetry ? (
            <>Автоматический повтор через <span className="font-mono font-bold">{countdown}</span> сек...</>
          ) : (
            <>Попробуйте через <span className="font-mono font-bold">{countdown}</span> сек</>
          )}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-amber-900/30 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-400
                     transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Manual retry button */}
      {!autoRetry && countdown <= 0 && onRetry && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-amber-500/20 hover:bg-amber-500/30
                     border border-amber-500/50 hover:border-amber-400
                     text-amber-200 font-medium
                     transition-all duration-200
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Повторяю...' : 'Повторить'}
        </button>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function AIErrorMessageCompact({
  message,
  waitSeconds,
}: {
  message: string;
  waitSeconds: number;
}) {
  const [countdown, setCountdown] = useState(waitSeconds);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg
                    bg-amber-500/10 border border-amber-500/20
                    text-amber-200 text-sm">
      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
      <span>{message}</span>
      {countdown > 0 && (
        <span className="font-mono text-amber-400">{countdown}s</span>
      )}
    </div>
  );
}

export default AIErrorMessage;

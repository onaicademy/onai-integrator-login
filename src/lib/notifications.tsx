import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, Lock, Sparkles } from 'lucide-react';

/**
 * 🎨 PREMIUM NOTIFICATION SYSTEM - OnAI Academy Brand
 * 
 * Дизайн: Премиум, современный, платформенный
 * Стиль: Градиенты, плавные тени, элегантность
 * Адаптивность: Все устройства (mobile, tablet, desktop)
 */

interface NotificationOptions {
  description?: string;
  duration?: number;
}

// ✅ SUCCESS - Зеленый градиент (professional)
export const showSuccess = (message: string, options?: NotificationOptions) => {
  toast.success(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
        <CheckCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">
          {message}
        </p>
        {options?.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 4000,
      style: {
        background: 'linear-gradient(135deg, rgb(240 253 244) 0%, rgb(220 252 231) 100%)',
        border: '1px solid rgb(134 239 172)',
        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
      },
      className: 'dark:!bg-gradient-to-br dark:!from-gray-800 dark:!to-gray-900 dark:!border-emerald-500/30',
    }
  );
};

// ❌ ERROR - Красный градиент (professional)
export const showError = (message: string, options?: NotificationOptions) => {
  toast.error(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/30">
        <XCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">
          {message}
        </p>
        {options?.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 5000,
      style: {
        background: 'linear-gradient(135deg, rgb(254 242 242) 0%, rgb(254 226 226) 100%)',
        border: '1px solid rgb(252 165 165)',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
      },
      className: 'dark:!bg-gradient-to-br dark:!from-gray-800 dark:!to-gray-900 dark:!border-red-500/30',
    }
  );
};

// ⚠️ WARNING - Янтарный градиент (professional)
export const showWarning = (message: string, options?: NotificationOptions) => {
  toast.warning(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
        <AlertTriangle className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">
          {message}
        </p>
        {options?.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 4000,
      style: {
        background: 'linear-gradient(135deg, rgb(255 251 235) 0%, rgb(254 243 199) 100%)',
        border: '1px solid rgb(252 211 77)',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
      },
      className: 'dark:!bg-gradient-to-br dark:!from-gray-800 dark:!to-gray-900 dark:!border-amber-500/30',
    }
  );
};

// ℹ️ INFO - Синий градиент (professional)
export const showInfo = (message: string, options?: NotificationOptions) => {
  toast.info(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <Info className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">
          {message}
        </p>
        {options?.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 4000,
      style: {
        background: 'linear-gradient(135deg, rgb(239 246 255) 0%, rgb(219 234 254) 100%)',
        border: '1px solid rgb(147 197 253)',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
      },
      className: 'dark:!bg-gradient-to-br dark:!from-gray-800 dark:!to-gray-900 dark:!border-blue-500/30',
    }
  );
};

// 🔒 LOCKED - Премиум для заблокированных функций
export const showLocked = (message: string = 'AI Куратор', options?: NotificationOptions) => {
  toast.error(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-lg shadow-gray-500/20">
        <Lock className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">
          🔒 {message}
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
          {options?.description || 'Доступно на полной версии продукта'}
        </p>
      </div>
    </div>,
    {
      duration: options?.duration || 3000,
      style: {
        background: 'linear-gradient(135deg, rgb(249 250 251) 0%, rgb(243 244 246) 100%)',
        border: '1px solid rgb(209 213 219)',
        boxShadow: '0 4px 12px rgba(107, 114, 128, 0.15)',
      },
      className: 'dark:!bg-gradient-to-br dark:!from-gray-800 dark:!to-gray-900 dark:!border-gray-500/30',
    }
  );
};

// ✨ PREMIUM - Специальное уведомление для важных событий
export const showPremium = (message: string, options?: NotificationOptions) => {
  toast.success(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse">
        <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm">
          {message}
        </p>
        {options?.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 5000,
      style: {
        background: 'linear-gradient(135deg, rgb(250 245 255) 0%, rgb(243 232 255) 100%)',
        border: '1px solid rgb(216 180 254)',
        boxShadow: '0 8px 24px rgba(168, 85, 247, 0.25)',
      },
      className: 'dark:!bg-gradient-to-br dark:!from-gray-800 dark:!to-gray-900 dark:!border-purple-500/30',
    }
  );
};

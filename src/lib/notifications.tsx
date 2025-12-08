import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info, Lock } from 'lucide-react';

/**
 * 🎨 Кастомная система уведомлений в стиле CYBER-ARCHITECTURE
 * 
 * Адаптивная под все устройства (мобилка, планшет, десктоп)
 * Стиль платформы: неоновый зеленый, черный фон, монопространственный шрифт
 */

interface NotificationOptions {
  description?: string;
  duration?: number;
}

// ✅ SUCCESS - Зеленый неоновый
export const showSuccess = (message: string, options?: NotificationOptions) => {
  toast.success(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30 flex items-center justify-center">
        <CheckCircle className="w-5 h-5 text-[#00FF88]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase tracking-wider text-white text-xs sm:text-sm truncate">
          {message}
        </p>
        {options?.description && (
          <p className="text-[10px] sm:text-xs text-white/70 mt-1 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 4000,
    }
  );
};

// ❌ ERROR - Красный
export const showError = (message: string, options?: NotificationOptions) => {
  toast.error(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
        <XCircle className="w-5 h-5 text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase tracking-wider text-white text-xs sm:text-sm truncate">
          {message}
        </p>
        {options?.description && (
          <p className="text-[10px] sm:text-xs text-white/70 mt-1 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 5000,
    }
  );
};

// ⚠️ WARNING - Желтый
export const showWarning = (message: string, options?: NotificationOptions) => {
  toast.warning(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase tracking-wider text-white text-xs sm:text-sm truncate">
          {message}
        </p>
        {options?.description && (
          <p className="text-[10px] sm:text-xs text-white/70 mt-1 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 4000,
    }
  );
};

// ℹ️ INFO - Синий
export const showInfo = (message: string, options?: NotificationOptions) => {
  toast.info(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
        <Info className="w-5 h-5 text-blue-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase tracking-wider text-white text-xs sm:text-sm truncate">
          {message}
        </p>
        {options?.description && (
          <p className="text-[10px] sm:text-xs text-white/70 mt-1 line-clamp-2">
            {options.description}
          </p>
        )}
      </div>
    </div>,
    {
      duration: options?.duration || 4000,
    }
  );
};

// 🔒 LOCKED - Специально для заблокированных функций
export const showLocked = (message: string = 'AI Куратор', options?: NotificationOptions) => {
  toast.error(
    <div className="flex items-center gap-3 w-full">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/20 flex items-center justify-center">
        <Lock className="w-5 h-5 text-white/60" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold uppercase tracking-wider text-white text-xs sm:text-sm truncate">
          🔒 {message}
        </p>
        <p className="text-[10px] sm:text-xs text-white/70 mt-1 line-clamp-2">
          {options?.description || 'Доступно на полной версии продукта'}
        </p>
      </div>
    </div>,
    {
      duration: options?.duration || 3000,
    }
  );
};

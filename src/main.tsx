// Initialize debug logger FIRST (before any other imports)
import './utils/debug-logger';

import { createRoot } from "react-dom/client";

// 🎯 ТРЕНДОВЫЙ ШРИФТ ДЛЯ AI-ПЛАТФОРМЫ: INTER (№1 для AI сайтов)
import '@fontsource/inter/900.css'; // Extra Bold для заголовков
import '@fontsource/inter/700.css'; // Bold для подзаголовков
import '@fontsource/inter/400.css'; // Regular для текста

import "./index.css";

// 🚀 Initialize Unified Supabase Manager (BEFORE App)
import { initializeSupabase } from './lib/supabase-manager';
import { initRuntimeConfig } from './lib/runtime-config';

// Initialize production error tracking
import { initErrorTracking } from './lib/error-tracker';

// 🛡️ ERROR RECOVERY: Import utilities
import { retryChunkLoad } from "@/utils/error-recovery";

/**
 * Проверяет, является ли ошибка ChunkLoadError
 */
function isChunkLoadError(error: any): boolean {
  const errorMessage = error?.message || error?.toString() || '';
  
  return (
    errorMessage.includes('Loading chunk') ||
    errorMessage.includes('ChunkLoadError') ||
    errorMessage.includes('Failed to fetch dynamically imported module') ||
    error?.name === 'ChunkLoadError'
  );
}

// ════════════════════════════════════════════════════════════════
// 🛡️ ADVANCED GLOBAL ERROR HANDLING
// ════════════════════════════════════════════════════════════════

/**
 * ✅ Глобальная обработка синхронных ошибок (script errors, runtime errors)
 */
window.addEventListener('error', (event) => {
  const error = event.error;
  
  // 🔍 ChunkLoadError - автоматический retry + reload
  if (isChunkLoadError(error)) {
    console.warn('🔄 [Global Error Handler] ChunkLoadError detected, will auto-reload...');
    event.preventDefault(); // Предотвращаем дефолтное поведение
    
    // Проверяем счетчик reload
    const reloadCount = parseInt(sessionStorage.getItem('global_chunk_reload_count') || '0', 10);
    
    if (reloadCount < 2) {
      sessionStorage.setItem('global_chunk_reload_count', String(reloadCount + 1));
      
      // Небольшая задержка перед reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      // После 2 reload показываем ошибку
      console.error('❌ [Global Error Handler] Too many chunk reload attempts');
      alert(
        'Не удалось загрузить модуль после нескольких попыток.\n\n' +
        'Пожалуйста, очистите кэш браузера:\n' +
        '• Windows: Ctrl + Shift + R\n' +
        '• Mac: Cmd + Shift + R'
      );
    }
    return;
  }
  
  // 🔴 Другие ошибки - логируем
  console.error('❌ [Global Error]:', error);
  console.error('📍 Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: error?.stack,
  });
  
  // Отправляем в Sentry (если настроен)
  if (window.Sentry?.captureException) {
    window.Sentry.captureException(error, {
      tags: { type: 'global_error' },
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  }
});

/**
 * ✅ Глобальная обработка unhandled promise rejections
 */
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  
  console.error('❌ [Unhandled Promise Rejection]:', error);
  
  // 🔍 ChunkLoadError в промисах
  if (isChunkLoadError(error)) {
    console.warn('🔄 [Promise Rejection] ChunkLoadError detected');
    event.preventDefault();
    
    // Пробуем reload
    const reloadCount = parseInt(sessionStorage.getItem('global_chunk_reload_count') || '0', 10);
    if (reloadCount < 2) {
      sessionStorage.setItem('global_chunk_reload_count', String(reloadCount + 1));
      setTimeout(() => window.location.reload(), 1000);
    }
    return;
  }
  
  // 🔍 Network errors - можно игнорировать (retry уже есть в API client)
  if (
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Network request failed')
  ) {
    console.warn('⚠️ [Promise Rejection] Network error (will retry automatically)');
    event.preventDefault();
    return;
  }
  
  // 🔴 Другие promise rejections - логируем
  console.error('📍 Rejection details:', {
    reason: error,
    promise: event.promise,
    stack: error?.stack,
  });
  
  // Отправляем в Sentry
  if (window.Sentry?.captureException) {
    window.Sentry.captureException(error, {
      tags: { type: 'unhandled_rejection' },
    });
  }
});

/**
 * ✅ Обработка Resource Loading Errors (CSS, Images, Scripts)
 */
window.addEventListener('error', (event: ErrorEvent | Event) => {
  // Проверяем, является ли это ошибкой загрузки ресурса
  const target = (event as any).target || (event as any).srcElement;
  
  if (target && (target instanceof HTMLScriptElement || 
                 target instanceof HTMLLinkElement || 
                 target instanceof HTMLImageElement)) {
    console.warn('⚠️ [Resource Load Error]:', {
      tagName: target.tagName,
      src: target.src || target.href,
      type: target.type,
    });
    
    // Для script errors - пробуем reload
    if (target instanceof HTMLScriptElement) {
      const reloadCount = parseInt(sessionStorage.getItem('resource_reload_count') || '0', 10);
      if (reloadCount < 1) {
        console.log('🔄 [Resource Error] Reloading page due to script load failure...');
        sessionStorage.setItem('resource_reload_count', String(reloadCount + 1));
        setTimeout(() => window.location.reload(), 500);
      }
    }
  }
}, true); // useCapture = true для отлова resource errors

/**
 * ✅ Очистка счетчиков reload при успешной загрузке
 */
window.addEventListener('load', () => {
  // Страница успешно загружена - очищаем счетчики
  sessionStorage.removeItem('global_chunk_reload_count');
  sessionStorage.removeItem('resource_reload_count');
  console.log('✅ [Page Load] Successfully loaded, reload counters cleared');
});

/**
 * ✅ Обработка visibility change (когда пользователь возвращается на вкладку)
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Пользователь вернулся на вкладку после долгого отсутствия
    const lastActivity = parseInt(sessionStorage.getItem('last_activity') || '0', 10);
    const now = Date.now();
    const idleTime = now - lastActivity;
    
    // Если больше 30 минут простоя - логируем
    if (idleTime > 30 * 60 * 1000) {
      console.log(`⏰ [Visibility] User returned after ${Math.round(idleTime / 60000)} minutes idle`);
      
      // Можно добавить дополнительную логику проверки соединения здесь
    }
    
    sessionStorage.setItem('last_activity', String(now));
  }
});

// Инициализируем last_activity
sessionStorage.setItem('last_activity', String(Date.now()));

// ════════════════════════════════════════════════════════════════
// 🚀 APP INITIALIZATION
// ════════════════════════════════════════════════════════════════

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error('Root element not found');
}

async function bootstrap() {
  await initRuntimeConfig();
  initErrorTracking();

  console.log('🚀 [Main] Initializing Supabase Manager...');
  await initializeSupabase();
  console.log('✅ [Main] Supabase Manager initialized');

  const { default: App } = await import("./App.tsx");
  createRoot(rootElement).render(<App />);
}

bootstrap().catch(async (error) => {
  console.error('❌ [Main] Bootstrap failed:', error);
  const { default: App } = await import("./App.tsx");
  createRoot(rootElement).render(<App />);
});

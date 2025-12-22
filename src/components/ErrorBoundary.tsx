import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Zap } from 'lucide-react';
import { isChunkLoadError } from '@/utils/error-recovery';
import * as Sentry from '@sentry/react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  isChunkError: boolean;
  retryCount: number;
  eventId: string | null; // 🛡️ NEW: Sentry event ID для user feedback
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isChunkError: false,
      retryCount: 0,
      eventId: null, // 🛡️ NEW: Sentry event ID
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const isChunk = isChunkLoadError(error);
    
    return { 
      hasError: true, 
      error, 
      errorInfo: null,
      isChunkError: isChunk,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isChunk = isChunkLoadError(error);
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 🛡️ NEW: Логируем в Sentry (только НЕ chunk errors - они ожидаемые)
    let eventId: string | null = null;
    if (!isChunk) {
      eventId = Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        level: 'error',
        tags: {
          errorBoundary: true,
          errorType: error.name,
        },
      });
      console.log('🛡️ [ErrorBoundary] Logged to Sentry:', eventId);
    }
    
    this.setState({ 
      errorInfo,
      isChunkError: isChunk,
      eventId,
    });
    
    // 🛡️ ChunkLoadError - автоматический retry с reload
    if (isChunk && this.state.retryCount < 2) {
      console.log(`🔄 ChunkLoadError detected. Auto-retry ${this.state.retryCount + 1}/2...`);
      
      this.setState(prevState => ({
        retryCount: prevState.retryCount + 1
      }));
      
      // Небольшая задержка перед reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, retryCount: 0, eventId: null });
    window.location.href = '/';
  };

  // 🛡️ NEW: Отправить отчет об ошибке в Telegram
  handleReportFeedback = async () => {
    try {
      // Collect debug logs from console
      const debugLogs = this.collectDebugLogs();
      
      // Prepare error report
      const errorReport = {
        error: {
          name: this.state.error?.name || 'Unknown',
          message: this.state.error?.message || 'No message',
          stack: this.state.error?.stack
        },
        errorInfo: {
          componentStack: this.state.errorInfo?.componentStack
        },
        userInfo: {
          email: localStorage.getItem('user_email') || undefined,
          userId: localStorage.getItem('user_id') || undefined,
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        debugLogs: debugLogs,
        environment: {
          platform: this.detectPlatform(),
          url: window.location.href,
          viewport: `${window.innerWidth}x${window.innerHeight}`
        }
      };
      
      // Send to backend API
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://api.onai.academy';
        
      const response = await fetch(`${API_URL}/api/error-reports/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      });
      
      if (response.ok) {
        alert('✅ Отчет отправлен! Спасибо за помощь 🙏');
      } else {
        throw new Error('Failed to send report');
      }
    } catch (error) {
      console.error('Failed to send error report:', error);
      alert('❌ Не удалось отправить отчет. Попробуйте еще раз.');
    }
  };
  
  // Collect debug logs from console
  collectDebugLogs = (): string[] => {
    // Try to get logs from performance entries or local storage
    const logs: string[] = [];
    
    // Check if we have debug logs in sessionStorage
    const debugLogsKey = 'debug_logs';
    const storedLogs = sessionStorage.getItem(debugLogsKey);
    if (storedLogs) {
      try {
        return JSON.parse(storedLogs);
      } catch (e) {
        // ignore
      }
    }
    
    // Fallback: create basic log from error info
    logs.push(`[ERROR] ${this.state.error?.name}: ${this.state.error?.message}`);
    logs.push(`[DEBUG] Page: ${window.location.pathname}`);
    logs.push(`[DEBUG] Timestamp: ${new Date().toISOString()}`);
    
    return logs;
  };
  
  // Detect platform (Tripwire, Traffic, Landing)
  detectPlatform = (): 'Tripwire' | 'Traffic' | 'Landing' => {
    const path = window.location.pathname;
    if (path.includes('/tripwire') || path.includes('/lessons')) return 'Tripwire';
    if (path.includes('/traffic') || path.includes('/cabinet')) return 'Traffic';
    return 'Landing';
  };

  handleReload = () => {
    // Очищаем кэш и перезагружаем
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    window.location.reload();
  };

  handleHardReload = () => {
    // Hard reload с очисткой кэша (Ctrl+Shift+R)
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 🎯 Специальная обработка ChunkLoadError
      if (this.state.isChunkError) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-xl w-full bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur border border-yellow-500/30 rounded-2xl p-8 text-center shadow-2xl">
              <div className="relative mb-6">
                <div className="absolute inset-0 blur-3xl bg-yellow-500/20 rounded-full"></div>
                <Zap className="w-20 h-20 text-yellow-400 mx-auto relative animate-pulse" />
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-4">
                Обновление платформы
              </h1>
              
              <p className="text-gray-300 mb-4 text-lg">
                Была установлена новая версия платформы с улучшениями и исправлениями.
              </p>
              
              <p className="text-gray-400 mb-8">
                Пожалуйста, нажмите кнопку ниже, чтобы обновить страницу и продолжить обучение.
              </p>

              <div className="space-y-3">
                <Button
                  onClick={this.handleReload}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-600 hover:to-orange-600 font-bold py-6 text-lg shadow-lg"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Обновить страницу
                </Button>
                
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="w-full border-gray-600 text-white hover:bg-gray-800/50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  На главную
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-500 mb-3">
                  Если проблема не решается, попробуйте очистить кэш браузера:
                </p>
                <div className="flex flex-col sm:flex-row gap-2 text-xs text-gray-600">
                  <span className="bg-gray-800/50 px-3 py-2 rounded">Windows: Ctrl + Shift + R</span>
                  <span className="bg-gray-800/50 px-3 py-2 rounded">Mac: Cmd + Shift + R</span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // 🔴 Обычная ошибка
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#1a1a24] border border-red-500/30 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">
              Что-то пошло не так
            </h1>
            <p className="text-gray-400 mb-6">
              Произошла ошибка при загрузке страницы. Попробуйте обновить страницу или вернуться на главную.
            </p>
            
            {this.state.error && (
              <details className="text-left mb-6 bg-black/50 rounded-lg p-4">
                <summary className="text-red-400 cursor-pointer mb-2">
                  Детали ошибки (для разработчиков)
                </summary>
                <pre className="text-xs text-gray-500 overflow-auto max-h-60">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div className="flex gap-4 justify-center">
              <Button
                onClick={this.handleReset}
                className="bg-[#00FF88] text-black hover:bg-[#00cc88]"
              >
                <Home className="w-4 h-4 mr-2" />
                Вернуться на главную
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Обновить страницу
              </Button>
            </div>
            
            {/* 🛡️ NEW: Кнопка для report feedback в Sentry */}
            {this.state.eventId && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">
                  Помогите нам стать лучше - расскажите что произошло
                </p>
                <Button
                  onClick={this.handleReportFeedback}
                  variant="ghost"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  📝 Отправить отчет об ошибке
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


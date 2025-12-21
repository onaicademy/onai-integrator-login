import introJs, { IntroJs } from 'intro.js';

export interface OnboardingStep {
  element: string;           // CSS selector (.class или [data-*])
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  icon?: string;             // emoji
  action?: () => void;       // функция перед шагом
}

export class PremiumOnboarding {
  private intro: IntroJs | null = null;
  private steps: OnboardingStep[] = [];
  private storageKey = 'traffic_onboarding_progress';
  private isInitialized = false;

  constructor(steps: OnboardingStep[]) {
    this.steps = steps;
  }

  // ========== ОСНОВНОЙ МЕТОД: ИНИЦИАЛИЗАЦИЯ ==========
  initialize() {
    if (this.isInitialized) return;

    this.intro = introJs();

    // Преобразовать шаги в формат intro.js
    const stepsData = this.steps.map((step, index) => {
      // Проверить что элемент существует
      const element = document.querySelector(step.element);
      if (!element) {
        console.warn(`⚠️ Element not found: ${step.element}`);
      }

      return {
        element: step.element,
        intro: this.generateStepHTML(step, index),
        position: step.position || 'auto',
        tooltipClass: 'premium-tooltip-step',
        highlightClass: 'premium-highlight-element',
        disableInteraction: false, // ✅ Можно кликать на элемент
      };
    });

    // Конфигурация тура
    this.intro.setOptions({
      steps: stepsData as any,
      showStepNumbers: false,
      hideButtons: false,
      showButtons: true,
      showProgress: true,
      showBullets: true,
      showSkipButton: true,
      exitOnOverlayClick: false,      // ✅ Нельзя закрыть кликом по overlay
      overlayOpacity: 0.7,            // ✅ 70% прозрачность
      keyboardNavigation: true,
      scrollToElement: true,
      scrollPadding: 30,
      helperLayerPadding: 10,
      buttonClass: 'premium-onboarding-button',
      nextLabel: 'Далее →',
      prevLabel: '← Назад',
      skipLabel: '✕ Пропустить',
      doneLabel: '✅ Готово!',
    } as any);

    // Event: перед переходом на новый шаг
    this.intro.onbeforechange((targetElement) => {
      const currentStep = this.steps[this.intro?.currentStep || 0];
      
      // Выполнить action если есть
      if (currentStep?.action) {
        try {
          currentStep.action();
        } catch (e) {
          console.error('Action error:', e);
        }
      }

      // Логирование
      console.log(`📍 Onboarding step ${(this.intro?.currentStep || 0) + 1}/${this.steps.length}: ${currentStep?.title}`);
    });

    // Event: завершение тура
    this.intro.oncomplete(() => {
      this.markAsCompleted();
      console.log('✅ Onboarding завершен!');
      
      // Analytics (опционально)
      this.trackEvent('onboarding_completed', {
        totalSteps: this.steps.length,
        timeSpent: this.getTimeSpent(),
      });
    });

    // Event: выход из тура
    this.intro.onexit(() => {
      const currentStep = this.intro?.currentStep || 0;
      this.saveProgress();
      console.log(`⏸ Onboarding пропущен на шаге ${currentStep + 1}`);
      
      // Analytics (опционально)
      this.trackEvent('onboarding_skipped', {
        skippedAtStep: currentStep + 1,
      });
    });

    this.isInitialized = true;
    console.log('✅ Premium Onboarding инициализирован');
  }

  // ========== ЗАПУСК ТУРА ==========
  start() {
    if (!this.intro) {
      console.error('❌ Onboarding не инициализирован. Вызови initialize() первым');
      return;
    }

    // Не запускать если уже завершено
    if (this.isCompleted()) {
      console.log('ℹ️ Тур уже завершен. Вызови reset() для перезагрузки');
      return;
    }

    this.intro.start();
    this.trackEvent('onboarding_started');
  }

  // ========== ПРОДОЛЖИТЬ С ТОГО ЖЕ МЕСТА ==========
  resume() {
    if (!this.intro) {
      this.initialize();
    }

    const lastStep = this.getProgress();
    if (this.intro && lastStep !== null) {
      this.intro.goToStep(lastStep);
      this.intro.start();
    } else {
      this.start();
    }
  }

  // ========== СОХРАНИТЬ ПРОГРЕСС ==========
  private saveProgress() {
    const currentStep = this.intro?.currentStep ?? 0;
    const data = {
      completed: false,
      lastStep: currentStep,
      timestamp: Date.now(),
      startedAt: this.getStartTime(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // ========== ПОЛУЧИТЬ ПРОГРЕСС (0-индексированный) ==========
  private getProgress(): number | null {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return typeof parsed.lastStep === 'number' ? parsed.lastStep : null;
      } catch (e) {
        console.error('Error parsing progress:', e);
        return null;
      }
    }
    return null;
  }

  // ========== ПОЛУЧИТЬ ВРЕМЯ НАЧАЛА ==========
  private getStartTime(): number {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return parsed.startedAt || Date.now();
      } catch {
        return Date.now();
      }
    }
    return Date.now();
  }

  // ========== ПОЛУЧИТЬ ВРЕМЯ ЗАТРАЧЕННОЕ ==========
  private getTimeSpent(): number {
    return Date.now() - this.getStartTime();
  }

  // ========== ПОМЕТИТЬ КАК ЗАВЕРШЕНО ==========
  private markAsCompleted() {
    const data = {
      completed: true,
      completedAt: Date.now(),
      totalSteps: this.steps.length,
      timeSpent: this.getTimeSpent(),
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // ========== ПРОВЕРИТЬ ЗАВЕРШЕНО ЛИ ==========
  isCompleted(): boolean {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        return JSON.parse(data).completed === true;
      } catch {
        return false;
      }
    }
    return false;
  }

  // ========== СБРОСИТЬ ПРОГРЕСС ==========
  reset() {
    localStorage.removeItem(this.storageKey);
    if (this.intro) {
      this.intro = null;
    }
    this.isInitialized = false;
    console.log('🔄 Onboarding сброшен');
  }

  // ========== ОСТАНОВИТЬ ТУР (БЕЗ СОХРАНЕНИЯ) ==========
  stop() {
    if (this.intro) {
      this.intro.exit(true);
    }
  }

  // ========== СГЕНЕРИРОВАТЬ HTML ШАГА ==========
  private generateStepHTML(step: OnboardingStep, index: number): string {
    return `
      <div class="premium-step-container">
        <div class="premium-step-header">
          <span class="premium-step-icon">${step.icon || '👉'}</span>
          <span class="premium-step-counter">${index + 1}/${this.steps.length}</span>
        </div>
        <h3 class="premium-step-title">${this.escapeHTML(step.title)}</h3>
        <p class="premium-step-description">${this.escapeHTML(step.description)}</p>
      </div>
    `;
  }

  // ========== ESCAPE HTML (БЕЗОПАСНОСТЬ) ==========
  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== ТРЕКИНГ СОБЫТИЙ (ANALYTICS) ==========
  private trackEvent(eventName: string, data?: Record<string, any>) {
    // Для Mixpanel, Amplitude, или другого сервиса
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(`onboarding_${eventName}`, data);
    }
    console.log(`📊 Event: ${eventName}`, data);
  }

  // ========== ЭКСПОРТИРОВАТЬ ДЛЯ ОТЛАДКИ ==========
  debug() {
    return {
      steps: this.steps,
      currentStep: this.intro?.currentStep,
      progress: this.getProgress(),
      isCompleted: this.isCompleted(),
      timeSpent: this.getTimeSpent(),
      storageKey: this.storageKey,
      localStorage: JSON.parse(localStorage.getItem(this.storageKey) || '{}'),
    };
  }
}

// ========== ФАБРИКА: СОЗДАТЬ ОНБОРДИНГ ДЛЯ TRAFFIC DASHBOARD ==========
export const createTrafficDashboardOnboarding = (): PremiumOnboarding => {
  return new PremiumOnboarding([
    {
      element: '[data-tour="language-toggle"]',
      title: '🌐 Переключение языка',
      description: 'Выбирайте между Русским (РУС) и Казахским (ҚАЗ) языками в любой момент',
      position: 'bottom',
      icon: '🌐',
    },
    {
      element: '[data-tour="my-results-button"]',
      title: '👤 Фильтр по командам',
      description: 'Нажмите, чтобы видеть только свою команду или выбрать все команды',
      position: 'bottom',
      icon: '👤',
    },
    {
      element: '[data-tour="express-course-tab"]',
      title: '⚡ ExpressCourse данные',
      description: 'Здесь вы видите метрики и графики по ExpressCourse программе',
      position: 'bottom',
      icon: '⚡',
      action: () => {
        // Опционально: можно здесь кликнуть на таб
        document.querySelector('[data-tour="express-course-tab"]')?.dispatchEvent(new Event('click', { bubbles: true }));
      },
    },
    {
      element: '[data-tour="main-products-tab"]',
      title: '🚀 Основные продукты',
      description: 'Переключитесь здесь для просмотра аналитики основных продуктов',
      position: 'bottom',
      icon: '🚀',
    },
    {
      element: '[data-tour="analytics-button"]',
      title: '📊 Подробная аналитика',
      description: 'Откройте детальные отчеты, графики и экспортируйте данные отсюда',
      position: 'bottom',
      icon: '📊',
    },
    {
      element: '[data-tour="settings-button"]',
      title: '⚙️ Настройки',
      description: 'Измените параметры профиля и предпочтения уведомлений',
      position: 'bottom',
      icon: '⚙️',
    },
  ]);
};

// Export для использования
export default PremiumOnboarding;

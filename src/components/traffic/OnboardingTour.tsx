/**
 * 🎯 Traffic Onboarding Tour - REACT JOYRIDE (ПРАВИЛЬНЫЙ ФОРМАТ!)
 * 
 * ✅ Spotlight на конкретных элементах
 * ✅ Tooltip рядом с элементом
 * ✅ Остальной UI ВИДЕН
 * ✅ Premium дизайн как у Stripe/Notion
 * ✅ Observability
 * 
 * @version 3.0.0 - BEST PRACTICES
 * @date 2025-12-22
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS, Step, Styles, ACTIONS, EVENTS } from 'react-joyride';
import axios from 'axios';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

// 📊 Observability Logger
const ObservabilityLogger = {
  log: (event: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      data,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
    console.log(`🎓 [ONBOARDING] ${event}`, logEntry);
    
    return logEntry;
  },
  
  error: (error: string, data?: any) => {
    console.error(`❌ [ONBOARDING ERROR]`, error, data);
  },
  
  success: (message: string, data?: any) => {
    console.log(`✅ [ONBOARDING SUCCESS]`, message, data);
  }
};

interface OnboardingTourProps {
  userRole: 'admin' | 'targetologist';
  userId: string;
  userEmail: string;
  userName: string;
  skipApiCheck?: boolean;
}

export function OnboardingTour({ userRole, userId, userEmail, userName, skipApiCheck = false }: OnboardingTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  
  // 🎯 Multi-page onboarding tracking
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'settings' | 'analytics'>('dashboard');

  // 🎯 MULTI-PAGE Onboarding для таргетолога
  const targetologistSteps: Step[] = [
    // ═══════════════════════════════════════════════════════════════
    // 📍 СТРАНИЦА 1: DASHBOARD (шаги 0-3)
    // ═══════════════════════════════════════════════════════════════
    {
      target: '[data-tour="metrics-cards"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            📊 Главная страница — Dashboard
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            Здесь отображаются <strong>главные метрики</strong>:<br/>
            • <strong>Доход</strong> — сколько заработал<br/>
            • <strong>ROAS</strong> — эффективность рекламы (цель &gt; 2.0x)<br/>
            • <strong>CPA</strong> — стоимость одной продажи
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="my-results-button"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            🎯 Фильтр "Мои результаты"
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            Нажми чтобы видеть только <strong style={{ color: '#00FF88' }}>свои данные</strong>.<br/>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Повторный клик покажет результаты всей команды.</span>
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="results-table"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            📋 Таблица результатов
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            Результаты всех таргетологов команды.<br/>
            <strong style={{ color: '#00FF88' }}>Твоя строка</strong> выделена зеленым.<br/>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>AI-анализ доступен только для твоих кампаний.</span>
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#FFD700' }}>
            🚀 Далее: Настройки
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            Сейчас перейдем в <strong>Настройки</strong>, где ты подключишь:<br/>
            • Рекламные кабинеты Facebook<br/>
            • Активные рекламные кампании<br/>
            <br/>
            <span style={{ color: '#FF6B6B', fontWeight: '600' }}>⚠️ Без этого ROI не считается!</span>
          </p>
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            💡 Нажми "Далее" → автоматически перейдем на страницу Настройки
          </p>
        </div>
      ),
      placement: 'center',
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 📍 СТРАНИЦА 2: SETTINGS (шаги 4-6)
    // ═══════════════════════════════════════════════════════════════
    {
      target: 'body',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            ⚙️ Страница Настройки
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            Здесь ты подключаешь свои <strong>рекламные кабинеты</strong> и выбираешь <strong>активные кампании</strong> для трекинга.
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            📌 Сейчас покажу как это сделать пошагово...
          </p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '[data-tour="fb-accounts-list"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            1️⃣ Выбери Рекламные Кабинеты
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            <strong style={{ color: '#FFD700' }}>Поставь галочки</strong> на те ad accounts,<br/>
            которые ты используешь для рекламы.
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            💡 Если кабинет отображается серым — он не активен в Facebook
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="campaigns-list"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            2️⃣ Выбери Активные Кампании
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            <strong style={{ color: '#FFD700' }}>Поставь галочки</strong> на кампании,<br/>
            которые сейчас запущены и приносят продажи.
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: '#FF6B6B', marginBottom: '8px' }}>
            ⚠️ ВАЖНО: При запуске НОВОЙ кампании —<br/>
            &nbsp;&nbsp;&nbsp;&nbsp;обязательно добавь её сюда!
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            💡 Иначе её результаты не попадут в Dashboard
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#FFD700' }}>
            🚀 Далее: Детальная Аналитика
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            Отлично! Теперь перейдем к <strong>Анализу РК</strong>, где ты получишь:<br/>
            • AI-анализ твоих кампаний<br/>
            • Оценку настроек аудиторий<br/>
            • Рекомендации по улучшению<br/>
            • Детальные метрики Facebook Ads
          </p>
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            💡 Нажми "Далее" → перейдем на страницу Анализа
          </p>
        </div>
      ),
      placement: 'center',
    },
    
    // ═══════════════════════════════════════════════════════════════
    // 📍 СТРАНИЦА 3: DETAILED ANALYTICS (шаги 7-9)
    // ═══════════════════════════════════════════════════════════════
    {
      target: 'body',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            📊 Детальная Аналитика РК
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            Здесь ты получаешь <strong>AI-анализ</strong> своих рекламных кампаний.
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            📌 Анализ занимает ~10 секунд
          </p>
        </div>
      ),
      placement: 'center',
    },
    {
      target: '[data-tour="analyze-button"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            🤖 Запуск AI-Анализа
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            <strong>Нажми эту кнопку</strong>, чтобы получить:<br/>
            • Оценку эффективности кампаний<br/>
            • Анализ аудиторий и креативов<br/>
            • Рекомендации по улучшению ROAS<br/>
            • Предупреждения о проблемах
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            💡 Анализ обновляется при каждом запуске
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="metrics-details"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            📈 Критерии Анализа
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            AI оценивает твои кампании по:<br/>
            • <strong>CTR</strong> (Click-Through Rate) — кликабельность<br/>
            • <strong>CPM</strong> (Cost Per Mille) — стоимость 1000 показов<br/>
            • <strong>CPC</strong> (Cost Per Click) — стоимость клика<br/>
            • <strong>Conversion Rate</strong> — % продаж от кликов<br/>
            • <strong>ROAS</strong> — возврат инвестиций
          </p>
          <p style={{ margin: '0', fontSize: '13px', color: '#FFD700' }}>
            ⚡ Цель: CTR &gt; 2%, ROAS &gt; 2.0x, Conversion &gt; 5%
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            🎉 Обучение завершено!
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5', marginBottom: '12px' }}>
            Теперь ты знаешь как:<br/>
            ✅ Смотреть свои результаты на Dashboard<br/>
            ✅ Подключать рекламные кабинеты в Настройках<br/>
            ✅ Получать AI-анализ кампаний<br/>
            ✅ Интерпретировать метрики
          </p>
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#FFD700', fontWeight: '600' }}>
            💡 Совет: Делай анализ 1-2 раза в неделю для отслеживания динамики!
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  // 🎯 Шаги для админа
  const adminSteps: Step[] = [
    {
      target: '[data-tour="metrics-cards"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            Админ панель
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            Полный доступ ко всем данным:<br/>
            команды, аналитика, UTM источники.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="results-table"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            Управление командами
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            Результаты всех таргетологов.<br/>
            Можешь управлять доступами.
          </p>
        </div>
      ),
      placement: 'top',
    },
  ];

  const steps = userRole === 'admin' ? adminSteps : targetologistSteps;
  
  // 🎯 Определяем на какой мы сейчас странице
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/settings')) {
      setCurrentPage('settings');
    } else if (path.includes('/detailed-analytics')) {
      setCurrentPage('analytics');
    } else if (path.includes('/dashboard')) {
      setCurrentPage('dashboard');
    }
  }, [location.pathname]);

  // 🎨 PREMIUM СТИЛЬ (как у Stripe/Notion)
  const joyrideStyles: Styles = {
    options: {
      arrowColor: 'rgba(10, 10, 10, 0.98)',
      backgroundColor: 'rgba(10, 10, 10, 0.98)',
      overlayColor: 'rgba(0, 0, 0, 0.5)', // Легкое затемнение, остальное видно
      primaryColor: '#00FF88',
      textColor: '#ffffff',
      width: 380,
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 12,
      padding: 20,
      border: '1px solid #00FF88',
      boxShadow: '0 0 30px rgba(0, 255, 136, 0.3), 0 8px 32px rgba(0, 0, 0, 0.8)',
    },
    tooltipContainer: {
      textAlign: 'left',
    },
    tooltipContent: {
      padding: '0 0 12px 0',
    },
    buttonNext: {
      backgroundColor: '#00FF88',
      color: '#000000',
      fontSize: 14,
      fontWeight: 600,
      padding: '10px 20px',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    buttonBack: {
      color: 'rgba(255, 255, 255, 0.6)',
      fontSize: 14,
      fontWeight: 600,
      marginRight: 12,
    },
    buttonSkip: {
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: 12,
    },
    spotlight: {
      borderRadius: 8,
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', // Spotlight эффект!
    },
  };

  // 📊 Callback для отслеживания событий + НАВИГАЦИЯ
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, status, type, step } = data;
    
    ObservabilityLogger.log('Joyride Event', {
      action,
      index,
      status,
      type,
      currentPage,
      stepTarget: step?.target
    });
    
    // 🎯 MULTI-PAGE NAVIGATION: Переключение страниц
    // Когда пользователь нажимает "Next" на определенных шагах
    if (action === ACTIONS.NEXT && type === EVENTS.STEP_AFTER) {
      // Dashboard (шаг 3) → переходим на Settings
      if (index === 3 && currentPage === 'dashboard') {
        ObservabilityLogger.log('Navigation: Dashboard → Settings');
        setTimeout(() => {
          navigate('/traffic/settings');
          setStepIndex(4); // Продолжаем с 4-го шага на Settings
          setRun(true); // 🔥 FIX: Продолжить onboarding после навигации
        }, 500); // Увеличил задержку для загрузки страницы
        return;
      }
      
      // Settings (шаг 6) → переходим на Analytics
      if (index === 6 && currentPage === 'settings') {
        ObservabilityLogger.log('Navigation: Settings → Analytics');
        setTimeout(() => {
          navigate('/traffic/detailed-analytics');
          setStepIndex(7); // Продолжаем с 7-го шага на Analytics
          setRun(true); // 🔥 FIX: Продолжить onboarding после навигации
        }, 500); // Увеличил задержку для загрузки страницы
        return;
      }
    }
    
    // Оригинальная логика callback (переменные уже извлечены выше)
    ObservabilityLogger.log('joyride_event', {
      status,
      type,
      index,
      action,
      userRole,
      userId,
    });

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      setRun(false);
      ObservabilityLogger.success('tour_completed', { status, userRole });
      
      // Сохраняем завершение
      if (!skipApiCheck) {
        saveTourCompletion(true);
      }
    }

    // Обновляем индекс для observability
    if (type === 'step:after') {
      setStepIndex(index + (action === 'prev' ? -1 : 1));
    }
  }, [userRole, userId, skipApiCheck, currentPage, navigate]);

  // API вызовы
  const saveTourCompletion = async (completed: boolean) => {
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.post(
        `${API_URL}/api/traffic-onboarding/progress`,
        { user_id: userId, is_completed: completed, tour_type: userRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      ObservabilityLogger.success('tour_saved', { completed });
    } catch (error: any) {
      ObservabilityLogger.error('tour_save_failed', { error: error.message });
    }
  };

  // Проверка и запуск тура
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkAndStartTour = async () => {
      ObservabilityLogger.log('tour_check_start', { skipApiCheck, userRole });

      if (skipApiCheck) {
        ObservabilityLogger.log('tour_test_mode', { message: 'Starting in test mode' });
        timer = setTimeout(() => setRun(true), 1000);
        return;
      }

      try {
        const token = localStorage.getItem('traffic_token');
        const response = await axios.get(
          `${API_URL}/api/traffic-onboarding/status/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { is_first_login, is_completed } = response.data;

        if (is_first_login || !is_completed) {
          ObservabilityLogger.log('tour_should_start', { reason: is_first_login ? 'first_login' : 'not_completed' });
          timer = setTimeout(() => setRun(true), 1000);
        } else {
          ObservabilityLogger.log('tour_skipped', { reason: 'already_completed' });
        }
      } catch (error: any) {
        ObservabilityLogger.error('tour_check_failed', { error: error.message });
        // Fallback: запускаем тур
        timer = setTimeout(() => setRun(true), 1000);
      }
    };

    checkAndStartTour();

    return () => {
      clearTimeout(timer);
    };
  }, [userId, userRole, skipApiCheck]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      disableScrolling={true}
      disableOverlayClose={true}
      spotlightClicks={true}
      styles={joyrideStyles}
      callback={handleJoyrideCallback}
      locale={{
        back: 'Назад',
        close: 'Закрыть',
        last: 'Завершить',
        next: 'Далее',
        open: 'Открыть',
        skip: 'Пропустить',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
}

export default OnboardingTour;

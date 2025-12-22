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
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride';
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
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // 🎯 Шаги для таргетолога
  const targetologistSteps: Step[] = [
    {
      target: '[data-tour="metrics-cards"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#00FF88' }}>
            Главные метрики
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            <strong>Доход</strong> — сколько заработал<br/>
            <strong>ROAS</strong> — цель больше 2.0x<br/>
            <strong>CPA</strong> — стоимость продажи
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
            Фильтр "Мои результаты"
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            Нажми чтобы видеть только <strong style={{ color: '#00FF88' }}>свои данные</strong>.<br/>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Повторный клик покажет всех.</span>
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
            Таблица результатов
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            Результаты всех таргетологов.<br/>
            <strong style={{ color: '#00FF88' }}>Твоя команда</strong> выделена.<br/>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>Доступ к AI только для твоей команды.</span>
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '700', color: '#FF6B00' }}>
            ВАЖНО: UTM-метки
          </h3>
          <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
            <strong style={{ color: '#FF6B00' }}>Всегда используй UTM-метки!</strong><br/>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Без них продажи не отслеживаются.</span>
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

  // 📊 Callback для отслеживания событий
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;

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
  }, [userRole, userId, skipApiCheck]);

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
      continuous
      showProgress
      showSkipButton
      disableScrolling
      disableOverlayClose
      spotlightClicks
      styles={joyrideStyles}
      callback={handleJoyrideCallback}
      locale={{
        back: 'Назад',
        close: 'Закрыть',
        last: 'Понятно',
        next: 'Далее',
        skip: 'Пропустить',
      }}
    />
  );
}

export default OnboardingTour;

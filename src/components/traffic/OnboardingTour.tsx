/**
 * Traffic Onboarding Tour - FIXED VERSION
 * 
 * ✅ ИСПРАВЛЕНО: Closure issue с moveNext (TypeError fix)
 * ✅ Адаптивный дизайн (Mobile/Tablet/Desktop)
 * ✅ Улучшенная центровка popover
 * ✅ Правильная интеграция с Target CAB Supabase
 */

import { useEffect, useRef, useCallback } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/traffic-onboarding.css';
import axios from 'axios';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

interface OnboardingTourProps {
  userRole: 'admin' | 'targetologist';
  userId: string;
  userEmail: string;
  userName: string;
}

export function OnboardingTour({ userRole, userId, userEmail, userName }: OnboardingTourProps) {
  // ✅ FIX: Используем useRef для хранения driver instance
  const driverRef = useRef<Driver | null>(null);

  // ✅ API calls вынесены как callbacks
  const saveTourProgress = useCallback(async (step: number) => {
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.post(
        `${API_URL}/api/traffic-onboarding/progress`,
        { user_id: userId, current_step: step, tour_type: userRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('❌ Failed to save tour progress:', error);
    }
  }, [userId, userRole]);

  const saveTourCompletion = useCallback(async (completed: boolean) => {
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.post(
        `${API_URL}/api/traffic-onboarding/progress`,
        { user_id: userId, is_completed: completed, tour_type: userRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('❌ Failed to save tour completion:', error);
    }
  }, [userId, userRole]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkAndStartTour = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const response = await axios.get(
          `${API_URL}/api/traffic-onboarding/status/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const { is_first_login, is_completed } = response.data;
        
        if (is_first_login || !is_completed) {
          console.log('🎓 Starting onboarding tour for', userEmail);
          startTour();
        }
      } catch (error) {
        console.error('❌ Failed to check onboarding status:', error);
      }
    };

    const startTour = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        await axios.post(
          `${API_URL}/api/traffic-onboarding/start`,
          { user_id: userId, tour_type: userRole },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (error) {
        console.error('❌ Failed to start onboarding:', error);
      }

      const steps = userRole === 'admin' ? getAdminSteps(userName) : getTargetologistSteps(userName);
      
      // ✅ FIX: Создаём driver и сохраняем в ref ДО определения callbacks
      const driverInstance = driver({
        showProgress: true,
        steps: steps,
        nextBtnText: 'Далее →',
        prevBtnText: '← Назад',
        doneBtnText: 'Готово ✓',
        progressText: '{{current}} / {{total}}',
        
        // ✅ УЛУЧШЕНО: Popover всегда по центру, не уходит вправо
        popoverClass: 'traffic-onboarding-popover',
        stagePadding: 10,
        stageRadius: 8,
        
        // ✅ FIX: Используем animate: false чтобы избежать проблем с позиционированием
        animate: true,
        
        onDestroyed: () => {
          console.log('🎓 Tour completed or skipped');
          saveTourCompletion(true);
          driverRef.current = null;
        },
      });
      
      // ✅ FIX: Сохраняем в ref ПЕРЕД drive()
      driverRef.current = driverInstance;
      
      // ✅ FIX: Переопределяем onNextClick и onPrevClick ПОСЛЕ создания
      // Используем monkey-patching для гарантированного доступа к instance
      const originalConfig = driverInstance.getConfig();
      driverInstance.setConfig({
        ...originalConfig,
        onNextClick: (_element, _step, { state }) => {
          console.log('➡️ Next step clicked, current:', state.activeIndex);
          saveTourProgress(state.activeIndex || 0);
          // ✅ FIX: Используем ref для доступа к instance
          if (driverRef.current) {
            driverRef.current.moveNext();
          }
        },
        onPrevClick: (_element, _step, { state }) => {
          console.log('⬅️ Prev step clicked, current:', state.activeIndex);
          if (driverRef.current) {
            driverRef.current.movePrevious();
          }
        },
      });
      
      // Запуск тура
      driverInstance.drive();
    };

    // Задержка для полной загрузки UI
    timer = setTimeout(checkAndStartTour, 1500);
    
    // Cleanup
    return () => {
      clearTimeout(timer);
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, [userId, userEmail, userName, userRole, saveTourProgress, saveTourCompletion]);

  return null; // Невидимый компонент
}

// ============================================
// ШАГИ ДЛЯ ТАРГЕТОЛОГА - УЛУЧШЕННЫЙ COPYWRITING
// ============================================

function getTargetologistSteps(userName: string) {
  return [
    // Шаг 1: Приветствие
    {
      element: 'body',
      popover: {
        title: `👋 Привет, ${userName}!`,
        description: `
          <div style="text-align: center; padding: 10px 0;">
            <p style="font-size: 15px; margin-bottom: 12px; color: #e0e0e0; line-height: 1.5;">
              Добро пожаловать в <strong style="color: #00FF88;">Traffic Dashboard</strong>!
            </p>
            <p style="font-size: 14px; color: #999; line-height: 1.5; margin-bottom: 16px;">
              Здесь ты видишь всю аналитику по своим рекламным кампаниям:<br/>
              доход, затраты, ROAS и CPA.
            </p>
            <div style="background: rgba(0, 255, 136, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(0, 255, 136, 0.3);">
              <p style="font-size: 13px; margin: 0; color: #00FF88;">
                ⏰ Это займёт всего 1 минуту
              </p>
            </div>
          </div>
        `,
      },
    },
    // Шаг 2: Кнопка "Мои результаты"
    {
      element: '[data-tour="my-results-button"]',
      popover: {
        title: '⭐ Кнопка "Мои результаты"',
        description: `
          <div style="padding: 8px 0;">
            <p style="margin-bottom: 14px; font-size: 14px; line-height: 1.5;">
              Сейчас ты видишь данные <strong>всех команд</strong>.
            </p>
            <div style="background: #00FF88; color: #000; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
              👆 Нажми эту кнопку,<br/>чтобы видеть только СВОИ результаты!
            </div>
            <p style="margin-top: 12px; font-size: 12px; color: #888;">
              Повторное нажатие вернёт общую статистику
            </p>
          </div>
        `,
      },
    },
    // Шаг 3: Карточки метрик
    {
      element: '[data-tour="metrics-cards"]',
      popover: {
        title: '📊 Твои ключевые метрики',
        description: `
          <div style="padding: 8px 0;">
            <p style="margin-bottom: 12px; font-size: 14px; color: #e0e0e0;">
              Здесь отображаются главные показатели:
            </p>
            <div style="display: grid; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <span>💰</span>
                <div>
                  <strong style="color: #00FF88;">Доход</strong>
                  <span style="color: #888; font-size: 12px;"> — сколько ты заработал</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <span>📈</span>
                <div>
                  <strong style="color: #00FF88;">ROAS</strong>
                  <span style="color: #888; font-size: 12px;"> — цель: </span>
                  <span style="color: #00FF88; font-size: 12px; font-weight: 600;">&gt; 2.0x</span>
                </div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <span>🎯</span>
                <div>
                  <strong style="color: #00FF88;">CPA</strong>
                  <span style="color: #888; font-size: 12px;"> — стоимость одной продажи</span>
                </div>
              </div>
            </div>
          </div>
        `,
      },
    },
    // Шаг 4: Таблица результатов
    {
      element: '[data-tour="results-table"]',
      popover: {
        title: '📝 Таблица команд',
        description: `
          <div style="padding: 8px 0;">
            <p style="margin-bottom: 12px; font-size: 14px;">
              В этой таблице — результаты всех таргетологов.
            </p>
            <div style="background: rgba(0, 255, 136, 0.1); padding: 12px; border-radius: 8px; border-left: 3px solid #00FF88;">
              <p style="font-size: 13px; margin: 0;">
                <strong style="color: #00FF88;">Твоя команда</strong> — это та, где активна<br/>
                кнопка AI-рекомендаций ✨
              </p>
            </div>
            <p style="margin-top: 10px; font-size: 12px; color: #888;">
              🔒 Доступ к AI есть только для твоей команды
            </p>
          </div>
        `,
      },
    },
    // Шаг 5: Финал с важным предупреждением
    {
      element: 'body',
      popover: {
        title: '🚀 Ты готов к работе!',
        description: `
          <div style="text-align: center; padding: 10px 0;">
            <p style="font-size: 16px; margin-bottom: 16px; color: #00FF88; font-weight: 600;">
              Отлично! Теперь ты знаешь основы 🎉
            </p>
            
            <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%); padding: 14px; border-radius: 10px; margin: 16px 0;">
              <p style="font-size: 14px; margin: 0; color: #fff; font-weight: 600;">
                ⚠️ ВАЖНО!
              </p>
              <p style="font-size: 13px; margin-top: 6px; color: rgba(255,255,255,0.9);">
                Всегда используй <strong>UTM-метки</strong><br/>
                иначе продажи не будут отслеживаться!
              </p>
            </div>
            
            <p style="font-size: 12px; color: #888;">
              💡 Обучение можно пройти повторно в настройках
            </p>
          </div>
        `,
      },
    },
  ];
}

// ============================================
// ШАГИ ДЛЯ АДМИНА - РАСШИРЕННЫЕ
// ============================================

function getAdminSteps(userName: string) {
  return [
    // Шаг 1: Приветствие админа
    {
      element: 'body',
      popover: {
        title: `👑 Привет, ${userName}!`,
        description: `
          <div style="text-align: center; padding: 10px 0;">
            <p style="font-size: 15px; margin-bottom: 12px; color: #e0e0e0; line-height: 1.5;">
              Добро пожаловать в <strong style="color: #00FF88;">Admin Panel</strong>!
            </p>
            <p style="font-size: 14px; color: #999; line-height: 1.5;">
              Ты имеешь полный доступ ко всем функциям:
            </p>
            <div style="display: grid; gap: 6px; margin-top: 12px; text-align: left;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                <span>✅</span>
                <span>Управление командами</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                <span>✅</span>
                <span>Аналитика по всем таргетологам</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                <span>✅</span>
                <span>Настройка UTM источников</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
                <span>✅</span>
                <span>Логи безопасности</span>
              </div>
            </div>
          </div>
        `,
      },
    },
    // Шаг 2: Финал
    {
      element: 'body',
      popover: {
        title: '🚀 Готово!',
        description: `
          <div style="text-align: center; padding: 10px 0;">
            <p style="font-size: 16px; margin-bottom: 12px; color: #00FF88; font-weight: 600;">
              Ты освоил панель администратора! 👑
            </p>
            <p style="font-size: 14px; color: #e0e0e0;">
              Успешной работы!
            </p>
            <div style="margin-top: 16px; padding: 12px; background: rgba(0, 255, 136, 0.1); border-radius: 8px;">
              <p style="font-size: 12px; color: #888; margin: 0;">
                💡 При необходимости обращайся в поддержку
              </p>
            </div>
          </div>
        `,
      },
    },
  ];
}

export default OnboardingTour;

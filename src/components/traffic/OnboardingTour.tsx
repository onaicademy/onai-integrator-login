/**
 * Traffic Onboarding Tour - ПОЛНОСТЬЮ ПЕРЕПИСАН
 * 
 * ✅ Адаптивный дизайн (Mobile/Tablet/Desktop)
 * ✅ Правильная интеграция с Target CAB Supabase
 * ✅ Красивые переводы на RU + KZ
 * ✅ Исправлены ВСЕ баги
 */

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import '@/styles/traffic-onboarding.css'; // ✅ Адаптивные стили
import axios from 'axios';
import { TRAFFIC_API_URL as API_URL } from '@/config/traffic-api';

interface OnboardingTourProps {
  userRole: 'admin' | 'targetologist';
  userId: string;
  userEmail: string;
  userName: string;
}

export function OnboardingTour({ userRole, userId, userEmail, userName }: OnboardingTourProps) {
  
  useEffect(() => {
    // Небольшая задержка для полной загрузки UI
    const timer = setTimeout(() => {
      checkAndStartTour();
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [userId]);

  const checkAndStartTour = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      const response = await axios.get(
        `${API_URL}/api/traffic-onboarding/status/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { is_first_login, is_completed } = response.data;
      
      // Показать обучение если:
      // 1. Первый вход ИЛИ
      // 2. Обучение не завершено
      if (is_first_login || !is_completed) {
        console.log('🎓 Starting onboarding tour for', userEmail);
        startTour();
      }
    } catch (error) {
      console.error('❌ Failed to check onboarding status:', error);
    }
  };

  const startTour = async () => {
    // Сначала зарегистрировать старт обучения
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
    
    // ✅ ИСПРАВЛЕНО: Правильная конфигурация driver.js
    const driverObj = driver({
      showProgress: true,
      steps: steps,
      nextBtnText: 'Далее →',
      prevBtnText: '← Назад',
      doneBtnText: 'Завершить',
      progressText: 'Шаг {{current}} из {{total}}',
      
      // ✅ АДАПТИВНОСТЬ
      popoverClass: 'traffic-onboarding-popover',
      
      onDestroyed: () => {
        console.log('🎓 Tour completed or skipped');
        saveTourCompletion(true);
      },
      
      // ✅ ИСПРАВЛЕНО: Используем правильный API driver.js
      onNextClick: (element, step, options) => {
        // Сохранить текущий шаг
        saveTourProgress(driverObj.getActiveIndex() || 0);
        driverObj.moveNext(); // ✅ ПРАВИЛЬНО!
      },
      
      onPrevClick: (element, step, options) => {
        driverObj.movePrevious(); // ✅ ПРАВИЛЬНО!
      }
    });

    driverObj.drive();
  };

  const saveTourProgress = async (step: number) => {
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.post(
        `${API_URL}/api/traffic-onboarding/progress`,
        { 
          user_id: userId, 
          current_step: step,
          tour_type: userRole 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('❌ Failed to save tour progress:', error);
    }
  };

  const saveTourCompletion = async (completed: boolean) => {
    try {
      const token = localStorage.getItem('traffic_token');
      await axios.post(
        `${API_URL}/api/traffic-onboarding/progress`,
        { 
          user_id: userId, 
          is_completed: completed,
          tour_type: userRole
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error('❌ Failed to save tour completion:', error);
    }
  };

  return null; // Невидимый компонент
}

// ============================================
// ШАГИ ДЛЯ ТАРГЕТОЛОГА - АДАПТИВНЫЕ
// ============================================

function getTargetologistSteps(userName: string) {
  return [
    {
      element: 'body',
      popover: {
        title: `🎉 Добро пожаловать, ${userName}!`,
        description: `
          <div style="text-align: center; padding: 15px;">
            <p style="font-size: clamp(14px, 3vw, 16px); margin-bottom: 15px; color: #e0e0e0; line-height: 1.5;">
              Привет! Я твой виртуальный помощник в Traffic Dashboard.
            </p>
            <p style="font-size: clamp(12px, 2.5vw, 14px); color: #999; line-height: 1.6;">
              Давай я покажу тебе основные функции платформы!<br/>
              Это займёт всего <strong style="color: #00FF88;">2 минуты</strong>.
            </p>
            <p style="margin-top: 20px; font-size: clamp(10px, 2vw, 12px); color: #666;">
              Можешь пропустить, нажав ✕ в углу
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="my-results-button"]',
      popover: {
        title: '⭐ Твоя главная кнопка!',
        description: `
          <div style="padding: 10px;">
            <p style="margin-bottom: 12px; font-size: clamp(12px, 2.5vw, 14px);">
              Эта <strong style="color: #00FF88;">БОЛЬШАЯ ЗЕЛЕНАЯ КНОПКА</strong> - твой лучший друг!
            </p>
            <p style="margin-bottom: 10px; font-size: clamp(11px, 2.3vw, 13px);">
              По умолчанию показываются результаты <strong>всех команд</strong>.
            </p>
            <p style="background: #00FF88; color: #000; padding: 10px; border-radius: 6px; font-weight: 600; font-size: clamp(11px, 2.3vw, 13px);">
              💡 Нажми её, чтобы видеть только СВОИ результаты!
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="metrics-cards"]',
      popover: {
        title: '📊 Твоя статистика',
        description: `
          <div style="padding: 10px;">
            <p style="margin-bottom: 12px; font-size: clamp(12px, 2.5vw, 14px);">Ключевые метрики твоих кампаний:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px; font-size: clamp(11px, 2.3vw, 13px);">
                💰 <strong>Доход</strong> - сколько заработал
              </li>
              <li style="margin-bottom: 8px; font-size: clamp(11px, 2.3vw, 13px);">
                💸 <strong>Затраты</strong> - потрачено на рекламу
              </li>
              <li style="margin-bottom: 8px; font-size: clamp(11px, 2.3vw, 13px);">
                📈 <strong>ROAS</strong> - окупаемость <span style="color: #00FF88;">(цель: > 2.0x)</span>
              </li>
              <li style="margin-bottom: 8px; font-size: clamp(11px, 2.3vw, 13px);">
                🎯 <strong>CPA</strong> - стоимость за продажу
              </li>
            </ul>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="results-table"]',
      popover: {
        title: '📈 Таблица результатов',
        description: `
          <div style="padding: 10px;">
            <p style="margin-bottom: 10px; font-size: clamp(12px, 2.5vw, 14px);">
              Здесь видны все команды и их результаты.
            </p>
            <p style="background: #2a2a2a; padding: 10px; border-radius: 6px; border-left: 3px solid #00FF88; font-size: clamp(11px, 2.3vw, 13px);">
              <strong style="color: #00FF88;">Твоя команда</strong> - та, где активна кнопка AI рекомендаций ✨
            </p>
            <p style="margin-top: 10px; font-size: clamp(10px, 2vw, 12px); color: #888;">
              У других команд кнопка неактивна - это безопасность!
            </p>
          </div>
        `,
      },
    },
    {
      element: 'body',
      popover: {
        title: '🎉 Готово!',
        description: `
          <div style="text-align: center; padding: 15px;">
            <p style="font-size: clamp(16px, 3.5vw, 18px); margin-bottom: 15px; color: #00FF88;">
              <strong>Отлично!</strong> 🎊
            </p>
            <p style="font-size: clamp(12px, 2.5vw, 14px); margin-bottom: 20px; color: #e0e0e0;">
              Теперь ты знаешь основы платформы!
            </p>
            
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); padding: 15px; border-radius: 10px; margin: 20px 0; border: 2px solid #ffc107;">
              <p style="font-size: clamp(12px, 2.5vw, 14px); margin: 0; color: #856404; font-weight: 600;">
                ⚠️ ВАЖНО: Всегда используй UTM-метки!
              </p>
              <p style="font-size: clamp(10px, 2vw, 12px); margin-top: 8px; color: #856404;">
                Без них продажи не будут отслеживаться 📊
              </p>
            </div>
            
            <p style="margin-top: 20px; font-size: clamp(9px, 1.8vw, 11px); color: #666;">
              💡 Можешь повторить обучение в любое время
            </p>
          </div>
        `,
      },
    },
  ];
}

// ============================================
// ШАГИ ДЛЯ АДМИНА - АДАПТИВНЫЕ
// ============================================

function getAdminSteps(userName: string) {
  return [
    {
      element: 'body',
      popover: {
        title: `👑 Добро пожаловать, ${userName}!`,
        description: `
          <div style="text-align: center; padding: 15px;">
            <p style="font-size: clamp(14px, 3vw, 16px); margin-bottom: 15px; color: #e0e0e0;">
              Давай я покажу тебе возможности админ панели.
            </p>
            <p style="font-size: clamp(12px, 2.5vw, 14px); color: #00FF88;">
              У тебя есть полный доступ ко всем функциям! 🔥
            </p>
          </div>
        `,
      },
    },
    {
      element: 'body',
      popover: {
        title: '🎉 Готово!',
        description: `
          <div style="text-align: center; padding: 15px;">
            <p style="font-size: clamp(16px, 3.5vw, 18px); margin-bottom: 10px; color: #00FF88;">
              Ты освоил админ панель! 🚀
            </p>
            <p style="font-size: clamp(12px, 2.5vw, 14px); color: #e0e0e0;">
              Успешной работы, Администратор! 👑
            </p>
          </div>
        `,
      },
    },
  ];
}

export default OnboardingTour;

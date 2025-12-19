/**
 * Traffic Onboarding Tour
 * 
 * Интерактивное обучение для новых пользователей
 * Использует driver.js для подсветки элементов
 */

import { useEffect } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
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
    
    const driverConfig: Config = {
      showProgress: true,
      steps: steps,
      nextBtnText: 'Далее →',
      prevBtnText: '← Назад',
      doneBtnText: 'Завершить',
      progressText: 'Шаг {{current}} из {{total}}',
      
      onDestroyed: () => {
        console.log('🎓 Tour completed or skipped');
        saveTourCompletion(true);
      },
      
      onNextClick: (element, step, options) => {
        // Сохранить текущий шаг
        const currentStepIndex = options.state ? options.state.activeIndex : 0;
        saveTourProgress(currentStepIndex);
        options.moveNext();
      },
      
      onPrevClick: (element, step, options) => {
        options.movePrevious();
      }
    };

    const driverObj = driver(driverConfig);
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
// ШАГИ ДЛЯ ТАРГЕТОЛОГА
// ============================================

function getTargetologistSteps(userName: string): DriveStep[] {
  return [
    {
      element: 'body',
      popover: {
        title: `🎉 Добро пожаловать, ${userName}!`,
        description: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 16px; margin-bottom: 15px; color: #e0e0e0;">
              Привет! Я твой виртуальный помощник в Traffic Dashboard.
            </p>
            <p style="font-size: 14px; color: #999;">
              Давай я покажу тебе основные функции платформы!<br/>
              Это займёт всего <strong style="color: #00FF88;">2 минуты</strong>.
            </p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">
              Можешь пропустить, нажав ✕ в углу
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="language-toggle"]',
      popover: {
        title: '🌐 Переключение языков',
        description: `
          <div style="padding: 5px;">
            <p style="margin-bottom: 10px;">
              Здесь ты можешь переключить язык интерфейса с <strong>русского</strong> на <strong>казахский</strong> и обратно.
            </p>
            <p style="font-size: 12px; color: #888;">
              Язык сохраняется автоматически!
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
          <div style="padding: 5px;">
            <p style="margin-bottom: 12px;">
              Эта <strong style="color: #00FF88; font-size: 16px;">БОЛЬШАЯ ЗЕЛЕНАЯ КНОПКА</strong> - твой лучший друг!
            </p>
            <p style="margin-bottom: 10px;">
              По умолчанию показываются результаты <strong>всех команд</strong>.
            </p>
            <p style="background: #00FF88; color: #000; padding: 8px; border-radius: 6px; font-weight: 600;">
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
          <div style="padding: 5px;">
            <p style="margin-bottom: 12px;">Ключевые метрики твоих кампаний:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px;">
                💰 <strong>Доход</strong> - сколько заработал
              </li>
              <li style="margin-bottom: 8px;">
                💸 <strong>Затраты</strong> - потрачено на рекламу
              </li>
              <li style="margin-bottom: 8px;">
                📈 <strong>ROAS</strong> - окупаемость <span style="color: #00FF88;">(цель: > 2.0x)</span>
              </li>
              <li style="margin-bottom: 8px;">
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
          <div style="padding: 5px;">
            <p style="margin-bottom: 10px;">
              Здесь видны все команды и их результаты.
            </p>
            <p style="background: #2a2a2a; padding: 10px; border-radius: 6px; border-left: 3px solid #00FF88;">
              <strong style="color: #00FF88;">Твоя команда</strong> - та, где активна кнопка AI рекомендаций ✨
            </p>
            <p style="margin-top: 10px; font-size: 12px; color: #888;">
              У других команд кнопка неактивна - это безопасность!
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="ai-recommendations"]',
      popover: {
        title: '🤖 AI Рекомендации',
        description: `
          <div style="padding: 5px;">
            <p style="margin-bottom: 12px;">
              Нажми кнопку <strong>"Получить AI-рекомендации"</strong> чтобы получить:
            </p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px;">
                ✅ Советы по оптимизации кампаний
              </li>
              <li style="margin-bottom: 8px;">
                ✅ Анализ твоих результатов
              </li>
              <li style="margin-bottom: 8px;">
                ✅ Рекомендации по бюджету
              </li>
            </ul>
            <p style="margin-top: 12px; font-size: 12px; color: #00FF88;">
              💡 Это твой персональный AI-помощник!
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="sidebar"]',
      popover: {
        title: '📱 Боковое меню',
        description: `
          <div style="padding: 5px;">
            <p style="margin-bottom: 12px;">Боковое меню позволяет:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px;">
                🏠 Вернуться на Dashboard
              </li>
              <li style="margin-bottom: 8px;">
                🚪 Выйти из системы
              </li>
            </ul>
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
            <p style="font-size: 18px; margin-bottom: 15px; color: #00FF88;">
              <strong>Отлично!</strong> 🎊
            </p>
            <p style="font-size: 14px; margin-bottom: 20px; color: #e0e0e0;">
              Теперь ты знаешь основы платформы!
            </p>
            
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffe8a1 100%); padding: 15px; border-radius: 10px; margin: 20px 0; border: 2px solid #ffc107;">
              <p style="font-size: 14px; margin: 0; color: #856404; font-weight: 600;">
                ⚠️ ВАЖНО: Всегда используй UTM-метки!
              </p>
              <p style="font-size: 12px; margin-top: 8px; color: #856404;">
                Без них продажи не будут отслеживаться 📊
              </p>
            </div>
            
            <p style="margin-top: 20px; font-size: 11px; color: #666;">
              💡 Можешь повторить обучение в любое время
            </p>
          </div>
        `,
      },
    },
  ];
}

// ============================================
// ШАГИ ДЛЯ АДМИНА
// ============================================

function getAdminSteps(userName: string): DriveStep[] {
  return [
    {
      element: 'body',
      popover: {
        title: `👑 Добро пожаловать, ${userName}!`,
        description: `
          <div style="text-align: center; padding: 10px;">
            <p style="font-size: 16px; margin-bottom: 15px; color: #e0e0e0;">
              Давай я покажу тебе возможности админ панели.
            </p>
            <p style="font-size: 14px; color: #00FF88;">
              У тебя есть полный доступ ко всем функциям! 🔥
            </p>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="admin-dashboard"]',
      popover: {
        title: '📊 Dashboard',
        description: 'Общая статистика всех команд и таргетологов. Здесь ты видишь картину целиком!',
      },
    },
    {
      element: '[data-tour="utm-sources"]',
      popover: {
        title: '📊 Источники продаж',
        description: `
          <div style="padding: 5px;">
            <p style="margin-bottom: 10px;">Здесь ты видишь:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 6px;">📈 ВСЕ продажи по UTM-меткам</li>
              <li style="margin-bottom: 6px;">🎯 Топ источников и кампаний</li>
              <li style="margin-bottom: 6px;">⚠️ Продажи без UTM (требуют внимания)</li>
            </ul>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="security"]',
      popover: {
        title: '🔒 Безопасность',
        description: `
          <div style="padding: 5px;">
            <p style="margin-bottom: 10px;">Мониторинг активности пользователей:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 6px;">👁️ Все входы в систему</li>
              <li style="margin-bottom: 6px;">🌍 IP адреса и устройства</li>
              <li style="margin-bottom: 6px;">🚨 Подозрительная активность</li>
            </ul>
          </div>
        `,
      },
    },
    {
      element: '[data-tour="settings"]',
      popover: {
        title: '⚙️ Настройки',
        description: `
          <div style="padding: 5px;">
            <p style="margin-bottom: 10px;">Глобальные настройки AI:</p>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 6px;">📈 Процент роста</li>
              <li style="margin-bottom: 6px;">🎯 Минимальный ROAS</li>
              <li style="margin-bottom: 6px;">💰 Максимальный CPA</li>
            </ul>
            <p style="margin-top: 12px; font-size: 12px; color: #00FF88; font-weight: 600;">
              ✅ Применяются ко ВСЕМ командам!
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
            <p style="font-size: 18px; margin-bottom: 10px; color: #00FF88;">
              Ты освоил админ панель! 🚀
            </p>
            <p style="font-size: 14px; color: #e0e0e0;">
              Успешной работы, Администратор! 👑
            </p>
          </div>
        `,
      },
    },
  ];
}

export default OnboardingTour;

/**
 * 🎯 TRIPWIRE ONBOARDING TOUR
 * 
 * Главный компонент интерактивного тура на базе driver.js.
 * Киберпанк-стиль с неоновыми эффектами.
 */

import React, { useEffect, useRef } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import { tripwireOnboardingSteps, driverConfig } from '@/config/tripwireOnboardingSteps';
import { useTripwireOnboarding } from '@/contexts/TripwireOnboardingContext';

export const TripwireOnboardingTour: React.FC = () => {
  const {
    isOnboardingActive,
    completeOnboarding,
    setCurrentStep,
  } = useTripwireOnboarding();
  
  const driverObjRef = useRef<any>(null);
  
  useEffect(() => {
    // Если onboarding не активен - ничего не делаем
    if (!isOnboardingActive) {
      return;
    }
    
    // Задержка 500ms для полной загрузки DOM
    const timer = setTimeout(() => {
      console.log('🚀 TripwireOnboardingTour: Initializing driver.js');
      
      // Инициализируем driver.js
      const driverObj = driver({
        ...driverConfig,
        
        steps: tripwireOnboardingSteps as DriveStep[],
        
        // Callbacks
        onNextClick: (element, step, options) => {
          console.log(`➡️ Next step: ${options.state.activeIndex + 1}`);
          setCurrentStep(options.state.activeIndex + 1);
          driverObj.moveNext();
        },
        
        onPrevClick: (element, step, options) => {
          console.log(`⬅️ Previous step: ${options.state.activeIndex - 1}`);
          setCurrentStep(options.state.activeIndex - 1);
          driverObj.movePrevious();
        },
        
        onDestroyed: async () => {
          console.log('✅ TripwireOnboardingTour: Tour completed');
          await completeOnboarding();
        },
        
        onDestroyStarted: () => {
          // Запретить преждевременное закрытие (только через кнопку "Завершить")
          if (!driverObj.isLastStep()) {
            console.log('⚠️ Cannot close tour before completion');
            return false;
          }
          return true;
        },
        
        // Запретить клик по оверлею
        allowClose: false,
      });
      
      // Сохраняем ссылку на driver
      driverObjRef.current = driverObj;
      
      // Запускаем тур
      driverObj.drive();
    }, 500);
    
    // Cleanup
    return () => {
      clearTimeout(timer);
      if (driverObjRef.current) {
        driverObjRef.current.destroy();
        driverObjRef.current = null;
      }
    };
  }, [isOnboardingActive, completeOnboarding, setCurrentStep]);
  
  // Этот компонент не рендерит UI - он только управляет driver.js
  return null;
};


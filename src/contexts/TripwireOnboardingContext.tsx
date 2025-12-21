/**
 * 🎯 TRIPWIRE ONBOARDING CONTEXT
 * 
 * React Context для управления состоянием onboarding тура.
 * Синхронизируется с БД через API.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { tripwireSupabase } from '@/lib/supabase-tripwire';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

interface TripwireOnboardingContextType {
  // Состояние onboarding
  isOnboardingActive: boolean;
  isOnboardingCompleted: boolean;
  showWelcomeModal: boolean;
  
  // Текущий шаг
  currentStep: number;
  totalSteps: number;
  
  // Управление
  startOnboarding: () => void;
  completeOnboarding: () => Promise<void>;
  setCurrentStep: (step: number) => void;
  closeWelcomeModal: () => void;
  
  // Статус
  isLoading: boolean;
  error: string | null;
}

const TripwireOnboardingContext = createContext<TripwireOnboardingContextType | undefined>(undefined);

interface TripwireOnboardingProviderProps {
  children: React.ReactNode;
}

export const TripwireOnboardingProvider: React.FC<TripwireOnboardingProviderProps> = ({ children }) => {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const totalSteps = 10; // 10 шагов в туре
  
  // 🔥 Загружаем статус onboarding при монтировании
  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        setIsLoading(true);
        
        // Получаем текущего пользователя
        const { data: { session } } = await tripwireSupabase.auth.getSession();
        
        if (!session?.user) {
          console.log('🎯 TripwireOnboarding: No user session');
          setIsLoading(false);
          return;
        }
        
        // Получаем статус onboarding из tripwire_users
        const { data: userData, error: userError } = await tripwireSupabase
          .from('tripwire_users')
          .select('onboarding_completed')
          .eq('email', session.user.email)
          .single();
        
        if (userError) {
          console.error('❌ TripwireOnboarding: Error loading status:', userError);
          setError(userError.message);
          setIsLoading(false);
          return;
        }
        
        const completed = userData?.onboarding_completed || false;
        setIsOnboardingCompleted(completed);
        
        // Если onboarding НЕ завершен - показываем welcome modal
        if (!completed) {
          console.log('🎉 TripwireOnboarding: First time user - showing welcome modal');
          // Задержка 800ms для полной загрузки DOM
          setTimeout(() => {
            setShowWelcomeModal(true);
          }, 800);
        } else {
          console.log('✅ TripwireOnboarding: User already completed onboarding');
        }
        
        setIsLoading(false);
      } catch (err: any) {
        console.error('❌ TripwireOnboarding: Unexpected error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    loadOnboardingStatus();
  }, []);
  
  // 🚀 Начать onboarding тур
  const startOnboarding = useCallback(() => {
    console.log('🚀 TripwireOnboarding: Starting tour');
    setShowWelcomeModal(false);
    setIsOnboardingActive(true);
    setCurrentStep(0);
  }, []);
  
  // ✅ Завершить onboarding
  const completeOnboarding = useCallback(async () => {
    try {
      console.log('✅ TripwireOnboarding: Completing onboarding');
      
      // Получаем текущего пользователя
      const { data: { session } } = await tripwireSupabase.auth.getSession();
      
      if (!session?.user) {
        throw new Error('No user session');
      }
      
      // Отправляем запрос на сервер для обновления флага
      await axios.post(
        `${API_URL}/api/tripwire/onboarding/complete`,
        {},
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      
      // Обновляем локальное состояние
      setIsOnboardingCompleted(true);
      setIsOnboardingActive(false);
      setCurrentStep(0);
      
      console.log('🎉 TripwireOnboarding: Onboarding completed successfully');
    } catch (err: any) {
      console.error('❌ TripwireOnboarding: Error completing onboarding:', err);
      setError(err.message);
    }
  }, []);
  
  // 🚪 Закрыть welcome modal (только для запуска тура)
  const closeWelcomeModal = useCallback(() => {
    setShowWelcomeModal(false);
  }, []);
  
  const value: TripwireOnboardingContextType = {
    isOnboardingActive,
    isOnboardingCompleted,
    showWelcomeModal,
    currentStep,
    totalSteps,
    startOnboarding,
    completeOnboarding,
    setCurrentStep,
    closeWelcomeModal,
    isLoading,
    error,
  };
  
  return (
    <TripwireOnboardingContext.Provider value={value}>
      {children}
    </TripwireOnboardingContext.Provider>
  );
};

/**
 * 🎣 Hook для использования TripwireOnboardingContext
 */
export const useTripwireOnboarding = (): TripwireOnboardingContextType => {
  const context = useContext(TripwireOnboardingContext);
  
  if (context === undefined) {
    throw new Error('useTripwireOnboarding must be used within TripwireOnboardingProvider');
  }
  
  return context;
};





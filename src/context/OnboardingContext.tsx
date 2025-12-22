/**
 * 🎓 Onboarding Context - Multi-page State Persistence
 * 
 * РЕШЕНИЕ: Persist onboarding state в localStorage
 * чтобы продолжать tour после navigate() между страницами
 * 
 * @see TRAFFIC-FIXES-COMPLETE.md (FIX #2)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CallBackProps, EVENTS, ACTIONS, STATUS } from 'react-joyride';

interface OnboardingContextType {
  // State
  isOnboardingActive: boolean;
  currentStepIndex: number;
  completedSteps: number[];
  
  // Methods
  startOnboarding: (initialStep?: number) => void;
  stopOnboarding: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  markStepComplete: (step: number) => void;
  
  // For Joyride callback
  handleJoyrideCallback: (data: CallBackProps) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ========================================
  // STATE - Persisted in localStorage
  // ========================================
  const [isOnboardingActive, setIsOnboardingActive] = useState(() => {
    const saved = localStorage.getItem('traffic_onboarding_active');
    return saved !== null ? JSON.parse(saved) : false; // Default false (запустится через API check)
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const saved = localStorage.getItem('traffic_onboarding_step');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [completedSteps, setCompletedSteps] = useState<number[]>(() => {
    const saved = localStorage.getItem('traffic_onboarding_completed');
    return saved ? JSON.parse(saved) : [];
  });

  // ========================================
  // PERSIST TO LOCALSTORAGE
  // ========================================
  const updateStep = useCallback((step: number) => {
    console.log(`🎓 [ONBOARDING CTX] Update step: ${step}`);
    setCurrentStepIndex(step);
    localStorage.setItem('traffic_onboarding_step', step.toString());
  }, []);

  const markStepComplete = useCallback((step: number) => {
    setCompletedSteps(prev => {
      const updated = [...new Set([...prev, step])];
      localStorage.setItem('traffic_onboarding_completed', JSON.stringify(updated));
      console.log(`✅ [ONBOARDING CTX] Step ${step} completed. Total: ${updated.length}`);
      return updated;
    });
  }, []);

  const startOnboarding = useCallback((initialStep = 0) => {
    console.log(`🚀 [ONBOARDING CTX] Starting from step ${initialStep}`);
    setIsOnboardingActive(true);
    updateStep(initialStep);
    localStorage.setItem('traffic_onboarding_active', 'true');
  }, [updateStep]);

  const stopOnboarding = useCallback(() => {
    console.log(`🛑 [ONBOARDING CTX] Stopping onboarding`);
    setIsOnboardingActive(false);
    localStorage.setItem('traffic_onboarding_active', 'false');
  }, []);

  const skipOnboarding = useCallback(() => {
    console.log(`⏭️  [ONBOARDING CTX] Skipping onboarding`);
    stopOnboarding();
    localStorage.removeItem('traffic_onboarding_step');
    localStorage.removeItem('traffic_onboarding_completed');
    localStorage.removeItem('traffic_onboarding_active');
  }, [stopOnboarding]);

  const nextStep = useCallback(() => {
    updateStep(currentStepIndex + 1);
  }, [currentStepIndex, updateStep]);

  // ========================================
  // JOYRIDE CALLBACK
  // ========================================
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { action, index, type, status } = data;

    console.log(`🎓 [ONBOARDING CTX] Callback:`, { action, index, type, status });

    // Mark step as completed
    if (type === EVENTS.STEP_AFTER && index !== undefined) {
      markStepComplete(index);
    }

    // Handle NEXT button
    if (action === ACTIONS.NEXT && type === EVENTS.STEP_AFTER && index !== undefined) {
      const nextStep = index + 1;
      updateStep(nextStep);
    }

    // Handle BACK button
    if (action === ACTIONS.PREV && index !== undefined) {
      const prevStep = Math.max(0, index - 1);
      updateStep(prevStep);
    }

    // Handle SKIP/CLOSE
    if (action === ACTIONS.SKIP || action === ACTIONS.CLOSE) {
      skipOnboarding();
    }

    // Handle FINISH
    if (status === STATUS.FINISHED) {
      console.log('✅ [ONBOARDING CTX] Tour completed!');
      stopOnboarding();
      // Clear all onboarding data
      localStorage.removeItem('traffic_onboarding_step');
      localStorage.removeItem('traffic_onboarding_completed');
    }
  }, [markStepComplete, updateStep, skipOnboarding, stopOnboarding]);

  // ========================================
  // CONTEXT VALUE
  // ========================================
  const value: OnboardingContextType = {
    isOnboardingActive,
    currentStepIndex,
    completedSteps,
    startOnboarding,
    stopOnboarding,
    setCurrentStep: updateStep,
    nextStep,
    skipOnboarding,
    markStepComplete,
    handleJoyrideCallback,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

/**
 * Traffic Dashboard Onboarding Tour
 * Comprehensive step-by-step tour for new targetologists
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Target, Settings, TrendingUp, Bot, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface OnboardingStep {
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  highlightElement?: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    titleKey: 'onboarding.step1.title',
    descKey: 'onboarding.step1.desc',
    icon: <Target className="w-8 h-8 text-[#00FF88]" />
  },
  {
    titleKey: 'onboarding.step2.title',
    descKey: 'onboarding.step2.desc',
    icon: <AlertCircle className="w-8 h-8 text-[#FFA500]" />
  },
  {
    titleKey: 'onboarding.step3.title',
    descKey: 'onboarding.step3.desc',
    icon: <Settings className="w-8 h-8 text-[#00FF88]" />,
    highlightElement: '[data-onboarding="settings-link"]',
    position: 'right'
  },
  {
    titleKey: 'onboarding.step4.title',
    descKey: 'onboarding.step4.desc',
    icon: <Target className="w-8 h-8 text-[#1877F2]" />,
    position: 'bottom'
  },
  {
    titleKey: 'onboarding.step5.title',
    descKey: 'onboarding.step5.desc',
    icon: <CheckCircle2 className="w-8 h-8 text-[#00FF88]" />,
    position: 'bottom'
  },
  {
    titleKey: 'onboarding.step6.title',
    descKey: 'onboarding.step6.desc',
    icon: <AlertCircle className="w-8 h-8 text-[#FF0000]" />,
    position: 'top'
  },
  {
    titleKey: 'onboarding.step7.title',
    descKey: 'onboarding.step7.desc',
    icon: <AlertCircle className="w-8 h-8 text-[#FFA500]" />,
    position: 'top'
  },
  {
    titleKey: 'onboarding.step8.title',
    descKey: 'onboarding.step8.desc',
    icon: <Bot className="w-8 h-8 text-[#00FF88]" />,
    position: 'bottom'
  },
  {
    titleKey: 'onboarding.step9.title',
    descKey: 'onboarding.step9.desc',
    icon: <TrendingUp className="w-8 h-8 text-[#00FF88]" />,
    highlightElement: '[data-onboarding="dashboard"]',
    position: 'bottom'
  }
];

interface TrafficOnboardingProps {
  userRole: string;
  userId: string;
  userEmail: string;
  userName: string;
}

export const TrafficOnboarding: React.FC<TrafficOnboardingProps> = ({ userRole, userId, userEmail, userName }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const token = localStorage.getItem('traffic_token');
        const response = await fetch(`/api/traffic-onboarding/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        // Show onboarding if not completed
        if (!data.onboarding?.is_completed) {
          setVisible(true);
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        // Show onboarding on error (first time users)
        setVisible(true);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [userId]);

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  useEffect(() => {
    // Highlight element if specified
    if (currentStepData.highlightElement) {
      const element = document.querySelector(currentStepData.highlightElement);
      if (element) {
        element.classList.add('ring-2', 'ring-[#00FF88]', 'ring-offset-2', 'ring-offset-black');
      }
    }

    // Cleanup previous highlights
    return () => {
      const allHighlighted = document.querySelectorAll('.ring-2.ring-\\[\\#00FF88\\]');
      allHighlighted.forEach(el => {
        el.classList.remove('ring-2', 'ring-[#00FF88]', 'ring-offset-2', 'ring-offset-black');
      });
    };
  }, [currentStep, currentStepData.highlightElement]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      await fetch(`/api/traffic-onboarding/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          is_completed: true,
          current_step: ONBOARDING_STEPS.length,
          total_steps: ONBOARDING_STEPS.length,
          completed_at: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to save onboarding completion:', error);
    }
    setVisible(false);
  };

  const handleSkip = async () => {
    try {
      const token = localStorage.getItem('traffic_token');
      await fetch(`/api/traffic-onboarding/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          skip_count: 1,
          current_step: currentStep
        })
      });
    } catch (error) {
      console.error('Failed to save onboarding skip:', error);
    }
    setVisible(false);
  };

  if (loading || !visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity" />

      {/* Onboarding Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-gradient-to-br from-black via-[#0a0a0a] to-[#001a0d] border border-[#00FF88]/20 rounded-2xl shadow-2xl overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-lg bg-black/40 hover:bg-black/60 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Progress Bar */}
            <div className="flex items-center gap-2 mb-6">
              {ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    index <= currentStep
                      ? 'bg-gradient-to-r from-[#00FF88] to-[#00CC6F]'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Icon */}
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center">
                {currentStepData.icon}
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center">
              {t(currentStepData.titleKey as any)}
            </h2>

            {/* Description */}
            <p className="text-gray-300 text-center leading-relaxed text-lg">
              {t(currentStepData.descKey as any)}
            </p>

            {/* Step Counter */}
            <div className="text-center text-sm text-gray-500">
              {t('onboarding.stepOf')} {currentStep + 1} / {ONBOARDING_STEPS.length}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <Button
                onClick={handleSkip}
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                {t('onboarding.skip')}
              </Button>

              <div className="flex items-center gap-3">
                {!isFirstStep && (
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    className="border-[#00FF88]/20 text-white hover:bg-[#00FF88]/10"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t('onboarding.back')}
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-[#00FF88] to-[#00CC6F] text-black font-semibold hover:shadow-lg hover:shadow-[#00FF88]/20"
                >
                  {isLastStep ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('onboarding.complete')}
                    </>
                  ) : (
                    <>
                      {t('onboarding.next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Decorative Glow */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#00FF88]/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#00FF88]/5 rounded-full blur-3xl -z-10" />
        </div>
      </div>
    </>
  );
};

export default TrafficOnboarding;


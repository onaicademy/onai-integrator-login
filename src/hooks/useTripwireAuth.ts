import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripwireLogin } from '@/lib/tripwire-api';
import type { TripwireLoginRequest, TripwireErrorResponse, ButtonState } from '@/types/tripwire';
import { toast } from 'sonner';

export function useTripwireAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TripwireErrorResponse | null>(null);
  const [buttonState, setButtonState] = useState<ButtonState>('default');
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();

  const login = async (data: TripwireLoginRequest) => {
    // Check rate limiting (5 attempts per session)
    if (attemptCount >= 5) {
      setError({
        code: 'TOO_MANY_ATTEMPTS',
        message: 'Слишком много попыток. Попробуйте позже.',
        field: 'general',
      });
      setButtonState('error');
      
      setTimeout(() => {
        setButtonState('default');
        setAttemptCount(0); // Reset after timeout
      }, 15000); // 15 minutes in production
      
      return;
    }

    setIsLoading(true);
    setButtonState('loading');
    setError(null);

    try {
      const response = await tripwireLogin(data);
      
      // Success state
      setButtonState('success');
      toast.success('✓ Добро пожаловать!');
      
      // Redirect after short delay
      setTimeout(() => {
        navigate('/tripwire', { replace: true });
      }, 500);
      
    } catch (err: any) {
      const errorResponse = err as TripwireErrorResponse;
      setError(errorResponse);
      setButtonState('error');
      setAttemptCount(prev => prev + 1);
      
      // Show error toast
      toast.error(errorResponse.message || 'Ошибка входа');
      
      // Reset button state after 2 seconds
      setTimeout(() => {
        setButtonState('default');
      }, 2000);
      
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
    setButtonState('default');
  };

  return {
    login,
    isLoading,
    error,
    buttonState,
    attemptCount,
    clearError,
  };
}


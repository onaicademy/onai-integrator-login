import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ
import type { TripwireLoginRequest, TripwireErrorResponse, ButtonState } from '@/types/tripwire';
import { toast } from 'sonner';

/**
 * useTripwireAuth - Real Supabase Authentication Hook for Tripwire
 * 
 * ✅ ИЗОЛИРОВАННАЯ БАЗА ДАННЫХ: Использует tripwireSupabase (отдельный проект Supabase)
 * ✅ Независимая аутентификация от Main Platform
 * ✅ JWT токен сохраняется под уникальным ключом 'tripwire_supabase_token'
 */
export function useTripwireAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TripwireErrorResponse | null>(null);
  const [buttonState, setButtonState] = useState<ButtonState>('default');
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
      }, 15000);
      
      return;
    }

    setIsLoading(true);
    setButtonState('loading');
    setError(null);

    try {
      console.log('🔐 Tripwire: Attempting Supabase login for', data.email);
      
      // Use Tripwire Supabase authentication (ISOLATED DATABASE)
      const { data: authData, error: authError } = await tripwireSupabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        console.error('❌ Supabase auth error:', authError);
        throw {
          code: 'AUTH_ERROR',
          message: authError.message === 'Invalid login credentials' 
            ? 'Неверный email или пароль' 
            : authError.message,
          field: 'general',
        };
      }

      if (!authData.session) {
        throw {
          code: 'NO_SESSION',
          message: 'Не удалось создать сессию',
          field: 'general',
        };
      }

      console.log('✅ Tripwire Supabase login successful:', authData.user.email);
      console.log('🔑 Tripwire JWT token received:', authData.session.access_token.substring(0, 20) + '...');

      // Save JWT token with TRIPWIRE prefix to avoid conflicts with Main Platform
      localStorage.setItem('tripwire_supabase_token', authData.session.access_token);
      localStorage.setItem('tripwire_supabase_session', JSON.stringify({
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_at: authData.session.expires_at,
      }));

      // Handle "Remember Me"
      if (data.remember) {
        localStorage.setItem('tripwire_remembered_email', data.email);
        console.log('💾 Email saved for "Remember Me"');
      } else {
        localStorage.removeItem('tripwire_remembered_email');
      }

      // Success state
      setButtonState('success');
      toast.success('✓ Добро пожаловать!');

      // 🔥 AUTO-REDIRECT: Check user role and redirect accordingly
      const userData = authData.user.user_metadata;
      const userRole = userData?.role;

      // ✅ Sales managers логинятся на Tripwire и редиректятся на Sales Manager Dashboard
      if (userRole === 'sales') {
        console.log('✅ Sales manager logged in, redirecting to Sales Manager Dashboard...');
        setTimeout(() => {
          navigate('/sales-manager', { replace: true });
        }, 500);
        return;
      }

      // Students and others → Get returnUrl from query params (or default to /)
      const returnUrl = searchParams.get('returnUrl') || '/';
      const decodedReturnUrl = decodeURIComponent(returnUrl)
        .replace(/^\/(integrator|tripwire)/, '') || '/';
      
      console.log('🔄 Redirecting to:', decodedReturnUrl);

      // Redirect after short delay
      setTimeout(() => {
        navigate(decodedReturnUrl, { replace: true });
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

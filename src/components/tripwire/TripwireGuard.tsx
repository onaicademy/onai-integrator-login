import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface TripwireGuardProps {
  children: React.ReactNode;
}

/**
 * TripwireGuard - Authentication Guard for Tripwire Routes
 * 
 * Ensures users are authenticated before accessing Tripwire content.
 * If not authenticated, redirects to /tripwire/login with returnUrl.
 */
export function TripwireGuard({ children }: TripwireGuardProps) {
  const { user, isInitialized, isLoading, session } = useAuth();
  const location = useLocation();

  // 🔒 CRITICAL SECURITY: Detailed logging for debugging
  console.log('🔒 TripwireGuard Check:', {
    path: location.pathname,
    user: user?.email || null,
    isInitialized,
    isLoading,
    hasSession: !!session,
    timestamp: new Date().toISOString(),
  });

  // STEP 1: Show loading spinner while auth is initializing
  // CRITICAL: Do NOT render children until fully initialized!
  if (!isInitialized || isLoading) {
    console.log('⏳ TripwireGuard: Ожидание инициализации Auth...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#030303]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-[#00FF88] mx-auto" />
          <p className="text-xl text-white">Проверка авторизации...</p>
          <p className="text-sm text-gray-400">Загрузка Tripwire...</p>
        </div>
      </div>
    );
  }

  // STEP 2: CRITICAL SECURITY CHECK - Block access if no user OR no session
  if (!user || !session) {
    console.error('❌ TripwireGuard: ДОСТУП ЗАПРЕЩЕН!', {
      hasUser: !!user,
      hasSession: !!session,
      reason: !user ? 'No user' : 'No session',
    });
    
    // Save current path as returnUrl
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    
    return (
      <Navigate 
        to={`/tripwire/login?returnUrl=${returnUrl}`} 
        replace 
      />
    );
  }

  // STEP 3: Additional validation - Check token expiration
  if (session.expires_at) {
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    
    if (expiresAt < now) {
      console.error('❌ TripwireGuard: Токен истек!', {
        expiresAt: new Date(expiresAt).toISOString(),
        now: new Date(now).toISOString(),
      });
      
      // Clear expired session
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('sb-arqhkacellqbhjhbebfh-auth-token');
      
      return (
        <Navigate 
          to="/tripwire/login?returnUrl=${encodeURIComponent(location.pathname)}" 
          replace 
        />
      );
    }
  }

  // STEP 4: User is authenticated and session is valid - render children
  console.log('✅ TripwireGuard: Доступ разрешён для', user.email, '(токен действителен)');
  return <>{children}</>;
}


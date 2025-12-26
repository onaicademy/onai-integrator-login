/**
 * 🔐 TrafficGuard - Authentication Guard for Traffic Dashboard
 *
 * Validates authentication against AuthManager (LocalStorage-based)
 * Separate from Supabase AuthContext used by main platform
 *
 * Usage:
 * <TrafficGuard requireAdmin={true}>
 *   <TrafficAdminPanel />
 * </TrafficGuard>
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthManager } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface TrafficGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function TrafficGuard({ children, requireAdmin = false }: TrafficGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log('🔐 [TrafficGuard] Checking authentication...');

    // Get user and token from AuthManager (LocalStorage)
    const user = AuthManager.getUser();
    const token = AuthManager.getAccessToken();

    // Check 1: Token and user must exist
    if (!token || !user) {
      console.warn('⛔ [TrafficGuard] No token/user found in LocalStorage');
      console.warn('⛔ [TrafficGuard] Redirecting to /traffic/login');
      setIsChecking(false);
      navigate('/traffic/login', { replace: true, state: { from: location } });
      return;
    }

    console.log('✅ [TrafficGuard] Token found:', token.substring(0, 20) + '...');
    console.log('✅ [TrafficGuard] User:', user.email, 'Role:', user.role, 'Team:', user.team || 'null');

    // Check 2: Admin role required?
    if (requireAdmin && user.role !== 'admin') {
      console.warn('⛔ [TrafficGuard] Admin required, but user role is:', user.role);
      console.warn('⛔ [TrafficGuard] Redirecting to /traffic/login');
      setIsChecking(false);
      navigate('/traffic/login', { replace: true });
      return;
    }

    // ✅ All checks passed
    console.log('✅ [TrafficGuard] Authorization successful');
    setIsAuthorized(true);
    setIsChecking(false);
  }, [navigate, location, requireAdmin]);

  // Show loading spinner while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#030303] via-[#0a0a0a] to-[#000000]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#00FF88] mx-auto" />
          <p className="text-white/60 text-sm">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  // Render protected content
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

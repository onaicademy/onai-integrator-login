import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'student' | 'guest' | null;
  isInitialized: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Извлечь роль из JWT токена
  const extractRoleFromToken = (session: Session | null): string => {
    if (!session?.access_token) return 'guest';
    
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      return payload.user_role || 'guest';
    } catch {
      return 'guest';
    }
  };

  useEffect(() => {
    console.log('🔐 AuthContext: Инициализация...');
    
    // Получить текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        const role = extractRoleFromToken(session);
        setUserRole(role);
        console.log('✅ Роль из JWT:', role);
      } else {
        console.log('❌ Нет сохраненной сессии');
      }
      
      setIsInitialized(true);
      setIsLoading(false);
    });

    // Слушать изменения auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth event:', event);
        
        if (session) {
          setSession(session);
          setUser(session.user);
          const role = extractRoleFromToken(session);
          setUserRole(role);
          console.log('✅ Роль из JWT:', role);
        } else {
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
        
        setIsInitialized(true);
        setIsLoading(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    session,
    userRole: userRole as any,
    isInitialized,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен быть использован внутри AuthProvider');
  }
  return context;
}

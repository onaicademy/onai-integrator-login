import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UserRole = 'admin' | 'student' | 'curator' | 'tech_support' | null;

type AuthContextType = {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  isInitialized: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('🔐 AuthContext: Инициализация...');

    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = 
          await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error('❌ AuthContext: Ошибка getSession', error);
          setIsLoading(false);
          setIsInitialized(true);
          return;
        }

        console.log(
          initialSession
            ? `✅ AuthContext: Сессия восстановлена для ${initialSession.user.email}`
            : '❌ AuthContext: Нет сохраненной сессии'
        );

        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);

          const role = (initialSession.user as any).user_metadata?.role ||
            (initialSession.user as any).app_metadata?.role ||
            'student';
          
          console.log('✅ AuthContext: Роль из JWT:', role);
          
          // Редирект для гостей
          if (role === 'guest' || !role) {
            console.log('🚫 AuthContext: Роль guest или нет роли - редирект на /login');
            window.location.href = '/login';
            return;
          }
          
          setUserRole(role as UserRole);
        } else {
          setSession(null);
          setUser(null);
          setUserRole(null);
        }

        setIsLoading(false);
        setIsInitialized(true);

      } catch (error) {
        console.error('❌ AuthContext: Исключение при инициализации', error);
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        console.log('🔐 Auth event:', event);

        if (!isInitialized) {
          console.log('✅ AuthContext: Инициализация завершена (из onAuthStateChange)');
          setIsInitialized(true);
        }

        if (event === 'SIGNED_OUT') {
          console.log('👋 Пользователь вышел');
          setSession(null);
          setUser(null);
          setUserRole(null);
          setIsLoading(false);
        } 
        else if (event === 'SIGNED_IN') {
          console.log('👤 Пользователь вошел');
          if (session) {
            setSession(session);
            setUser(session.user);
            const role = (session.user as any).user_metadata?.role ||
              (session.user as any).app_metadata?.role ||
              'student';
            console.log('✅ Роль из JWT:', role);
            
            // Редирект для гостей
            if (role === 'guest' || !role) {
              console.log('🚫 AuthContext: Роль guest или нет роли - редирект на /login');
              window.location.href = '/login';
              return;
            }
            
            setUserRole(role as UserRole);
            setIsLoading(false);
          }
        } 
        else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Токен обновлен');
          if (session) {
            setSession(session);
            setUser(session.user);
            const role = (session.user as any).user_metadata?.role ||
              (session.user as any).app_metadata?.role ||
              'student';
            setUserRole(role as UserRole);
          }
          setIsLoading(false);
        }
        else if (event === 'INITIAL_SESSION') {
          console.log('🔄 INITIAL_SESSION event');
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        isLoading,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

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
    let isFirstLoad = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

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

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession) {
          const role = (initialSession.user as any).user_metadata?.role ||
            (initialSession.user as any).app_metadata?.role ||
            'student';
          console.log('✅ AuthContext: Роль из JWT:', role);
          setUserRole(role as UserRole);
        }

        setIsLoading(false);
        setIsInitialized(true);
        isFirstLoad = false;

      } catch (error) {
        console.error('❌ AuthContext: Исключение при инициализации', error);
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
          isFirstLoad = false;
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('🔐 Auth event:', event);

        // Игнорируем события при первой загрузке - они обрабатываются в initAuth()
        if (isFirstLoad && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
          console.log('⏭️ Пропускаем событие при первой загрузке:', event);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setUserRole(null);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) {
            setSession(session);
            setUser(session.user);
            const role = (session.user as any).user_metadata?.role ||
              (session.user as any).app_metadata?.role ||
              'student';
            setUserRole(role as UserRole);
          }
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


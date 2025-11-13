import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: 'admin' | 'student' | 'curator' | 'tech_support' | null;
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

  // 🔑 Извлечь роль из session
  const extractRole = (session: Session | null): string | null => {
    if (!session?.user) return null;
    
    // Приоритет 1: user_metadata (Supabase)
    if ((session.user as any).user_metadata?.role) {
      return (session.user as any).user_metadata.role;
    }
    
    // Приоритет 2: app_metadata
    if ((session.user as any).app_metadata?.role) {
      return (session.user as any).app_metadata.role;
    }
    
    // Приоритет 3: Парсим JWT токен
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      if (payload.user_role) {
        return payload.user_role;
      }
    } catch (e) {
      console.warn('⚠️ Не удалось распарсить JWT:', e);
    }
    
    return null;
  };

  // 🔄 Обновить состояние из сессии
  const updateAuthState = (session: Session | null) => {
    if (session) {
      console.log('✅ Сессия активна:', session.user.email);
      
      setSession(session);
      setUser(session.user);
      
      const role = extractRole(session);
      console.log('👤 Роль пользователя:', role || 'НЕ ОПРЕДЕЛЕНА');
      setUserRole(role);
      
      // 🔑 Сохраняем JWT токен для API запросов
      if (session.access_token) {
        localStorage.setItem('supabase_token', session.access_token);
        console.log('🔑 JWT токен сохранён для API запросов');
      }
    } else {
      console.log('❌ Сессия отсутствует');
      setSession(null);
      setUser(null);
      setUserRole(null);
      
      // 🔑 Удаляем JWT токен при выходе
      localStorage.removeItem('supabase_token');
    }
    
    // 🔥 ИСПРАВЛЕНИЕ: ВСЕГДА устанавливаем флаги в updateAuthState
    // Т.к. эта функция вызывается и из initializeAuth и из onAuthStateChange
    setIsInitialized(true);
    setIsLoading(false);
  };

  useEffect(() => {
    console.log('🔐 AuthContext: Инициализация...');
    console.log('📦 localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('sb-')));
    
    let isMounted = true;
    
    // КРИТИЧНО: БЛОКИРУЕМ РЕНДЕР до завершения getSession() С ТАЙМАУТОМ!
    const initializeAuth = async () => {
      try {
        console.log('🔄 Вызываем getSession() с таймаутом 5 секунд...');
        
        // 🔥 ИСПРАВЛЕНИЕ: Promise.race с 5-секундным таймаутом
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('getSession timeout')), 5000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session: initialSession }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as Awaited<typeof sessionPromise>;
        
        if (!isMounted) {
          console.log('⚠️ Компонент размонтирован, прерываем');
          return;
        }
        
        if (error) {
          console.error('❌ Ошибка getSession():', error);
        }
        
        console.log('📦 getSession() завершён, результат:', initialSession ? '✅ Сессия найдена' : '❌ Сессии нет');
        
        if (initialSession) {
          console.log('👤 Email:', initialSession.user.email);
          console.log('🔑 Token (первые 20 символов):', initialSession.access_token.substring(0, 20) + '...');
          console.log('⏰ Token expires:', new Date(initialSession.expires_at! * 1000).toLocaleString());
        } else {
          console.log('ℹ️ Это нормально для первого визита (не залогинены)');
        }
        
        updateAuthState(initialSession);
        
      } catch (error: any) {
        if (!isMounted) return;
        
        console.error('❌ Исключение в getSession():', error);
        
        // 🔥 КРИТИЧНО: ВСЕГДА вызываем updateAuthState(null) при ошибке!
        // Иначе session/user останутся undefined → бесконечная загрузка!
        console.log('🔧 Устанавливаем session = null из-за ошибки');
        updateAuthState(null);
        
        // 🔥 ИСПРАВЛЕНИЕ: Если таймаут - пробуем использовать fallback из localStorage
        if (error.message === 'getSession timeout') {
          console.warn('⏱️ ТАЙМАУТ getSession()! Используем fallback...');
          
          // Пробуем прочитать сессию из localStorage напрямую
          const storedSession = localStorage.getItem('sb-arqhkacellqbhjhbebfh-auth-token');
          if (storedSession) {
            console.log('📦 Найдена сессия в localStorage, парсим...');
            try {
              const parsedSession = JSON.parse(storedSession);
              if (parsedSession && parsedSession.access_token) {
                console.log('✅ Сессия восстановлена из localStorage');
                // НЕ используем её напрямую, просто показываем форму логина
              }
            } catch (e) {
              console.warn('⚠️ Не удалось распарсить сессию из localStorage');
            }
          }
        }
        
        // 🔥 ИСПРАВЛЕНИЕ: finally НЕ НУЖЕН! updateAuthState всегда вызывается (в try и в catch)
        // и сам устанавливает isInitialized/isLoading
      }
    };
    
    initializeAuth();
    
    // Подписываемся на изменения (БЕЗ async внутри callback!)
    console.log('📡 Подписываемся на onAuthStateChange()...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        
        console.log('🔐 Auth event:', event);
        
        if (event === 'SIGNED_IN') {
          console.log('✅ SIGNED_IN:', newSession?.user.email);
          updateAuthState(newSession);
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 SIGNED_OUT');
          updateAuthState(null);
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 TOKEN_REFRESHED');
          updateAuthState(newSession);
        } else if (event === 'INITIAL_SESSION') {
          console.log('🎬 INITIAL_SESSION');
          updateAuthState(newSession);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      console.log('🧹 AuthContext: Cleanup');
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    userRole: userRole as any,
    isInitialized,
    isLoading,
  };

  console.log('📊 AuthContext render:', {
    isInitialized,
    isLoading,
    hasSession: !!session,
    hasUser: !!user,
    userRole,
  });

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

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { safeJSONParse, safeJSONStringify, safeSessionStorage } from '@/utils/error-recovery';

// 🔒 Security: Логи ТОЛЬКО в development
const isDev = import.meta.env.DEV;
const devLog = (...args: any[]) => isDev && console.log(...args);
const devWarn = (...args: any[]) => isDev && console.warn(...args);
const devError = (...args: any[]) => {
  if (isDev) {
    console.error(...args);
  } else {
    console.error(`Auth Error: ERR-${Date.now()}`);
  }
};

// ✅ Расширенный тип User с данными из profiles
interface ExtendedUser extends User {
  full_name?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  current_streak?: number;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  userRole: 'admin' | 'student' | 'curator' | 'tech_support' | null;
  isInitialized: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🔥 THROTTLE для TOKEN_REFRESHED (защита от 429)
  const lastRefreshTime = useRef<number>(0);
  const MIN_REFRESH_INTERVAL = 10000; // 10 секунд между обновлениями

  // 🔇 Отключаем логи на публичных страницах (лендинг, логин, сертификаты)
  const isPublicPage = typeof window !== 'undefined' && (
    window.location.pathname === '/expresscourse' ||
    window.location.pathname.startsWith('/expresscourse/') ||
    window.location.pathname === '/login' ||
    window.location.pathname.startsWith('/certificate/')
  );
  
  // Утилита для логирования (только если не публичная страница)
  const log = (...args: any[]) => {
    if (!isPublicPage) {
      console.log(...args);
    }
  };

  // 📋 Загрузить данные профиля из profiles (С КЭШЕМ И TTL!)
  const loadUserProfile = async (userId: string, forceRefresh = false): Promise<ExtendedUser | null> => {
    try {
      const cacheKey = `profile_${userId}`;
      const cacheTimeKey = `profile_${userId}_time`;
      const CACHE_TTL = 5 * 60 * 1000; // 5 минут

      // ⚡ Проверяем кэш (если не принудительное обновление)
      if (!forceRefresh) {
        const cached = safeSessionStorage.getItem(cacheKey);
        const cacheTimeStr = safeSessionStorage.getItem(cacheTimeKey);
        
        if (cached && cacheTimeStr) {
          const cacheTime = parseInt(cacheTimeStr, 10);
          const age = Date.now() - cacheTime;
          
          if (age < CACHE_TTL) {
            const profile = safeJSONParse(cached, null);
            if (profile) {
            console.log(`⚡ Профиль из кэша (${Math.round(age / 1000)}s):`, profile.full_name);
            return profile;
            }
          } else {
            console.log('🔄 Кэш устарел, обновляем...');
          }
        }
      }

      // 📡 Загружаем из БД (КРИТИЧНО: включаем role!)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, level, xp, current_streak, longest_streak, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('⚠️ Не удалось загрузить профиль:', error);
        return null;
      }

      // ⚡ Сохраняем в кэш с временной меткой (безопасно)
      const profileJson = safeJSONStringify(profile);
      safeSessionStorage.setItem(cacheKey, profileJson);
      safeSessionStorage.setItem(cacheTimeKey, Date.now().toString());
      console.log('✅ Профиль загружен и закэширован:', profile.full_name);
      return profile;
    } catch (error) {
      console.error('❌ Ошибка загрузки профиля:', error);
      return null;
    }
  };

  // 🗑️ Очистить кэш профиля (для обновлений)
  const clearProfileCache = (userId: string) => {
    safeSessionStorage.removeItem(`profile_${userId}`);
    safeSessionStorage.removeItem(`profile_${userId}_time`);
    console.log('🗑️ Кэш профиля очищен');
  };

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
    
    // Приоритет 3: Парсим JWT токен (безопасно)
    try {
      const tokenParts = session.access_token.split('.');
      if (tokenParts.length === 3) {
        const payloadBase64 = tokenParts[1];
        const payloadJson = atob(payloadBase64);
        const payload = safeJSONParse(payloadJson, {});
        
      if (payload.user_role) {
        return payload.user_role;
        }
      }
    } catch (e) {
      console.warn('⚠️ Не удалось распарсить JWT:', e);
    }
    
    return null;
  };

  // 🔄 Обновить состояние из сессии
  const updateAuthState = async (session: Session | null) => {
    if (session) {
      // Validate token expiration
      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        console.error('🚨 AuthContext: Токен истек, очищаем сессию');
        localStorage.removeItem('supabase_token');
        localStorage.removeItem('sb-arqhkacellqbhjhbebfh-auth-token');
        setSession(null);
        setUser(null);
        setUserRole(null);
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Сессия активна:', session.user.email);
      
      setSession(session);
      
      // 📋 Загружаем данные профиля
      const profile = await loadUserProfile(session.user.id);
      const extendedUser: ExtendedUser = {
        ...session.user,
        ...profile,
      };
      
      setUser(extendedUser);
      console.log('👤 Пользователь:', extendedUser.full_name || extendedUser.email);
      
      // 🔑 Извлекаем роль (приоритет: профиль -> session metadata -> JWT)
      let role = profile?.role || extractRole(session);
      console.log('👤 Роль пользователя:', role || 'НЕ ОПРЕДЕЛЕНА');
      setUserRole(role);
      
      // 🔑 Сохраняем JWT токен для API запросов
      if (session.access_token) {
        localStorage.setItem('supabase_token', session.access_token);
        console.log('🔑 JWT токен сохранён для API запросов');
      }
    } else {
      console.log('❌ Сессия отсутствует - очищаем состояние');
      setSession(null);
      setUser(null);
      setUserRole(null);
      
      // 🔑 Удаляем JWT токен при выходе (безопасно)
      try {
      localStorage.removeItem('supabase_token');
      } catch (e) {
        console.warn('⚠️ Failed to remove token from localStorage');
      }
    }
    
    // 🔥 ИСПРАВЛЕНИЕ: ВСЕГДА устанавливаем флаги в updateAuthState
    // Т.к. эта функция вызывается и из initializeAuth и из onAuthStateChange
    setIsInitialized(true);
    setIsLoading(false);
    
    console.log('📊 AuthContext: updateAuthState завершён', {
      hasSession: !!session,
      hasUser: session ? true : false,
      isInitialized: true,
      isLoading: false,
    });
  };

  useEffect(() => {
    console.log('🔐 AuthContext: Инициализация...');
    
    // Безопасное чтение localStorage keys
    try {
    console.log('📦 localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('sb-')));
    } catch (e) {
      console.warn('⚠️ localStorage недоступен');
    }
    
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
          // 🔥 ОБРАБОТКА 429: не пытаемся retry, просто используем текущее состояние
          if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
            console.error('🚨 RATE LIMIT (429)! Используем текущее состояние сессии из памяти.');
            await updateAuthState(null); // Безопасно устанавливаем null
            return;
          }
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
        
        await updateAuthState(initialSession);
        
      } catch (error: any) {
        if (!isMounted) return;
        
        console.error('❌ Исключение в getSession():', error);
        
        // 🔥 КРИТИЧНО: ВСЕГДА вызываем updateAuthState(null) при ошибке!
        // Иначе session/user останутся undefined → бесконечная загрузка!
        console.log('🔧 Устанавливаем session = null из-за ошибки');
        await updateAuthState(null);
        
        // 🔥 ИСПРАВЛЕНИЕ: Если таймаут - пробуем использовать fallback из localStorage
        if (error.message === 'getSession timeout') {
          console.warn('⏱️ ТАЙМАУТ getSession()! Используем fallback...');
          
          // Пробуем прочитать сессию из localStorage напрямую (безопасно)
          try {
          const storedSession = localStorage.getItem('sb-arqhkacellqbhjhbebfh-auth-token');
          if (storedSession) {
            console.log('📦 Найдена сессия в localStorage, парсим...');
              const parsedSession = safeJSONParse(storedSession, null);
              if (parsedSession && parsedSession.access_token) {
                console.log('✅ Сессия восстановлена из localStorage');
                // НЕ используем её напрямую, просто показываем форму логина
              }
            }
          } catch (e) {
            console.warn('⚠️ Не удалось прочитать сессию из localStorage');
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
          updateAuthState(newSession); // ✅ В обработчике событий не нужен await
        } else if (event === 'SIGNED_OUT') {
          console.log('🚪 SIGNED_OUT');
          updateAuthState(null);
        } else if (event === 'TOKEN_REFRESHED') {
          // 🔥 THROTTLE: игнорируем слишком частые обновления
          const now = Date.now();
          const timeSinceLastRefresh = now - lastRefreshTime.current;
          
          if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
            console.warn(`⏱️ TOKEN_REFRESHED проигнорирован (прошло ${Math.round(timeSinceLastRefresh / 1000)}s, нужно ${MIN_REFRESH_INTERVAL / 1000}s)`);
            return;
          }
          
          console.log('🔄 TOKEN_REFRESHED (разрешено)');
          lastRefreshTime.current = now;
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

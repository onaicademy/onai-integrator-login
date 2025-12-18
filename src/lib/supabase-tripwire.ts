/**
 * Tripwire Supabase Client
 * 
 * ОТДЕЛЬНЫЙ инстанс Supabase для продукта Tripwire.
 * Использует собственную базу данных, изолированную от Main Platform.
 * 
 * Credentials:
 * - VITE_TRIPWIRE_SUPABASE_URL
 * - VITE_TRIPWIRE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { devLog } from './env-utils'
import { setupSupabaseReconnection } from '@/utils/error-recovery'

const tripwireUrl = import.meta.env.VITE_TRIPWIRE_SUPABASE_URL
const tripwireKey = import.meta.env.VITE_TRIPWIRE_SUPABASE_ANON_KEY

if (!tripwireUrl || !tripwireKey) {
  const missing: string[] = []
  if (!tripwireUrl) missing.push('VITE_TRIPWIRE_SUPABASE_URL')
  if (!tripwireKey) missing.push('VITE_TRIPWIRE_SUPABASE_ANON_KEY')

  console.error('❌ Tripwire Supabase credentials not found', { missing })
  throw new Error('Missing Tripwire Supabase environment variables')
}

devLog('✅ Tripwire Supabase config ready', {
  url: tripwireUrl,
  keyLength: tripwireKey.length,
  keyPreview: `${tripwireKey.slice(0, 6)}...${tripwireKey.slice(-4)}`
})

/**
 * Tripwire Supabase Client
 * 
 * ✅ Isolated from Main Platform
 * ✅ Separate auth.users table
 * ✅ Separate public.users table
 * ✅ Independent authentication
 */
export const tripwireSupabase = createClient(tripwireUrl, tripwireKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'sb-tripwire-auth-token', // 🔥 УНИКАЛЬНЫЙ ключ для Tripwire
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
})

// 🛡️ Setup reconnection handler для защиты от разрыва соединения
const cleanupTripwireReconnection = setupSupabaseReconnection(tripwireSupabase, {
  pingInterval: 60000, // Ping каждую минуту
  maxReconnectAttempts: 5,
  onReconnect: () => {
    console.log('✅ [Tripwire Supabase] Соединение восстановлено');
  },
  onReconnectFailed: () => {
    console.error('❌ [Tripwire Supabase] Не удалось восстановить соединение');
    // Перенаправляем на логин Integrator
    window.location.href = '/integrator/login';
  }
});

// Экспортируем cleanup функцию
export const cleanupTripwireConnection = cleanupTripwireReconnection;

// Event listener для логирования
tripwireSupabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    devLog('✅ Tripwire: Пользователь вошёл в систему', session.user.email)
    
    // Сохраняем JWT токен для API запросов (с префиксом tripwire) (безопасно)
    if (session.access_token) {
      try {
        localStorage.setItem('tripwire_supabase_token', session.access_token)
        devLog('🔑 Tripwire JWT токен сохранён')
      } catch (e) {
        console.warn('⚠️ Failed to save Tripwire token to localStorage');
      }
    }
  }

  if (event === 'SIGNED_OUT') {
    devLog('👋 Tripwire: Пользователь вышел из системы')
    
    try {
      localStorage.removeItem('tripwire_supabase_token')
    } catch (e) {
      console.warn('⚠️ Failed to remove Tripwire token from localStorage');
    }
  }
})

devLog('🚀 Tripwire Supabase client initialized')


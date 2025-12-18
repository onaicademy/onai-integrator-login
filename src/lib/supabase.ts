import { createClient } from '@supabase/supabase-js'
import { devLog } from './env-utils'
import { setupSupabaseReconnection } from '@/utils/error-recovery'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  const missing: string[] = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY')

  console.error('❌ Supabase credentials not found', { missing })
  throw new Error('Missing Supabase environment variables')
}

devLog('✅ Supabase config ready', {
  url: supabaseUrl,
  keyLength: supabaseKey.length,
  keyPreview: `${supabaseKey.slice(0, 6)}...${supabaseKey.slice(-4)}`
})

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'sb-main-auth-token' // ✅ Уникальный ключ для Main Platform
  }
})

// 🛡️ Setup reconnection handler для защиты от разрыва соединения после простоя
const cleanupReconnection = setupSupabaseReconnection(supabase, {
  pingInterval: 60000, // Ping каждую минуту
  maxReconnectAttempts: 5,
  onReconnect: () => {
    console.log('✅ [Main Supabase] Соединение восстановлено');
  },
  onReconnectFailed: () => {
    console.error('❌ [Main Supabase] Не удалось восстановить соединение, перенаправление на логин...');
    // Перенаправляем на логин при неудаче
    window.location.href = '/login';
  }
});

// Экспортируем cleanup функцию для тестов/hot reload
export const cleanupSupabaseConnection = cleanupReconnection;

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    devLog('✅ Пользователь вошёл в систему', session.user.email)
    
    // Сохраняем JWT токен для использования в API запросах (безопасно)
    if (session.access_token) {
      try {
      localStorage.setItem('supabase_token', session.access_token)
      devLog('🔑 JWT токен сохранён в localStorage')
      } catch (e) {
        console.warn('⚠️ Failed to save token to localStorage');
      }
    }
    
    // TODO: Обновление профиля теперь будет через Backend API
    // Backend сам обновит updated_at при получении запроса с JWT токеном
    // Endpoint: POST /api/profiles/update-last-login
  }

  if (event === 'SIGNED_OUT') {
    devLog('👋 Пользователь вышел из системы')
    
    // Удаляем токен при выходе (безопасно)
    try {
    localStorage.removeItem('supabase_token')
    } catch (e) {
      console.warn('⚠️ Failed to remove token from localStorage');
    }
  }
})


import { createClient } from '@supabase/supabase-js'
import { devLog } from './env-utils'

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

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    devLog('✅ Пользователь вошёл в систему', session.user.email)
    
    // Сохраняем JWT токен для использования в API запросах
    if (session.access_token) {
      localStorage.setItem('supabase_token', session.access_token)
      devLog('🔑 JWT токен сохранён в localStorage')
    }
    
    // TODO: Обновление профиля теперь будет через Backend API
    // Backend сам обновит updated_at при получении запроса с JWT токеном
    // Endpoint: POST /api/profiles/update-last-login
  }

  if (event === 'SIGNED_OUT') {
    devLog('👋 Пользователь вышел из системы')
    
    // Удаляем токен при выходе
    localStorage.removeItem('supabase_token')
  }
})


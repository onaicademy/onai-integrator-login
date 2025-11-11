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
    storage: window.localStorage
    // НЕ УКАЗЫВАЕМ storageKey - пусть Supabase использует дефолтный!
  }
})

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    devLog('✅ Пользователь вошёл в систему', session.user.email)
    
    // Обновляем last_login_at только если эта колонка существует
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', session.user.id)

      if (error && !error.message.includes('last_login_at')) {
        devLog('⚠️ Не удалось обновить профиль', error.message)
      }
    } catch (err) {
      // Игнорируем ошибки обновления - это не критично
    }
  }

  if (event === 'SIGNED_OUT') {
    devLog('👋 Пользователь вышел из системы')
  }
})


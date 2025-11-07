import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Поддерживаем оба варианта названия ключа для совместимости
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// 🔍 ДИАГНОСТИКА: Проверяем ВСЕ переменные окружения
console.group('🔍 SUPABASE ДИАГНОСТИКА')
console.log('Все VITE переменные:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.substring(0, 30) + '...',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 30) + '...',
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
})

// Проверка что переменные загружены
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found!', {
    url: supabaseUrl,
    keyExists: !!supabaseKey,
    keyLength: supabaseKey?.length
  })
  console.groupEnd()
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Supabase config:', {
  url: supabaseUrl,
  keyLength: supabaseKey?.length,
  keyPreview: supabaseKey?.substring(0, 30) + '...',
  keyFull: supabaseKey
})
console.groupEnd()

// Создаем клиент с явной передачей API key в headers
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }
})

// Listen for auth state changes and sync user to database
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    const { id, email, user_metadata } = session.user
    
    // Create or update user in users table
    const { error } = await supabase.from('users').upsert({
      id,
      email,
      full_name: user_metadata.full_name || user_metadata.name || '',
      avatar_url: user_metadata.avatar_url || user_metadata.picture || '',
      created_at: new Date().toISOString(),
    }, {
      onConflict: 'id'
    })
    
    if (error) {
      console.error('❌ Ошибка при синхронизации user:', error)
    } else {
      console.log('✅ Пользователь синхронизирован с таблицей users')
    }
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 Пользователь вышел из системы')
  }
})


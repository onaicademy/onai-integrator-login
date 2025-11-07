import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Проверка что переменные загружены
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found!', {
    url: supabaseUrl,
    keyExists: !!supabaseKey
  })
  throw new Error('Missing Supabase environment variables')
}

console.log('✅ Supabase initialized:', {
  url: supabaseUrl,
  keyLength: supabaseKey?.length
})

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
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


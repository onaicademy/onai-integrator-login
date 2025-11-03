import { createClient } from '@supabase/supabase-js'
import { setSession } from '@/store/session'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Initialize session store (non-blocking)
supabase.auth.getSession().then(({ data }) => setSession(data?.session ?? null))

// Listen for auth state changes and sync user to database
supabase.auth.onAuthStateChange(async (event, session) => {
  setSession(session)
  
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


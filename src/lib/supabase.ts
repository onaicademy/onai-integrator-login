import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, xp')
      .eq('id', id)
      .single()
    
    const isNewUser = !existingUser
    
    // Create or update user in users table
    const { error } = await supabase.from('users').upsert({
      id,
      email,
      full_name: user_metadata.full_name || user_metadata.name || '',
      avatar_url: user_metadata.avatar_url || user_metadata.picture || '',
      created_at: new Date().toISOString(),
      // Set initial XP and level for new users
      xp: isNewUser ? 100 : (existingUser?.xp || 0),
      level: 1,
    }, {
      onConflict: 'id'
    })
    
    if (error) {
      console.error('❌ Ошибка при синхронизации user:', error)
    } else {
      console.log('✅ Пользователь синхронизирован с таблицей users')
      
      // Log activity and XP events
      if (isNewUser) {
        // Welcome bonus for new user
        await supabase.from('user_activity').insert({
          user_id: id,
          action: 'add_xp',
          meta: { reason: 'welcome_bonus', points: 100, new_xp: 100 },
          created_at: new Date().toISOString(),
        })
        console.log('🎉 Welcome bonus: +100 XP for new user')
      }
      
      // Daily login bonus
      await supabase.from('user_activity').insert({
        user_id: id,
        action: 'daily_login',
        meta: { timestamp: new Date().toISOString() },
        created_at: new Date().toISOString(),
      })
      console.log('📅 Daily login logged')
    }
  }
  
  if (event === 'SIGNED_OUT') {
    console.log('👋 Пользователь вышел из системы')
  }
})


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
    
    // Create or update user in users table
    await supabase.from('users').upsert({
      id,
      email,
      full_name: user_metadata.full_name || user_metadata.name,
      avatar_url: user_metadata.avatar_url || user_metadata.picture,
    }, {
      onConflict: 'id'
    })
    
    console.log('User synced to database:', { id, email })
  }
})


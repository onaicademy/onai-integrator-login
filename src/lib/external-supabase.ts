import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arqhkacellqbhjhbebfh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycWhrYWNlbGxxYmhqaGJlYmZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzg1OTUsImV4cCI6MjA3Nzc1NDU5NX0.K1jwLnm4y7e3AbQQIsl2soFMMtcFCJtEEy_xIOSTums'

export const externalSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
})

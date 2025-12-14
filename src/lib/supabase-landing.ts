/**
 * Landing Supabase Client
 * 
 * ОТДЕЛЬНЫЙ инстанс Supabase для Landing Page Leads (новая база данных).
 * Используется для хранения лидов с лендинга /expresscourse.
 * 
 * Credentials:
 * - VITE_LANDING_SUPABASE_URL
 * - VITE_LANDING_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { devLog } from './env-utils'

// ✅ SINGLETON: Create client only once
let landingSupabaseInstance: SupabaseClient | null = null

export function getLandingSupabase(): SupabaseClient | null {
  // Return existing instance if already created
  if (landingSupabaseInstance) {
    return landingSupabaseInstance
  }

  const landingUrl = import.meta.env.VITE_LANDING_SUPABASE_URL
  const landingKey = import.meta.env.VITE_LANDING_SUPABASE_ANON_KEY
  
  // Only create client if env vars exist
  if (!landingUrl || !landingKey) {
    console.warn('⚠️ Landing Supabase env vars not found')
    return null
  }

  devLog('✅ Landing Supabase config ready', {
    url: landingUrl,
    keyLength: landingKey.length,
    keyPreview: `${landingKey.slice(0, 6)}...${landingKey.slice(-4)}`
  })

  /**
   * Landing Supabase Client
   * 
   * ✅ Isolated from Main Platform and Tripwire
   * ✅ Separate database for landing leads
   * ✅ Independent authentication
   */
  landingSupabaseInstance = createClient(landingUrl, landingKey, {
    auth: {
      autoRefreshToken: false, // ✅ No auth needed for landing DB (service role only)
      persistSession: false,
      detectSessionInUrl: false,
      // ✅ UNIQUE storage key to avoid conflicts
      storageKey: 'sb-landing-auth-token',
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

  devLog('🚀 Landing Supabase client initialized')

  return landingSupabaseInstance
}

/**
 * Export singleton instance
 * Use this in components instead of creating new clients
 */
export const landingSupabase = getLandingSupabase()

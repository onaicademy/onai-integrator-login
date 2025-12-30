/**
 * 🚀 UNIFIED SUPABASE MANAGER
 * 
 * Решает проблему Multiple GoTrueClient warnings
 * Управляет ОДНИМ auth state для ВСЕХ Supabase клиентов
 * 
 * Problems fixed:
 * - ❌ BEFORE: 3 separate clients with 3 auth managers = CHAOS
 * - ✅ AFTER: 1 auth manager + 3 data clients = CLEAN
 */

import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { devLog } from './env-utils';
import { setupSupabaseReconnection } from '@/utils/error-recovery';
import { getRuntimeConfig } from './runtime-config';

interface SupabaseClients {
  main: SupabaseClient;     // Main platform (with auth)
  tripwire: SupabaseClient;  // Tripwire (data only)
  landing: SupabaseClient;   // Landing (data only)
}

// Singleton instances
let clients: SupabaseClients | null = null;
let authSession: Session | null = null;
let authUnsubscribe: (() => void) | null = null;
let tripwireAuthUnsubscribe: (() => void) | null = null;

const TRIPWIRE_SESSION_STORAGE_KEY = 'tripwire_supabase_session';

type StoredTripwireSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

const createMemoryStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
};

const tripwireMemoryStorage = createMemoryStorage();

const readStoredTripwireSession = (): StoredTripwireSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(TRIPWIRE_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredTripwireSession;
    if (!parsed?.access_token || !parsed?.refresh_token) {
      return null;
    }
    if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) {
      window.localStorage.removeItem(TRIPWIRE_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('⚠️ [Supabase Manager] Failed to parse stored Tripwire session');
    return null;
  }
};

const restoreTripwireSession = async (client: SupabaseClient) => {
  const stored = readStoredTripwireSession();
  if (!stored) return;

  const { error } = await client.auth.setSession({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
  });

  if (error) {
    console.warn('⚠️ [Supabase Manager] Tripwire session restore failed:', error.message);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TRIPWIRE_SESSION_STORAGE_KEY);
    }
  }
};

const persistTripwireSession = (session: Session | null) => {
  if (typeof window === 'undefined') return;

  if (session?.access_token && session.refresh_token) {
    window.localStorage.setItem('tripwire_supabase_token', session.access_token);
    window.localStorage.setItem(TRIPWIRE_SESSION_STORAGE_KEY, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
    }));
    return;
  }

  window.localStorage.removeItem('tripwire_supabase_token');
  window.localStorage.removeItem(TRIPWIRE_SESSION_STORAGE_KEY);
};

/**
 * Initialize all Supabase clients with unified auth
 * 
 * CALL THIS ONLY ONCE at app startup!
 */
export async function initializeSupabase(): Promise<SupabaseClients> {
  if (clients) {
    devLog('[Supabase Manager] Clients already initialized, returning cached');
    return clients;
  }

  console.log('🚀 [Supabase Manager] Initializing unified client manager...');
  const runtimeConfig = getRuntimeConfig();

  // ═══════════════════════════════════════════════════════════════
  // PRIMARY CLIENT (MAIN PLATFORM) - With Auth
  // ═══════════════════════════════════════════════════════════════
  
  const mainUrl = runtimeConfig.supabaseUrl;
  const mainKey = runtimeConfig.supabaseAnonKey || runtimeConfig.supabasePublishableKey;

  if (!mainUrl || !mainKey) {
    throw new Error('[Supabase Manager] Main Supabase credentials not found');
  }

  const mainClient = createClient(mainUrl, mainKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'sb-unified-auth-token', // 🔥 Single key for all!
      flowType: 'pkce',
    },
    global: {
      headers: {
        'x-client-info': 'onai-main-platform', // Suppress multiple instances warning
      },
    },
  });

  devLog('[Supabase Manager] ✅ Main client created (with auth)');

  // ═══════════════════════════════════════════════════════════════
  // TRIPWIRE CLIENT - WITH AUTH (separate database, separate auth)
  // ═══════════════════════════════════════════════════════════════

  const tripwireUrl = runtimeConfig.tripwireSupabaseUrl;
  const tripwireKey = runtimeConfig.tripwireSupabaseAnonKey;

  let tripwireClient: SupabaseClient;

  if (tripwireUrl && tripwireKey) {
    tripwireClient = createClient(tripwireUrl, tripwireKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // Manual persistence to avoid multiple GoTrueClient warnings
        detectSessionInUrl: true,
        storage: tripwireMemoryStorage,
        storageKey: 'sb-tripwire-auth-memory',
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-client-info': 'onai-tripwire-integrator',
        },
      },
    });
    devLog('[Supabase Manager] ✅ Tripwire client created (manual session persistence)');
  } else {
    console.warn('[Supabase Manager] ⚠️ Tripwire credentials not found, using mock');
    tripwireClient = mainClient; // Fallback to main
  }

  // ═══════════════════════════════════════════════════════════════
  // LANDING CLIENT - Data only, NO AUTH
  // ═══════════════════════════════════════════════════════════════
  
  const landingUrl = runtimeConfig.landingSupabaseUrl;
  const landingKey = runtimeConfig.landingSupabaseAnonKey;

  let landingClient: SupabaseClient;

  if (landingUrl && landingKey) {
    landingClient = createClient(landingUrl, landingKey, {
      auth: {
        persistSession: false, // ✅ Disable auth on data clients
        autoRefreshToken: false,
      },
    });
    devLog('[Supabase Manager] ✅ Landing client created (data only)');
  } else {
    console.warn('[Supabase Manager] ⚠️ Landing credentials not found, using mock');
    landingClient = mainClient; // Fallback to main
  }

  // ═══════════════════════════════════════════════════════════════
  // STORE IN SINGLETON
  // ═══════════════════════════════════════════════════════════════
  
  clients = {
    main: mainClient,
    tripwire: tripwireClient,
    landing: landingClient,
  };

  if (tripwireClient && tripwireClient !== mainClient) {
    await restoreTripwireSession(tripwireClient);

    if (!tripwireAuthUnsubscribe) {
      const { data } = tripwireClient.auth.onAuthStateChange((_event, session) => {
        persistTripwireSession(session);
      });
      tripwireAuthUnsubscribe = () => {
        data?.subscription.unsubscribe();
      };
    }
  }

  console.log('✅ [Supabase Manager] All clients initialized (unified auth)');

  // Setup SINGLE auth state listener
  setupAuthStateListener();

  // Setup reconnection handler for main client only
  setupSupabaseReconnection(mainClient, {
    pingInterval: 60000,
    maxReconnectAttempts: 5,
    onReconnect: () => {
      console.log('✅ [Supabase Manager] Connection restored');
    },
    onReconnectFailed: () => {
      console.error('❌ [Supabase Manager] Connection failed, redirecting to login');
      window.location.href = '/login';
    },
  });

  return clients;
}

/**
 * Setup SINGLE auth state listener
 * 
 * Listen ONLY on primary auth client (main)
 * All other clients get token updates automatically
 */
function setupAuthStateListener() {
  if (!clients?.main) return;

  console.log('🎧 [Supabase Manager] Setting up unified auth listener...');

  // Listen to auth changes on MAIN client only
  const { data } = clients.main.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔔 [Auth Event] ${event}`, session?.user?.email || 'No user');

    authSession = session;

    if (session?.access_token) {
      // Update all data clients with same token
      updateDataClientsWithToken(session);

      // Save token for API requests
      try {
        localStorage.setItem('supabase_token', session.access_token);
        devLog('🔑 JWT token saved');
      } catch (e) {
        console.warn('⚠️ Failed to save token');
      }

      console.log('✅ [Auth] Token updated in all clients');
    } else {
      // Clear tokens
      try {
        localStorage.removeItem('supabase_token');
      } catch (e) {
        console.warn('⚠️ Failed to remove token');
      }

      console.log('❌ [Auth] Token cleared from all clients');
    }
  });

  authUnsubscribe = () => {
    data?.subscription.unsubscribe();
  };
}

/**
 * Update all data clients with current auth token
 *
 * This keeps all clients in sync with main auth
 *
 * NOTE: Tripwire has independent auth, so we don't sync it
 */
function updateDataClientsWithToken(session: Session) {
  if (!clients) return;

  const { access_token, refresh_token } = session;

  // Set auth header on all data clients
  // This allows them to make authenticated requests
  // without triggering their own auth state changes

  // 🚫 SKIP Tripwire - it has independent auth
  // if (clients.tripwire !== clients.main) {
  //   clients.tripwire.auth.setSession({ ... });
  // }

  if (clients.landing !== clients.main) {
    // @ts-ignore
    clients.landing.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });
    devLog('[Supabase Manager] Landing token updated');
  }
}

/**
 * Get all clients (must call initializeSupabase first!)
 */
export function getSupabaseClients(): SupabaseClients {
  if (!clients) {
    throw new Error('[Supabase Manager] Clients not initialized! Call initializeSupabase() first');
  }
  return clients;
}

/**
 * Get single client by name
 */
export function getSupabaseClient(name: 'main' | 'tripwire' | 'landing'): SupabaseClient {
  const all = getSupabaseClients();
  return all[name];
}

/**
 * Get current auth session
 */
export function getCurrentSession(): Session | null {
  return authSession;
}

/**
 * Get current auth token
 */
export function getAuthToken(): string | null {
  return authSession?.access_token || null;
}

/**
 * Logout from all clients
 */
export async function logoutFromAll() {
  if (!clients) return;

  console.log('👋 [Supabase Manager] Logging out from all clients...');

  // Sign out from primary auth client (main platform)
  if (clients.main) {
    await clients.main.auth.signOut();
  }

  // Sign out from Tripwire auth client (separate auth system)
  if (clients.tripwire && clients.tripwire !== clients.main) {
    await clients.tripwire.auth.signOut();
  }

  // Clear session
  authSession = null;

  // Clear ALL auth tokens
  try {
    localStorage.removeItem('supabase_token');
    localStorage.removeItem('tripwire_supabase_token');
    localStorage.removeItem('sb-unified-auth-token'); // Main auth
    localStorage.removeItem('sb-tripwire-auth-token'); // Tripwire auth
    localStorage.removeItem(TRIPWIRE_SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('⚠️ Failed to clear tokens');
  }

  console.log('✅ [Supabase Manager] Logged out from all clients');
}

/**
 * Cleanup function (for hot reload)
 */
export function cleanupSupabaseManager() {
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
  if (tripwireAuthUnsubscribe) {
    tripwireAuthUnsubscribe();
    tripwireAuthUnsubscribe = null;
  }
  
  clients = null;
  authSession = null;
  
  console.log('🧹 [Supabase Manager] Cleaned up');
}

// Export singleton instances for backward compatibility
export const supabase = { get: () => getSupabaseClient('main') };
export const tripwireSupabase = { get: () => getSupabaseClient('tripwire') };
export const landingSupabase = { get: () => getSupabaseClient('landing') };

export default {
  initializeSupabase,
  getSupabaseClients,
  getSupabaseClient,
  getCurrentSession,
  getAuthToken,
  logoutFromAll,
  cleanupSupabaseManager,
};

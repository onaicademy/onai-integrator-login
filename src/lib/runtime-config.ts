type RuntimeConfig = {
  apiUrl: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabasePublishableKey?: string;
  tripwireSupabaseUrl?: string;
  tripwireSupabaseAnonKey?: string;
  landingSupabaseUrl?: string;
  landingSupabaseAnonKey?: string;
  sentryDsn?: string;
  appVersion?: string;
  siteUrl?: string;
  timestamp?: string;
  missing?: string[];
};

const defaultApiUrl = import.meta.env.DEV
  ? 'http://localhost:3000'
  : 'https://api.onai.academy';

const normalizeApiUrl = (value?: string) => {
  if (!value) return defaultApiUrl;
  const trimmed = value.trim();
  if (!trimmed) return defaultApiUrl;
  const normalized = trimmed.replace(/\/+$/, '');
  return normalized.replace(/\/api$/i, '');
};

const buildFallbackConfig = (): RuntimeConfig => ({
  apiUrl: normalizeApiUrl(import.meta.env.VITE_API_URL || defaultApiUrl),
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  tripwireSupabaseUrl: import.meta.env.VITE_TRIPWIRE_SUPABASE_URL,
  tripwireSupabaseAnonKey: import.meta.env.VITE_TRIPWIRE_SUPABASE_ANON_KEY,
  landingSupabaseUrl: import.meta.env.VITE_LANDING_SUPABASE_URL,
  landingSupabaseAnonKey: import.meta.env.VITE_LANDING_SUPABASE_ANON_KEY,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN,
  appVersion: import.meta.env.VITE_APP_VERSION,
  siteUrl: import.meta.env.VITE_SITE_URL,
});

let runtimeConfig: RuntimeConfig = buildFallbackConfig();
let runtimeConfigLoaded = false;
const apiBaseForConfig = normalizeApiUrl(import.meta.env.VITE_API_URL || defaultApiUrl);

export async function initRuntimeConfig(): Promise<RuntimeConfig> {
  if (runtimeConfigLoaded) {
    return runtimeConfig;
  }

  const fallback = buildFallbackConfig();

  try {
    const configUrl = `${apiBaseForConfig}/api/config`;
    const response = await fetch(configUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const remote = (await response.json()) as RuntimeConfig;
    runtimeConfig = {
      ...fallback,
      ...remote,
      apiUrl: normalizeApiUrl(remote.apiUrl || fallback.apiUrl),
    };
  } catch (error) {
    runtimeConfig = fallback;
    console.warn('⚠️ Runtime config fetch failed, using build-time defaults');
    console.warn(error);
  }

  runtimeConfigLoaded = true;
  return runtimeConfig;
}

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig;
}

export function getApiBaseUrl(): string {
  return runtimeConfig.apiUrl;
}

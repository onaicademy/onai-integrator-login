import { Router, Request, Response } from 'express';

const router = Router();

type PublicConfig = {
  apiUrl?: string;
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
  timestamp: string;
  missing: string[];
};

const pick = (value?: string) => (value && value.trim().length > 0 ? value.trim() : undefined);

router.get('/config', (req: Request, res: Response) => {
  const forwardedHost = req.headers['x-forwarded-host'];
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.get('host');
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol;

  const apiUrl = host ? `${proto}://${host}` : pick(process.env.PUBLIC_API_URL || process.env.VITE_API_URL);

  const config: PublicConfig = {
    apiUrl,
    supabaseUrl: pick(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL),
    supabaseAnonKey: pick(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
    supabasePublishableKey: pick(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    tripwireSupabaseUrl: pick(process.env.VITE_TRIPWIRE_SUPABASE_URL || process.env.TRIPWIRE_SUPABASE_URL),
    tripwireSupabaseAnonKey: pick(process.env.VITE_TRIPWIRE_SUPABASE_ANON_KEY),
    landingSupabaseUrl: pick(process.env.VITE_LANDING_SUPABASE_URL || process.env.LANDING_SUPABASE_URL),
    landingSupabaseAnonKey: pick(process.env.VITE_LANDING_SUPABASE_ANON_KEY),
    sentryDsn: pick(process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN),
    appVersion: pick(process.env.VITE_APP_VERSION || process.env.APP_VERSION),
    siteUrl: pick(process.env.VITE_SITE_URL || process.env.SITE_URL),
    timestamp: new Date().toISOString(),
    missing: [],
  };

  const missing = Object.entries({
    apiUrl: config.apiUrl,
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    tripwireSupabaseUrl: config.tripwireSupabaseUrl,
    tripwireSupabaseAnonKey: config.tripwireSupabaseAnonKey,
    landingSupabaseUrl: config.landingSupabaseUrl,
    landingSupabaseAnonKey: config.landingSupabaseAnonKey,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  config.missing = missing;

  res.json(config);
});

export default router;

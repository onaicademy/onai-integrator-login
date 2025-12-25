// UTM Parameter Tracking System
import { v4 as uuidv4 } from 'uuid';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_id?: string;      // Facebook Ad ID
  fbclid?: string;      // Facebook Click ID
  gclid?: string;       // Google Click ID
  client_id?: string;   // Our unique client UUID
}

const UTM_STORAGE_KEY = 'utm_params';
const CLIENT_ID_KEY = 'onai_client_id';
const UTM_EXPIRY_DAYS = 30;

export function captureUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const utmParams: UTMParams = {};

  const keys: (keyof UTMParams)[] = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'utm_id',     // Facebook Ad ID from URL
    'fbclid',     // Facebook Click ID
    'gclid',      // Google Click ID
  ];

  keys.forEach((key) => {
    const value = params.get(key);
    if (value) utmParams[key] = value;
  });

  return utmParams;
}

export function storeUTMParams(params: UTMParams): void {
  if (typeof window === 'undefined') return;

  const existing = getStoredUTMParams();
  const merged = { ...existing, ...params };

  localStorage.setItem(
    UTM_STORAGE_KEY,
    JSON.stringify({
      params: merged,
      timestamp: Date.now(),
    })
  );
}

export function getStoredUTMParams(): UTMParams {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (!stored) return {};

    const { params, timestamp } = JSON.parse(stored);
    const expiryMs = UTM_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (Date.now() - timestamp > expiryMs) {
      localStorage.removeItem(UTM_STORAGE_KEY);
      return {};
    }

    return params;
  } catch {
    return {};
  }
}

/**
 * Generate or retrieve client_id (UUID)
 * This is the "Golden Thread" that tracks the user across sessions
 *
 * CROSS-DEVICE SUPPORT: Checks URL first (from SMS link), then LocalStorage
 */
export function getOrCreateClientId(): string {
  if (typeof window === 'undefined') return '';

  try {
    // PRIORITY 1: Check URL params (from SMS/Email links)
    const urlParams = new URLSearchParams(window.location.search);
    const clientIdFromUrl = urlParams.get('client_id');

    if (clientIdFromUrl) {
      // Save to LocalStorage for future pageviews on THIS device
      localStorage.setItem(CLIENT_ID_KEY, clientIdFromUrl);
      console.log('🆔 Client ID restored from URL:', clientIdFromUrl);
      return clientIdFromUrl;
    }

    // PRIORITY 2: Check LocalStorage (same device)
    let clientId = localStorage.getItem(CLIENT_ID_KEY);
    if (!clientId) {
      // PRIORITY 3: Generate new ID
      clientId = uuidv4();
      localStorage.setItem(CLIENT_ID_KEY, clientId);
      console.log('🆔 New client_id generated:', clientId);
    }
    return clientId;
  } catch {
    return '';
  }
}

/**
 * Get all UTM params including client_id
 * ⚡ PRIORITY: URL params → LocalStorage → Generated IDs
 * This is what forms should use to get complete tracking data
 * 
 * Cross-Device Support: URL parameters take precedence to enable
 * attribution across Desktop (ProfTest) → Mobile (Express) flows
 */
export function getAllUTMParams(): UTMParams {
  const stored = getStoredUTMParams();
  const url = captureUTMParams();
  const client_id = getOrCreateClientId();
  
  return { 
    ...stored,   // 1. Start with LocalStorage (fallback)
    ...url,      // 2. Override with URL params (highest priority)
    client_id    // 3. The Golden Thread (always present)
  };
}


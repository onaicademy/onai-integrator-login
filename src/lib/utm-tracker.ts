// UTM Parameter Tracking System
export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
}

const UTM_STORAGE_KEY = 'utm_params';
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
    'fbclid',
    'gclid',
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

export function getAllUTMParams(): UTMParams {
  const url = captureUTMParams();
  const stored = getStoredUTMParams();
  return { ...stored, ...url };
}


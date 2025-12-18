import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// AmoCRM OAuth configuration
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_CLIENT_ID = process.env.AMOCRM_CLIENT_ID || '';
const AMOCRM_CLIENT_SECRET = process.env.AMOCRM_CLIENT_SECRET || '';
const AMOCRM_REDIRECT_URI = process.env.AMOCRM_REDIRECT_URI || 'https://api.onai.academy/api/amocrm/callback';

const TOKEN_CACHE_FILE = path.join(__dirname, '../../data/amocrm-token-cache.json');

interface AmoCRMTokenCache {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number; // timestamp
  refreshed_at: number; // timestamp
}

// 🔄 Load cached tokens
function loadCachedTokens(): AmoCRMTokenCache | null {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const data = fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ [AmoCRM Token] Error loading cache:', error);
  }
  return null;
}

// 💾 Save tokens to cache
function saveTokensToCache(tokens: AmoCRMTokenCache) {
  try {
    const dir = path.dirname(TOKEN_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    console.log(`💾 [AmoCRM Token] Saved to cache (expires in ${Math.round((tokens.expires_at - Date.now()) / 3600000)} hours)`);
  } catch (error) {
    console.error('❌ [AmoCRM Token] Error saving cache:', error);
  }
}

// 🔑 Refresh access token using refresh_token
export async function refreshAmoCRMToken(refreshToken: string): Promise<AmoCRMTokenCache> {
  try {
    console.log('🔄 [AmoCRM Token] Refreshing access token...');
    
    if (!AMOCRM_CLIENT_ID || !AMOCRM_CLIENT_SECRET) {
      throw new Error('AMOCRM_CLIENT_ID or AMOCRM_CLIENT_SECRET not configured');
    }
    
    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/oauth2/access_token`,
      {
        client_id: AMOCRM_CLIENT_ID,
        client_secret: AMOCRM_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        redirect_uri: AMOCRM_REDIRECT_URI
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    const data = response.data;
    const expiresIn = data.expires_in || 86400; // Default 24 hours
    
    const tokenCache: AmoCRMTokenCache = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      token_type: data.token_type || 'Bearer',
      expires_at: Date.now() + (expiresIn * 1000),
      refreshed_at: Date.now()
    };
    
    // Save to cache
    saveTokensToCache(tokenCache);
    
    console.log(`✅ [AmoCRM Token] Token refreshed (expires in ${Math.round(expiresIn / 3600)} hours)`);
    
    return tokenCache;
  } catch (error: any) {
    console.error('❌ [AmoCRM Token] Refresh failed:', error.response?.data || error.message);
    throw error;
  }
}

// 🔍 Validate token
export async function validateAmoCRMToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/account`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      }
    );
    
    return !!response.data.id;
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('❌ [AmoCRM Token] Token invalid or expired');
      return false;
    }
    console.error('❌ [AmoCRM Token] Validation error:', error.message);
    return false;
  }
}

// 🎯 Get valid AmoCRM token (with auto-refresh)
export async function getValidAmoCRMToken(): Promise<string> {
  // 1. Check cached tokens
  const cached = loadCachedTokens();
  
  if (cached) {
    const now = Date.now();
    const hoursUntilExpire = Math.floor((cached.expires_at - now) / 3600000);
    
    // If token expires in more than 2 hours, use it
    if (hoursUntilExpire > 2) {
      console.log(`✅ [AmoCRM Token] Using cached token (expires in ${hoursUntilExpire} hours)`);
      return cached.access_token;
    }
    
    // Token expires soon, refresh proactively
    if (hoursUntilExpire > 0) {
      console.log(`⚠️ [AmoCRM Token] Token expires in ${hoursUntilExpire} hours, refreshing...`);
      try {
        const newTokens = await refreshAmoCRMToken(cached.refresh_token);
        return newTokens.access_token;
      } catch (error) {
        console.warn('⚠️ [AmoCRM Token] Refresh failed, using cached token');
        return cached.access_token;
      }
    }
    
    // Token expired, must refresh
    console.log('⏰ [AmoCRM Token] Token expired, refreshing...');
    try {
      const newTokens = await refreshAmoCRMToken(cached.refresh_token);
      return newTokens.access_token;
    } catch (error) {
      console.error('❌ [AmoCRM Token] Cannot refresh expired token');
      throw new Error('AmoCRM token expired and refresh failed');
    }
  }
  
  // 2. No cache, check environment variable
  const envToken = process.env.AMOCRM_ACCESS_TOKEN;
  
  if (!envToken) {
    throw new Error('AMOCRM_ACCESS_TOKEN not configured and no cached tokens');
  }
  
  // 3. Validate env token
  const isValid = await validateAmoCRMToken(envToken);
  
  if (!isValid) {
    throw new Error('AMOCRM_ACCESS_TOKEN is invalid or expired');
  }
  
  console.log('✅ [AmoCRM Token] Using env token (no refresh_token for auto-refresh)');
  
  // Try to get refresh token (if available in env)
  const refreshToken = process.env.AMOCRM_REFRESH_TOKEN;
  if (refreshToken) {
    try {
      const newTokens = await refreshAmoCRMToken(refreshToken);
      return newTokens.access_token;
    } catch (error) {
      console.warn('⚠️ [AmoCRM Token] Cannot refresh, using env token');
      return envToken;
    }
  }
  
  return envToken;
}

// 🔄 Auto-refresh if needed (run periodically)
export async function refreshAmoCRMTokenIfNeeded(): Promise<void> {
  try {
    console.log('🔄 [AmoCRM Token] Checking if refresh needed...');
    
    const cached = loadCachedTokens();
    
    if (!cached) {
      console.log('ℹ️ [AmoCRM Token] No cached tokens, will use env on next request');
      return;
    }
    
    const hoursUntilExpire = Math.floor((cached.expires_at - Date.now()) / 3600000);
    
    // Refresh proactively 2 hours before expiration
    if (hoursUntilExpire <= 2 && hoursUntilExpire > 0) {
      console.log(`🔄 [AmoCRM Token] Token expires in ${hoursUntilExpire} hours, refreshing proactively...`);
      await refreshAmoCRMToken(cached.refresh_token);
      console.log('✅ [AmoCRM Token] Proactive refresh complete');
    } else if (hoursUntilExpire > 2) {
      console.log(`✅ [AmoCRM Token] Token is fresh (${hoursUntilExpire} hours until expire)`);
    } else {
      console.log('⏰ [AmoCRM Token] Token expired, will refresh on next request');
      await refreshAmoCRMToken(cached.refresh_token);
    }
  } catch (error: any) {
    console.error('❌ [AmoCRM Token] Auto-refresh error:', error.message);
  }
}

// 📊 Get token status
export function getAmoCRMTokenStatus(): {
  hasCached: boolean;
  expiresAt?: string;
  hoursUntilExpire?: number;
  isValid: boolean;
} {
  const cached = loadCachedTokens();
  
  if (!cached) {
    return {
      hasCached: false,
      isValid: !!process.env.AMOCRM_ACCESS_TOKEN
    };
  }
  
  const hoursUntilExpire = Math.floor((cached.expires_at - Date.now()) / 3600000);
  
  return {
    hasCached: true,
    expiresAt: new Date(cached.expires_at).toISOString(),
    hoursUntilExpire,
    isValid: hoursUntilExpire > 0
  };
}

// 🆕 Initialize from existing tokens (for first setup)
export async function initializeFromEnv(): Promise<void> {
  try {
    const accessToken = process.env.AMOCRM_ACCESS_TOKEN;
    const refreshToken = process.env.AMOCRM_REFRESH_TOKEN;
    
    if (!accessToken || !refreshToken) {
      console.log('ℹ️ [AmoCRM Token] No tokens in env to initialize cache');
      return;
    }
    
    // Save to cache
    saveTokensToCache({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_at: Date.now() + (24 * 3600000), // Assume 24 hours
      refreshed_at: Date.now()
    });
    
    console.log('✅ [AmoCRM Token] Initialized cache from env');
  } catch (error) {
    console.error('❌ [AmoCRM Token] Initialization error:', error);
  }
}

console.log('✅ [AmoCRM Token Manager] Initialized');

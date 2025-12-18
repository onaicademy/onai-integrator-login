import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Facebook App credentials
const FB_APP_ID = process.env.FACEBOOK_APP_ID || ''; // Нужно добавить в .env
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || ''; // Нужно добавить в .env
const FB_API_VERSION = 'v21.0';
const TOKEN_CACHE_FILE = path.join(__dirname, '../../data/facebook-token-cache.json');

interface TokenCache {
  access_token: string;
  token_type: 'short' | 'long'; // short = 1 hour, long = 60 days
  expires_at?: number; // timestamp
  refreshed_at: number; // timestamp
}

// 🔄 Load cached token
function loadCachedToken(): TokenCache | null {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const data = fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('❌ [FB Token] Error loading cache:', error);
  }
  return null;
}

// 💾 Save token to cache
function saveTokenToCache(token: TokenCache) {
  try {
    const dir = path.dirname(TOKEN_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(token, null, 2), 'utf-8');
    console.log(`💾 [FB Token] Saved to cache (type: ${token.token_type})`);
  } catch (error) {
    console.error('❌ [FB Token] Error saving cache:', error);
  }
}

// 🔑 Exchange short-lived token for long-lived token (60 days)
export async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  try {
    console.log('🔄 [FB Token] Exchanging short-lived token for long-lived...');
    
    if (!FB_APP_ID || !FB_APP_SECRET) {
      throw new Error('FACEBOOK_APP_ID or FACEBOOK_APP_SECRET not configured');
    }
    
    const response = await axios.get(
      `https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: FB_APP_ID,
          client_secret: FB_APP_SECRET,
          fb_exchange_token: shortToken
        },
        timeout: 10000
      }
    );
    
    const longLivedToken = response.data.access_token;
    const expiresIn = response.data.expires_in; // seconds (usually 5184000 = 60 days)
    
    // Save to cache
    saveTokenToCache({
      access_token: longLivedToken,
      token_type: 'long',
      expires_at: Date.now() + (expiresIn * 1000),
      refreshed_at: Date.now()
    });
    
    console.log(`✅ [FB Token] Long-lived token obtained (expires in ${Math.round(expiresIn / 86400)} days)`);
    
    return longLivedToken;
  } catch (error: any) {
    console.error('❌ [FB Token] Exchange failed:', error.message);
    throw error;
  }
}

// 🔍 Check if token is valid
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/${FB_API_VERSION}/me`,
      {
        params: { access_token: token },
        timeout: 5000
      }
    );
    
    return !!response.data.id;
  } catch (error: any) {
    if (error.response?.status === 190) {
      console.error('❌ [FB Token] Token invalid or expired');
      return false;
    }
    console.error('❌ [FB Token] Validation error:', error.message);
    return false;
  }
}

// 🔄 Debug token info
export async function debugToken(token: string): Promise<any> {
  try {
    if (!FB_APP_ID) {
      throw new Error('FACEBOOK_APP_ID not configured');
    }
    
    const response = await axios.get(
      `https://graph.facebook.com/${FB_API_VERSION}/debug_token`,
      {
        params: {
          input_token: token,
          access_token: `${FB_APP_ID}|${FB_APP_SECRET}` // App token
        },
        timeout: 5000
      }
    );
    
    const data = response.data.data;
    
    console.log('🔍 [FB Token] Debug info:');
    console.log(`   Valid: ${data.is_valid}`);
    console.log(`   Expires at: ${data.expires_at ? new Date(data.expires_at * 1000).toLocaleString() : 'Never'}`);
    console.log(`   Scopes: ${data.scopes?.join(', ') || 'N/A'}`);
    console.log(`   Type: ${data.type}`);
    
    return data;
  } catch (error: any) {
    console.error('❌ [FB Token] Debug failed:', error.message);
    throw error;
  }
}

// 🎯 Get valid token (with auto-refresh)
export async function getValidFacebookToken(): Promise<string> {
  // 1. Check environment variable first
  const envToken = process.env.FACEBOOK_ADS_TOKEN;
  
  if (!envToken) {
    throw new Error('FACEBOOK_ADS_TOKEN not configured in environment');
  }
  
  // 2. Check cached token
  const cached = loadCachedToken();
  
  if (cached) {
    // Check if cached token is still valid (not expired)
    const now = Date.now();
    
    if (cached.token_type === 'long' && cached.expires_at) {
      // Long-lived token
      const daysUntilExpire = Math.floor((cached.expires_at - now) / (24 * 60 * 60 * 1000));
      
      if (daysUntilExpire > 7) {
        // Token is still fresh (> 7 days until expire)
        console.log(`✅ [FB Token] Using cached long-lived token (expires in ${daysUntilExpire} days)`);
        return cached.access_token;
      } else if (daysUntilExpire > 0) {
        // Token expires soon, try to refresh
        console.log(`⚠️ [FB Token] Cached token expires in ${daysUntilExpire} days, refreshing...`);
        try {
          return await exchangeForLongLivedToken(envToken);
        } catch (error) {
          console.warn('⚠️ [FB Token] Refresh failed, using cached token');
          return cached.access_token;
        }
      } else {
        // Token expired
        console.log('⏰ [FB Token] Cached token expired, exchanging...');
      }
    }
  }
  
  // 3. No valid cache, validate env token
  const isValid = await validateToken(envToken);
  
  if (!isValid) {
    throw new Error('FACEBOOK_ADS_TOKEN is invalid or expired. Please update it in .env');
  }
  
  // 4. Try to exchange for long-lived token
  try {
    if (FB_APP_ID && FB_APP_SECRET) {
      return await exchangeForLongLivedToken(envToken);
    } else {
      console.warn('⚠️ [FB Token] App credentials not configured, using env token');
      
      // Save env token to cache as-is
      saveTokenToCache({
        access_token: envToken,
        token_type: 'short',
        refreshed_at: Date.now()
      });
      
      return envToken;
    }
  } catch (error) {
    console.warn('⚠️ [FB Token] Exchange failed, using env token');
    return envToken;
  }
}

// 🔄 Auto-refresh scheduler (run periodically)
export async function refreshFacebookTokenIfNeeded(): Promise<void> {
  try {
    console.log('🔄 [FB Token] Checking if refresh needed...');
    
    const cached = loadCachedToken();
    
    if (!cached) {
      console.log('ℹ️ [FB Token] No cached token, will use env on next request');
      return;
    }
    
    // Check expiration
    if (cached.token_type === 'long' && cached.expires_at) {
      const daysUntilExpire = Math.floor((cached.expires_at - Date.now()) / (24 * 60 * 60 * 1000));
      
      if (daysUntilExpire <= 7 && daysUntilExpire > 0) {
        // Expires soon, refresh proactively
        console.log(`🔄 [FB Token] Token expires in ${daysUntilExpire} days, refreshing...`);
        
        const envToken = process.env.FACEBOOK_ADS_TOKEN;
        if (envToken) {
          await exchangeForLongLivedToken(envToken);
          console.log('✅ [FB Token] Proactive refresh complete');
        }
      } else if (daysUntilExpire > 7) {
        console.log(`✅ [FB Token] Token is fresh (${daysUntilExpire} days until expire)`);
      } else {
        console.log('⏰ [FB Token] Token expired, will refresh on next request');
      }
    }
  } catch (error: any) {
    console.error('❌ [FB Token] Auto-refresh error:', error.message);
  }
}

// 📊 Get token status
export function getTokenStatus(): {
  hasCached: boolean;
  tokenType?: string;
  expiresAt?: string;
  daysUntilExpire?: number;
  isValid: boolean;
} {
  const cached = loadCachedToken();
  
  if (!cached) {
    return {
      hasCached: false,
      isValid: !!process.env.FACEBOOK_ADS_TOKEN
    };
  }
  
  const now = Date.now();
  const daysUntilExpire = cached.expires_at 
    ? Math.floor((cached.expires_at - now) / (24 * 60 * 60 * 1000))
    : undefined;
  
  return {
    hasCached: true,
    tokenType: cached.token_type,
    expiresAt: cached.expires_at ? new Date(cached.expires_at).toISOString() : undefined,
    daysUntilExpire,
    isValid: daysUntilExpire ? daysUntilExpire > 0 : true
  };
}

console.log('✅ [FB Token Manager] Initialized');

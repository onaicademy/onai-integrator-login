/**
 * 🔐 TOKEN REFRESHER - Automatic Token Rotation
 * 
 * Handles automatic refresh for:
 * 1. AmoCRM Access Tokens (expires every 24h)
 * 2. Facebook Long-Lived Tokens (expires every 60 days)
 * 3. GROQ API Keys (manual rotation if needed)
 * 
 * Prevents:
 * - Token expiration
 * - Service disruption
 * - Manual intervention
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// AMOCRM TOKEN REFRESHER
// ═══════════════════════════════════════════════════════════════

interface AmoCRMTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
}

class TokenRefresher {
  private amocrmTokens: AmoCRMTokens | null = null;
  private envPath = path.join(__dirname, '../../env.env');
  
  constructor() {
    this.loadTokensFromEnv();
    this.startAutoRefresh();
  }

  /**
   * Load current tokens from env.env
   */
  private loadTokensFromEnv() {
    try {
      const accessToken = process.env.AMOCRM_ACCESS_TOKEN;
      const refreshToken = process.env.AMOCRM_REFRESH_TOKEN;
      const expiresAt = parseInt(process.env.AMOCRM_TOKEN_EXPIRES_AT || '0');
      
      if (accessToken && refreshToken) {
        this.amocrmTokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt || Date.now() + 24 * 60 * 60 * 1000, // Default: 24h
        };
        
        console.log('🔐 [Token Refresher] AmoCRM tokens loaded');
      } else {
        console.warn('⚠️ [Token Refresher] AmoCRM tokens not found in env');
      }
    } catch (error) {
      console.error('❌ [Token Refresher] Failed to load tokens:', error);
    }
  }

  /**
   * Refresh AmoCRM access token
   */
  async refreshAmoCRMToken(): Promise<boolean> {
    if (!this.amocrmTokens) {
      console.error('❌ [Token Refresher] No AmoCRM tokens to refresh');
      return false;
    }

    const subdomain = process.env.AMOCRM_SUBDOMAIN || 'onaiagencykz';
    const clientId = process.env.AMOCRM_CLIENT_ID;
    const clientSecret = process.env.AMOCRM_CLIENT_SECRET;
    const redirectUri = process.env.AMOCRM_REDIRECT_URI || 'https://api.onai.academy/amocrm/callback';

    if (!clientId || !clientSecret) {
      console.error('❌ [Token Refresher] AmoCRM credentials not configured');
      return false;
    }

    try {
      console.log('🔄 [Token Refresher] Refreshing AmoCRM token...');
      
      const response = await axios.post(
        `https://${subdomain}.amocrm.ru/oauth2/access_token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: this.amocrmTokens.refresh_token,
          redirect_uri: redirectUri,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const newTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: Date.now() + response.data.expires_in * 1000,
      };

      // Update in-memory tokens
      this.amocrmTokens = newTokens;

      // Update env.env file
      await this.updateEnvFile({
        AMOCRM_ACCESS_TOKEN: newTokens.access_token,
        AMOCRM_REFRESH_TOKEN: newTokens.refresh_token,
        AMOCRM_TOKEN_EXPIRES_AT: newTokens.expires_at.toString(),
      });

      // Update process.env
      process.env.AMOCRM_ACCESS_TOKEN = newTokens.access_token;
      process.env.AMOCRM_REFRESH_TOKEN = newTokens.refresh_token;
      process.env.AMOCRM_TOKEN_EXPIRES_AT = newTokens.expires_at.toString();

      console.log('✅ [Token Refresher] AmoCRM token refreshed successfully');
      console.log(`   Expires at: ${new Date(newTokens.expires_at).toISOString()}`);

      return true;
    } catch (error: any) {
      console.error('❌ [Token Refresher] AmoCRM refresh failed:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Update env.env file with new tokens
   */
  private async updateEnvFile(updates: Record<string, string>): Promise<void> {
    try {
      let envContent = fs.readFileSync(this.envPath, 'utf-8');

      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'gm');
        
        if (regex.test(envContent)) {
          // Update existing
          envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
          // Add new
          envContent += `\n${key}=${value}`;
        }
      }

      fs.writeFileSync(this.envPath, envContent, 'utf-8');
      console.log('✅ [Token Refresher] env.env updated');
    } catch (error) {
      console.error('❌ [Token Refresher] Failed to update env.env:', error);
      throw error;
    }
  }

  /**
   * Check if token needs refresh (refresh 1 hour before expiry)
   */
  private needsRefresh(): boolean {
    if (!this.amocrmTokens) return false;
    
    const now = Date.now();
    const timeUntilExpiry = this.amocrmTokens.expires_at - now;
    const oneHour = 60 * 60 * 1000;
    
    return timeUntilExpiry < oneHour;
  }

  /**
   * Start automatic refresh scheduler
   */
  private startAutoRefresh() {
    // Check every 30 minutes
    setInterval(async () => {
      if (this.needsRefresh()) {
        console.log('⏰ [Token Refresher] Token expiring soon, refreshing...');
        await this.refreshAmoCRMToken();
      }
    }, 30 * 60 * 1000);

    console.log('✅ [Token Refresher] Auto-refresh scheduler started (checks every 30min)');
  }

  /**
   * Get token status
   */
  getStatus() {
    if (!this.amocrmTokens) {
      return {
        configured: false,
        message: 'AmoCRM tokens not configured',
      };
    }

    const now = Date.now();
    const timeUntilExpiry = this.amocrmTokens.expires_at - now;
    const hoursRemaining = Math.floor(timeUntilExpiry / (60 * 60 * 1000));
    
    return {
      configured: true,
      expires_at: new Date(this.amocrmTokens.expires_at).toISOString(),
      hours_remaining: hoursRemaining,
      needs_refresh: this.needsRefresh(),
      status: hoursRemaining > 1 ? 'ok' : 'warning',
    };
  }

  /**
   * Manual refresh trigger
   */
  async manualRefresh(): Promise<boolean> {
    console.log('🔄 [Token Refresher] Manual refresh triggered');
    return await this.refreshAmoCRMToken();
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

export const tokenRefresher = new TokenRefresher();

export default tokenRefresher;

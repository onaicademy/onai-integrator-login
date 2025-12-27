#!/usr/bin/env tsx
/**
 * 🔄 AmoCRM Token Auto-Refresh Manager
 * 
 * Purpose: Automatically refresh AmoCRM OAuth2 tokens before they expire (24h lifetime)
 * Run Schedule: Every 12 hours via cron
 * 
 * @description OAuth2 Access Tokens expire every 24 hours, but the integration
 * permission lasts until 2028. This script uses the Refresh Token to get new
 * Access/Refresh tokens and updates both .env files atomically.
 */

import axios from 'axios';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Load environment variables from backend/.env (production location)
config({ path: join(ROOT_DIR, 'backend', '.env') });
config({ path: join(ROOT_DIR, '.env') });

interface AmoCRMTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

interface RefreshConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  subdomain: string;
}

/**
 * Load AmoCRM OAuth2 configuration from environment
 */
function loadConfig(): RefreshConfig {
  const clientId = process.env.AMOCRM_CLIENT_ID || process.env.AMO_CLIENT_ID;
  const clientSecret = process.env.AMOCRM_CLIENT_SECRET || process.env.AMO_CLIENT_SECRET;
  const refreshToken = process.env.AMOCRM_REFRESH_TOKEN || process.env.AMO_REFRESH_TOKEN;
  const redirectUri = process.env.AMOCRM_REDIRECT_URI || process.env.AMO_REDIRECT_URI || 'https://onai.academy';
  const subdomain = 'onaiagencykz'; // Your AmoCRM subdomain

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('❌ Missing required environment variables: AMOCRM_CLIENT_ID, AMOCRM_CLIENT_SECRET, AMOCRM_REFRESH_TOKEN');
  }

  return { clientId, clientSecret, redirectUri, refreshToken, subdomain };
}

/**
 * Request new tokens from AmoCRM OAuth2 endpoint
 */
async function refreshTokens(config: RefreshConfig): Promise<AmoCRMTokenResponse> {
  const url = `https://${config.subdomain}.amocrm.ru/oauth2/access_token`;
  
  const payload = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: config.refreshToken,
    redirect_uri: config.redirectUri,
  };

  console.log('🔄 Requesting new tokens from AmoCRM...');
  console.log(`📍 Endpoint: ${url}`);

  try {
    const response = await axios.post<AmoCRMTokenResponse>(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(`✅ Tokens received! Expires in: ${response.data.expires_in}s (24h)`);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      console.error('❌ AmoCRM OAuth2 Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('🚨 CRITICAL: Refresh Token expired! MANUAL RE-AUTH REQUIRED via AmoCRM OAuth2 flow.');
      }
    }
    throw error;
  }
}

/**
 * Update .env file by replacing token values (preserves file structure)
 */
function updateEnvFile(filePath: string, newAccessToken: string, newRefreshToken: string): void {
  if (!existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filePath} - Skipping`);
    return;
  }

  let content = readFileSync(filePath, 'utf-8');
  
  // Replace Access Token (supports both AMOCRM_ACCESS_TOKEN and AMO_ACCESS_TOKEN)
  const accessTokenRegex = /^(AMOCRM_ACCESS_TOKEN|AMO_ACCESS_TOKEN)=.*/m;
  if (accessTokenRegex.test(content)) {
    content = content.replace(accessTokenRegex, `AMOCRM_ACCESS_TOKEN=${newAccessToken}`);
  } else {
    // Append if not exists
    content += `\nAMOCRM_ACCESS_TOKEN=${newAccessToken}`;
  }

  // Replace Refresh Token
  const refreshTokenRegex = /^(AMOCRM_REFRESH_TOKEN|AMO_REFRESH_TOKEN)=.*/m;
  if (refreshTokenRegex.test(content)) {
    content = content.replace(refreshTokenRegex, `AMOCRM_REFRESH_TOKEN=${newRefreshToken}`);
  } else {
    content += `\nAMOCRM_REFRESH_TOKEN=${newRefreshToken}`;
  }

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ Updated: ${filePath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 AmoCRM Token Auto-Refresh Manager');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  try {
    // Step 1: Load configuration
    const config = loadConfig();
    console.log(`✅ Configuration loaded`);
    console.log(`   Client ID: ${config.clientId.substring(0, 8)}...`);
    console.log(`   Subdomain: ${config.subdomain}\n`);

    // Step 2: Request new tokens
    const tokens = await refreshTokens(config);

    // Step 3: Update .env files
    console.log('\n📝 Updating environment files...');
    
    const rootEnv = join(ROOT_DIR, '.env');
    const backendEnv = join(ROOT_DIR, 'backend', 'env.env');

    updateEnvFile(rootEnv, tokens.access_token, tokens.refresh_token);
    updateEnvFile(backendEnv, tokens.access_token, tokens.refresh_token);

    // Step 4: Success summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TOKENS REFRESHED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔑 New Access Token: ${tokens.access_token.substring(0, 50)}...`);
    console.log(`🔄 New Refresh Token: ${tokens.refresh_token.substring(0, 50)}...`);
    console.log(`⏳ Access Token expires in: ${tokens.expires_in}s (24 hours)`);
    console.log(`📅 Next refresh recommended: ${new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()}`);
    console.log('\n💡 TIP: Set up cron job to run this every 12 hours:');
    console.log('   0 */12 * * * cd /path/to/project && npx tsx scripts/amo-token-manager.ts');
    
  } catch (error: any) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ TOKEN REFRESH FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(error.message);
    
    if (error.message.includes('MANUAL RE-AUTH')) {
      console.error('\n🔧 ACTION REQUIRED:');
      console.error('1. Go to https://onaiagencykz.amocrm.ru/oauth/authorize');
      console.error('2. Complete OAuth2 flow to get new refresh token');
      console.error('3. Update AMOCRM_REFRESH_TOKEN in .env files');
    }
    
    process.exit(1);
  }
}

// Execute
main();

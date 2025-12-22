/**
 * OpenAI Token Manager
 * Validates and refreshes OpenAI API key
 * 
 * Unlike Facebook/AmoCRM, OpenAI keys don't auto-expire, 
 * but we still validate them periodically
 */

import axios from 'axios';

interface OpenAITokenStatus {
  isValid: boolean;
  lastChecked: Date | null;
  organization?: string;
  model?: string;
  errorMessage?: string;
}

let tokenStatus: OpenAITokenStatus = {
  isValid: false,
  lastChecked: null,
};

let cachedApiKey: string | null = null;

/**
 * Initialize OpenAI API key from environment
 */
export function initializeOpenAIKey(): void {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ [OpenAI] No API key found in environment');
    tokenStatus.isValid = false;
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    console.error('❌ [OpenAI] Invalid API key format (should start with sk-)');
    tokenStatus.isValid = false;
    return;
  }
  
  cachedApiKey = apiKey;
  tokenStatus.isValid = true;
  tokenStatus.lastChecked = new Date();
  
  console.log('✅ [OpenAI] API key initialized:', apiKey.substring(0, 10) + '...' + apiKey.slice(-8));
}

/**
 * Validate OpenAI API key by making a test request
 */
export async function validateOpenAIKey(): Promise<boolean> {
  if (!cachedApiKey) {
    console.warn('⚠️ [OpenAI] No API key available to validate');
    tokenStatus.isValid = false;
    return false;
  }
  
  try {
    console.log('🔍 [OpenAI] Validating API key...');
    
    // Test request: list models
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${cachedApiKey}`,
      },
      timeout: 10000,
    });
    
    if (response.status === 200 && response.data.data) {
      tokenStatus.isValid = true;
      tokenStatus.lastChecked = new Date();
      tokenStatus.organization = response.data.data[0]?.owned_by;
      
      console.log('✅ [OpenAI] API key is VALID');
      console.log(`   Organization: ${tokenStatus.organization || 'Unknown'}`);
      console.log(`   Models available: ${response.data.data.length}`);
      
      return true;
    } else {
      throw new Error('Unexpected response from OpenAI API');
    }
  } catch (error: any) {
    console.error('❌ [OpenAI] API key validation FAILED:', error.response?.data?.error?.message || error.message);
    
    tokenStatus.isValid = false;
    tokenStatus.lastChecked = new Date();
    tokenStatus.errorMessage = error.response?.data?.error?.message || error.message;
    
    return false;
  }
}

/**
 * Get current OpenAI token status
 */
export function getOpenAITokenStatus(): OpenAITokenStatus {
  return { ...tokenStatus };
}

/**
 * Get valid OpenAI API key
 * Returns null if key is invalid
 */
export function getValidOpenAIKey(): string | null {
  if (!tokenStatus.isValid) {
    console.warn('⚠️ [OpenAI] API key is not validated yet, returning cached key');
  }
  
  return cachedApiKey;
}

/**
 * Check if OpenAI key needs validation (every 24 hours)
 */
export async function refreshOpenAITokenIfNeeded(): Promise<void> {
  if (!cachedApiKey) {
    console.log('ℹ️ [OpenAI] No API key to validate');
    return;
  }
  
  const now = new Date();
  const lastChecked = tokenStatus.lastChecked;
  
  // Validate every 24 hours or if status is invalid
  const shouldValidate = !lastChecked || 
    (now.getTime() - lastChecked.getTime()) > 24 * 60 * 60 * 1000 ||
    !tokenStatus.isValid;
  
  if (shouldValidate) {
    console.log('🔄 [OpenAI] Validating API key (24h check)...');
    await validateOpenAIKey();
  } else {
    console.log('✅ [OpenAI] Key validated recently, skipping');
  }
}

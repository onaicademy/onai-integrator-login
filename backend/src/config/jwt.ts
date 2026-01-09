/**
 * JWT Configuration
 *
 * Centralized JWT secret management with security validation.
 * NEVER use fallback secrets in production!
 */

const UNSAFE_DEFAULTS = [
  'your-secret-key-change-in-production',
  'secret',
  'jwt-secret',
  'change-me',
  'test-secret',
];

// 🔒 CRITICAL: Cache the secret to ensure consistency across all modules
// Without caching, Date.now() would create different secrets for each import!
let cachedSecret: string | null = null;
let secretValidated = false;

/**
 * Get JWT secret with security validation
 * @throws Error if secret is not properly configured
 */
export function getJWTSecret(): string {
  // Return cached secret if already validated (ensures consistency)
  if (cachedSecret && secretValidated) {
    return cachedSecret;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is not set. ' +
        'This is required for production security.'
      );
    }

    // Generate fallback ONCE and cache for entire process lifetime
    if (!cachedSecret) {
      console.warn('⚠️ [JWT] WARNING: JWT_SECRET not set. Using development fallback.');
      cachedSecret = 'dev-only-secret-do-not-use-in-production-' + Date.now();
    }
    secretValidated = true;
    return cachedSecret;
  }

  // Check for unsafe defaults
  if (UNSAFE_DEFAULTS.includes(secret.toLowerCase())) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: JWT_SECRET is set to an unsafe default value. ' +
        'Please generate a strong, random secret for production.'
      );
    }
    console.warn('⚠️ [JWT] WARNING: JWT_SECRET is using an unsafe default value.');
  }

  // Check minimum length (only warn once)
  if (!secretValidated && secret.length < 32) {
    console.warn('⚠️ [JWT] WARNING: JWT_SECRET should be at least 32 characters for security.');
  }

  // Cache the validated secret
  cachedSecret = secret;
  secretValidated = true;
  return cachedSecret;
}

/**
 * JWT expiration times
 */
export const JWT_EXPIRES_IN = {
  ACCESS_TOKEN: '7d',
  REFRESH_TOKEN: '30d',
  PASSWORD_RESET: '1h',
} as const;

console.log('✅ JWT config module loaded');

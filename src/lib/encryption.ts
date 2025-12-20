/**
 * Encryption Layer for Secure Data Transmission
 * AES-256 encryption for sensitive data, secure hashing, and token generation
 */

import CryptoJS from 'crypto-js';

// Encryption key derived from environment or fallback (in production, use env variable)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'onai-traffic-secure-key-2025';

/**
 * Encrypt sensitive data using AES-256
 */
export function encryptData(data: string | object): string {
  try {
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    return CryptoJS.AES.encrypt(dataString, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt AES-256 encrypted data
 */
export function decryptData<T = string>(encryptedData: string): T {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Decryption resulted in empty string');
    }
    
    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(decryptedString) as T;
    } catch {
      return decryptedString as unknown as T;
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate SHA-256 hash of data (one-way, for passwords)
 */
export function hashData(data: string): string {
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

/**
 * Generate HMAC-SHA256 signature for data integrity verification
 */
export function generateSignature(data: string, secret?: string): string {
  const key = secret || ENCRYPTION_KEY;
  return CryptoJS.HmacSHA256(data, key).toString(CryptoJS.enc.Hex);
}

/**
 * Verify HMAC-SHA256 signature
 */
export function verifySignature(data: string, signature: string, secret?: string): boolean {
  const expectedSignature = generateSignature(data, secret);
  return expectedSignature === signature;
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const randomBytes = CryptoJS.lib.WordArray.random(length);
  return randomBytes.toString(CryptoJS.enc.Hex);
}

/**
 * Generate CSRF token for form protection
 */
export function generateCSRFToken(): string {
  const token = generateSecureToken(16);
  const timestamp = Date.now().toString();
  const data = `${token}:${timestamp}`;
  return encryptData(data);
}

/**
 * Verify CSRF token (valid for 1 hour)
 */
export function verifyCSRFToken(token: string, maxAgeMs: number = 3600000): boolean {
  try {
    const decrypted = decryptData<string>(token);
    const [, timestamp] = decrypted.split(':');
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    return now - tokenTime < maxAgeMs;
  } catch {
    return false;
  }
}

/**
 * Mask sensitive data for logging (shows first 4 and last 4 chars)
 */
export function maskSensitiveData(data: string, showChars: number = 4): string {
  if (!data || data.length <= showChars * 2) {
    return '****';
  }
  const start = data.substring(0, showChars);
  const end = data.substring(data.length - showChars);
  return `${start}****${end}`;
}

/**
 * Encrypt sensitive API request payload
 */
export function encryptPayload<T extends object>(payload: T): { encrypted: string; signature: string } {
  const jsonString = JSON.stringify(payload);
  const encrypted = encryptData(jsonString);
  const signature = generateSignature(jsonString);
  
  return { encrypted, signature };
}

/**
 * Decrypt and verify API response payload
 */
export function decryptPayload<T>(encrypted: string, signature: string): T | null {
  try {
    const decrypted = decryptData<string>(encrypted);
    
    if (!verifySignature(decrypted, signature)) {
      console.error('Payload signature verification failed');
      return null;
    }
    
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error('Payload decryption failed:', error);
    return null;
  }
}

/**
 * Secure password hashing with salt
 */
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || generateSecureToken(16);
  const saltedPassword = `${password}:${useSalt}`;
  const hash = CryptoJS.PBKDF2(saltedPassword, useSalt, {
    keySize: 256 / 32,
    iterations: 10000
  }).toString(CryptoJS.enc.Hex);
  
  return { hash, salt: useSalt };
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return computedHash === hash;
}

// Export encryption utilities
export const Encryption = {
  encrypt: encryptData,
  decrypt: decryptData,
  hash: hashData,
  sign: generateSignature,
  verifySign: verifySignature,
  generateToken: generateSecureToken,
  generateCSRF: generateCSRFToken,
  verifyCSRF: verifyCSRFToken,
  mask: maskSensitiveData,
  encryptPayload,
  decryptPayload,
  hashPassword,
  verifyPassword
};

export default Encryption;

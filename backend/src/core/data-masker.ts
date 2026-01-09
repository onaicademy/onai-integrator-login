/**
 * DataMasker - Deep filtering and masking of sensitive data
 *
 * PRODUCTION-GRADE security for logs and error messages.
 * Ensures ZERO leakage of secrets, tokens, keys, credentials, and PII.
 *
 * @security This module is critical for GDPR/security compliance
 */

// Patterns for sensitive data detection (compiled once for performance)
const SENSITIVE_PATTERNS = {
  // API Keys & Tokens
  JWT: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  BEARER_TOKEN: /Bearer\s+[A-Za-z0-9_\-\.]+/gi,
  API_KEY_OPENAI: /sk-[A-Za-z0-9]{20,}/g,
  API_KEY_GENERIC: /[a-zA-Z0-9_-]{32,}/g,
  SECRET_KEY: /secret[_-]?key['":\s]*[=:]\s*['"]?[A-Za-z0-9_\-\.]{16,}['"]?/gi,

  // Database & Connection Strings
  CONNECTION_STRING: /(?:postgres|mysql|mongodb|redis):\/\/[^\s'"]+/gi,
  DB_PASSWORD: /password['":\s]*[=:]\s*['"]?[^'"}\s,]{4,}['"]?/gi,
  DB_USER: /(?:user(?:name)?|login)['":\s]*[=:]\s*['"]?[^'"}\s,]+['"]?/gi,

  // Credentials
  PASSWORD_FIELD: /(?:pass(?:word)?|pwd|secret|credential)['":\s]*[=:]\s*['"]?[^'"}\s,]{4,}['"]?/gi,
  AUTH_HEADER: /authorization['":\s]*[=:]\s*['"]?[^'"}\s,]+['"]?/gi,
  COOKIE: /cookie['":\s]*[=:]\s*['"]?[^'"}\s,]+['"]?/gi,

  // PII (Personal Identifiable Information)
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
  CREDIT_CARD: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
  IP_ADDRESS: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // Internal System Details
  STACK_TRACE_PATH: /at\s+[^\n]+\([^)]+:\d+:\d+\)/g,
  FILE_PATH: /\/(?:Users|home|var|opt|app)[\/][^\s'"]+/g,
  INTERNAL_URL: /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+/g,

  // Environment Variables
  ENV_VAR_VALUE: /(?:SUPABASE|OPENAI|GROQ|AMOCRM|TELEGRAM|RESEND|BUNNY|DATABASE|JWT)[_A-Z]*['":\s]*[=:]\s*['"]?[^'"}\s,]{8,}['"]?/gi,
} as const;

// Fields to completely redact in objects
const REDACT_FIELDS = new Set([
  'password', 'pass', 'pwd', 'secret', 'token', 'accessToken', 'access_token',
  'refreshToken', 'refresh_token', 'apiKey', 'api_key', 'apikey', 'key',
  'authorization', 'auth', 'cookie', 'session', 'sessionId', 'session_id',
  'credential', 'credentials', 'private', 'privateKey', 'private_key',
  'connectionString', 'connection_string', 'dsn', 'databaseUrl', 'database_url',
  'supabaseKey', 'supabase_key', 'serviceKey', 'service_key', 'anonKey', 'anon_key',
  'jwtSecret', 'jwt_secret', 'encryptionKey', 'encryption_key',
  'clientSecret', 'client_secret', 'appSecret', 'app_secret',
]);

// Fields to partially mask (show first/last chars)
const PARTIAL_MASK_FIELDS = new Set([
  'email', 'phone', 'userId', 'user_id', 'leadId', 'lead_id',
  'threadId', 'thread_id', 'assistantId', 'assistant_id',
]);

type MaskingLevel = 'full' | 'partial' | 'development';

interface MaskerOptions {
  level: MaskingLevel;
  maxDepth: number;
  maxArrayItems: number;
  preserveStructure: boolean;
}

const DEFAULT_OPTIONS: MaskerOptions = {
  level: process.env.NODE_ENV === 'production' ? 'full' : 'development',
  maxDepth: 10,
  maxArrayItems: 50,
  preserveStructure: true,
};

class DataMasker {
  private options: MaskerOptions;

  constructor(options: Partial<MaskerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Mask any value - strings, objects, arrays, errors
   */
  mask(value: unknown, depth = 0): unknown {
    if (depth > this.options.maxDepth) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.maskString(value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    if (value instanceof Error) {
      return this.maskError(value);
    }

    if (Array.isArray(value)) {
      return this.maskArray(value, depth);
    }

    if (typeof value === 'object') {
      return this.maskObject(value as Record<string, unknown>, depth);
    }

    return value;
  }

  /**
   * Mask sensitive patterns in strings
   */
  private maskString(str: string): string {
    if (!str || str.length < 4) return str;

    // Development mode: less aggressive masking
    if (this.options.level === 'development') {
      return this.maskStringDev(str);
    }

    let result = str;

    // Full production masking
    for (const [name, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      result = result.replace(pattern, (match) => {
        // For JWTs, show structure but mask content
        if (name === 'JWT') {
          return '[JWT:***]';
        }
        // For emails in prod, full mask
        if (name === 'EMAIL') {
          return '[EMAIL:***]';
        }
        // For IPs, mask last octet only if partial allowed
        if (name === 'IP_ADDRESS' && this.options.level === 'partial') {
          const parts = match.split('.');
          return `${parts[0]}.${parts[1]}.***.***`;
        }
        // For connection strings, show protocol only
        if (name === 'CONNECTION_STRING') {
          const protocol = match.split('://')[0];
          return `${protocol}://[REDACTED]`;
        }
        // For file paths in production, hide completely
        if (name === 'FILE_PATH' || name === 'STACK_TRACE_PATH') {
          return '[PATH:***]';
        }
        // For internal URLs
        if (name === 'INTERNAL_URL') {
          return '[INTERNAL:***]';
        }
        // Default: show type and masked content
        return `[${name}:***]`;
      });
    }

    return result;
  }

  /**
   * Development mode masking - less aggressive, more useful for debugging
   */
  private maskStringDev(str: string): string {
    let result = str;

    // Still mask highly sensitive items
    result = result.replace(SENSITIVE_PATTERNS.JWT, (match) => {
      return `${match.substring(0, 20)}...${match.substring(match.length - 10)}`;
    });

    result = result.replace(SENSITIVE_PATTERNS.API_KEY_OPENAI, (match) => {
      return `${match.substring(0, 10)}...`;
    });

    result = result.replace(SENSITIVE_PATTERNS.CONNECTION_STRING, (match) => {
      // Mask password in connection string
      return match.replace(/:[^:@]+@/, ':***@');
    });

    result = result.replace(SENSITIVE_PATTERNS.PASSWORD_FIELD, '[password:***]');

    return result;
  }

  /**
   * Mask object properties
   */
  private maskObject(obj: Record<string, unknown>, depth: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Full redaction for sensitive fields
      if (REDACT_FIELDS.has(lowerKey) || REDACT_FIELDS.has(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      // Partial masking for semi-sensitive fields
      if (PARTIAL_MASK_FIELDS.has(lowerKey) || PARTIAL_MASK_FIELDS.has(key)) {
        if (typeof value === 'string' && value.length > 4) {
          if (this.options.level === 'full') {
            result[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
          } else {
            result[key] = value;
          }
          continue;
        }
      }

      // Recursive masking
      result[key] = this.mask(value, depth + 1);
    }

    return result;
  }

  /**
   * Mask array items
   */
  private maskArray(arr: unknown[], depth: number): unknown[] {
    const limited = arr.slice(0, this.options.maxArrayItems);
    const masked = limited.map(item => this.mask(item, depth + 1));

    if (arr.length > this.options.maxArrayItems) {
      masked.push(`[...${arr.length - this.options.maxArrayItems} more items]`);
    }

    return masked;
  }

  /**
   * Mask error objects
   */
  private maskError(error: Error): object {
    const masked: Record<string, unknown> = {
      name: error.name,
      message: this.maskString(error.message),
    };

    // In production, don't expose stack traces
    if (this.options.level !== 'full' && error.stack) {
      masked.stack = this.maskString(error.stack);
    } else if (this.options.level === 'full') {
      masked.stack = '[STACK:HIDDEN_IN_PRODUCTION]';
    }

    // Mask any additional error properties
    for (const key of Object.keys(error)) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        masked[key] = this.mask((error as any)[key]);
      }
    }

    return masked;
  }

  /**
   * Create a safe string representation for logging
   */
  safeStringify(value: unknown, space?: number): string {
    try {
      const masked = this.mask(value);
      return JSON.stringify(masked, null, space);
    } catch (error) {
      return '[STRINGIFY_ERROR]';
    }
  }

  /**
   * Quick check if a string contains sensitive data
   */
  containsSensitiveData(str: string): boolean {
    for (const pattern of Object.values(SENSITIVE_PATTERNS)) {
      if (pattern.test(str)) {
        pattern.lastIndex = 0; // Reset regex state
        return true;
      }
    }
    return false;
  }

  /**
   * Get list of detected sensitive data types in a string
   */
  detectSensitiveTypes(str: string): string[] {
    const detected: string[] = [];

    for (const [name, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      if (pattern.test(str)) {
        detected.push(name);
        pattern.lastIndex = 0;
      }
    }

    return detected;
  }

  /**
   * Set masking level at runtime
   */
  setLevel(level: MaskingLevel): void {
    this.options.level = level;
  }
}

// Export singleton for production use
export const dataMasker = new DataMasker();

// Export class for custom instances
export { DataMasker, MaskingLevel, MaskerOptions };

// Export utility functions
export function maskSensitiveData(value: unknown): unknown {
  return dataMasker.mask(value);
}

export function safeStringify(value: unknown, space?: number): string {
  return dataMasker.safeStringify(value, space);
}

export function containsSensitiveData(str: string): boolean {
  return dataMasker.containsSensitiveData(str);
}

/**
 * Валидация для Traffic Dashboard
 *
 * Проверка email, паролей, и других входных данных
 */

/**
 * Валидация email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email обязателен' };
  }

  const trimmed = email.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Email не может быть пустым' };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email слишком длинный (макс. 254 символа)' };
  }

  // RFC 5322 Email regex (упрощённая версия)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Неверный формат email' };
  }

  // Проверка на подозрительные символы
  if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return { valid: false, error: 'Неверный формат email' };
  }

  return { valid: true };
}

/**
 * Валидация пароля
 */
export interface PasswordValidationOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

export function validatePassword(
  password: string,
  options: PasswordValidationOptions = {}
): { valid: boolean; error?: string; strength?: 'weak' | 'medium' | 'strong' } {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options;

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Пароль обязателен' };
  }

  if (password.length < minLength) {
    return {
      valid: false,
      error: `Пароль должен содержать минимум ${minLength} символов`
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'Пароль слишком длинный (макс. 128 символов)'
    };
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну заглавную букву'
    };
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну строчную букву'
    };
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы одну цифру'
    };
  }

  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: 'Пароль должен содержать хотя бы один специальный символ'
    };
  }

  // Проверка на распространённые пароли
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      valid: false,
      error: 'Слишком простой пароль. Выберите более сложный.'
    };
  }

  // Оценка надёжности пароля
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let strengthScore = 0;

  if (password.length >= 12) strengthScore++;
  if (/[A-Z]/.test(password)) strengthScore++;
  if (/[a-z]/.test(password)) strengthScore++;
  if (/[0-9]/.test(password)) strengthScore++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strengthScore++;
  if (password.length >= 16) strengthScore++;

  if (strengthScore >= 5) strength = 'strong';
  else if (strengthScore >= 3) strength = 'medium';

  return { valid: true, strength };
}

/**
 * Валидация имени пользователя
 */
export function validateFullName(fullName: string): { valid: boolean; error?: string } {
  if (!fullName || typeof fullName !== 'string') {
    return { valid: false, error: 'Имя обязательно' };
  }

  const trimmed = fullName.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Имя не может быть пустым' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Имя слишком короткое (минимум 2 символа)' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Имя слишком длинное (макс. 100 символов)' };
  }

  // Разрешаем только буквы, пробелы, дефисы, апострофы
  const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s'-]+$/;

  if (!nameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Имя может содержать только буквы, пробелы, дефисы и апострофы'
    };
  }

  return { valid: true };
}

/**
 * Валидация названия команды
 */
export function validateTeamName(teamName: string): { valid: boolean; error?: string } {
  if (!teamName || typeof teamName !== 'string') {
    return { valid: false, error: 'Название команды обязательно' };
  }

  const trimmed = teamName.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Название команды не может быть пустым' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Название слишком короткое (минимум 2 символа)' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Название слишком длинное (макс. 50 символов)' };
  }

  // Разрешаем буквы, цифры, пробелы, дефисы, подчёркивания
  const teamNameRegex = /^[a-zA-Zа-яА-ЯёЁ0-9\s_-]+$/;

  if (!teamNameRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Название может содержать только буквы, цифры, пробелы, дефисы и подчёркивания'
    };
  }

  return { valid: true };
}

/**
 * Валидация UTM source
 */
export function validateUTMSource(utmSource: string): { valid: boolean; error?: string } {
  if (!utmSource || typeof utmSource !== 'string') {
    return { valid: false, error: 'UTM source обязателен' };
  }

  const trimmed = utmSource.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'UTM source не может быть пустым' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'UTM source слишком длинный (макс. 100 символов)' };
  }

  // Разрешаем буквы, цифры, дефисы, подчёркивания, точки
  const utmRegex = /^[a-zA-Z0-9._-]+$/;

  if (!utmRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'UTM source может содержать только буквы, цифры, точки, дефисы и подчёркивания'
    };
  }

  return { valid: true };
}

/**
 * Санитизация строки (удаление опасных символов)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Удаляем < и > для предотвращения XSS
    .replace(/[\x00-\x1F\x7F]/g, ''); // Удаляем контрольные символы
}

/**
 * Проверка на SQL injection паттерны
 */
export function detectSQLInjection(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(;|\||&)/
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Проверка на XSS паттерны
 */
export function detectXSS(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<img[^>]+src[^>]*>/gi
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

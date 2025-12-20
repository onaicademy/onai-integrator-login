/**
 * Validation Layer with Zod Schemas
 * Type-safe input validation for all API requests
 */

import { z } from 'zod';

// ============================================
// Common Validation Schemas
// ============================================

export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email too short')
  .max(100, 'Email too long')
  .transform(email => email.toLowerCase().trim());

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const SimplePasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password too long');

export const TeamNameSchema = z
  .string()
  .min(2, 'Team name too short')
  .max(50, 'Team name too long')
  .regex(/^[a-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ0-9\s-]+$/, 'Invalid team name characters');

export const FullNameSchema = z
  .string()
  .min(2, 'Name too short')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Zа-яА-ЯәіңғүұқөһӘІҢҒҮҰҚӨҺ\s'-]+$/, 'Invalid name characters');

export const PhoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number format')
  .optional();

export const UUIDSchema = z
  .string()
  .uuid('Invalid UUID format');

export const DateSchema = z
  .string()
  .datetime()
  .or(z.date());

export const RoleSchema = z.enum(['admin', 'targetologist', 'manager', 'analyst']);

// ============================================
// Auth Validation Schemas
// ============================================

export const LoginSchema = z.object({
  email: EmailSchema,
  password: SimplePasswordSchema,
  rememberMe: z.boolean().optional().default(false)
});

export const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  fullName: FullNameSchema,
  teamName: TeamNameSchema.optional(),
  role: RoleSchema.optional().default('targetologist')
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Invalid refresh token')
});

export const ChangePasswordSchema = z.object({
  currentPassword: SimplePasswordSchema,
  newPassword: PasswordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// ============================================
// Traffic Dashboard Schemas
// ============================================

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date())
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before end date',
  path: ['startDate']
});

export const TeamFilterSchema = z.object({
  team: TeamNameSchema.optional(),
  showOnlyMyTeam: z.boolean().optional().default(false)
});

export const AnalyticsQuerySchema = z.object({
  dateRange: DateRangeSchema.optional(),
  teamFilter: TeamFilterSchema.optional(),
  metrics: z.array(z.string()).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day')
});

export const CampaignSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Campaign name required').max(200),
  platform: z.enum(['facebook', 'instagram', 'google', 'tiktok', 'vk']),
  budget: z.number().min(0, 'Budget cannot be negative'),
  status: z.enum(['active', 'paused', 'completed', 'draft']).optional(),
  targetAudience: z.string().optional(),
  startDate: DateSchema.optional(),
  endDate: DateSchema.optional()
});

export const LeadSchema = z.object({
  id: z.string().optional(),
  name: FullNameSchema.optional(),
  email: EmailSchema.optional(),
  phone: PhoneSchema,
  source: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'converted', 'lost']).optional(),
  notes: z.string().max(1000).optional(),
  campaignId: z.string().optional()
});

// ============================================
// Settings Schemas
// ============================================

export const UserSettingsSchema = z.object({
  language: z.enum(['ru', 'kz', 'en']).optional(),
  theme: z.enum(['dark', 'light', 'system']).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    telegram: z.boolean().optional()
  }).optional(),
  dashboardLayout: z.enum(['compact', 'detailed', 'grid']).optional()
});

export const ProfileUpdateSchema = z.object({
  fullName: FullNameSchema.optional(),
  email: EmailSchema.optional(),
  phone: PhoneSchema,
  avatar: z.string().url().optional()
});

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate data against a schema
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { 
  success: true; data: T 
} | { 
  success: false; errors: z.ZodError['errors'] 
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error.errors };
}

/**
 * Validate and throw if invalid
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Create a validator function for a schema
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => validate(schema, data);
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>&'"]/g, '') // Remove special chars
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends object>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value) 
        ? value.map(v => typeof v === 'string' ? sanitizeString(v) : v)
        : sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// ============================================
// Pre-built Validators
// ============================================

export const Validators = {
  login: createValidator(LoginSchema),
  register: createValidator(RegisterSchema),
  refreshToken: createValidator(RefreshTokenSchema),
  changePassword: createValidator(ChangePasswordSchema),
  analyticsQuery: createValidator(AnalyticsQuerySchema),
  campaign: createValidator(CampaignSchema),
  lead: createValidator(LeadSchema),
  userSettings: createValidator(UserSettingsSchema),
  profileUpdate: createValidator(ProfileUpdateSchema),
  dateRange: createValidator(DateRangeSchema)
};

// Type exports
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;
export type CampaignInput = z.infer<typeof CampaignSchema>;
export type LeadInput = z.infer<typeof LeadSchema>;
export type UserSettingsInput = z.infer<typeof UserSettingsSchema>;
export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type DateRangeInput = z.infer<typeof DateRangeSchema>;

export default Validators;

/**
 * Validation Schemas for Traffic Dashboard
 * Using Zod for runtime type validation
 */

import { z } from 'zod';

// ==================== USER & AUTH SCHEMAS ====================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum(['admin', 'targetologist', 'sales']),
  team: z.string().optional(),
  createdAt: z.string().optional(),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
  expiresAt: z.string().optional(),
});

// ==================== TRAFFIC METRICS SCHEMAS ====================

export const CampaignMetricsSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.string(),
  spend: z.number().nonnegative(),
  revenue: z.number().nonnegative(),
  leads: z.number().int().nonnegative(),
  sales: z.number().int().nonnegative(),
  roas: z.number().optional(),
  cpa: z.number().nonnegative().optional(),
  cpl: z.number().nonnegative().optional(),
  date: z.string().optional(),
});

export const TeamMetricsSchema = z.object({
  team: z.string(),
  totalSpend: z.number().nonnegative(),
  totalRevenue: z.number().nonnegative(),
  totalLeads: z.number().int().nonnegative(),
  totalSales: z.number().int().nonnegative(),
  roas: z.number(),
  cpa: z.number().nonnegative(),
  cpl: z.number().nonnegative(),
  campaigns: z.array(CampaignMetricsSchema),
});

export const DashboardDataSchema = z.object({
  teams: z.array(TeamMetricsSchema),
  overall: z.object({
    totalSpend: z.number().nonnegative(),
    totalRevenue: z.number().nonnegative(),
    totalLeads: z.number().int().nonnegative(),
    totalSales: z.number().int().nonnegative(),
    averageRoas: z.number(),
  }),
  lastUpdate: z.string(),
});

// ==================== FACEBOOK ADS SCHEMAS ====================

export const FacebookCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['ACTIVE', 'PAUSED', 'DELETED']),
  spend: z.number().nonnegative(),
  impressions: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  ctr: z.number().optional(),
  cpc: z.number().nonnegative().optional(),
});

export const FacebookAccountSchema = z.object({
  accountId: z.string(),
  accountName: z.string(),
  isConnected: z.boolean(),
  campaigns: z.array(FacebookCampaignSchema).optional(),
  lastSync: z.string().optional(),
});

// ==================== API RESPONSE SCHEMAS ====================

export const ApiSuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  message: z.string().optional(),
});

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
});

export const ApiResponseSchema = z.union([
  ApiSuccessResponseSchema,
  ApiErrorResponseSchema,
]);

// ==================== EXPORT TYPES ====================

export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type CampaignMetrics = z.infer<typeof CampaignMetricsSchema>;
export type TeamMetrics = z.infer<typeof TeamMetricsSchema>;
export type DashboardData = z.infer<typeof DashboardDataSchema>;
export type FacebookCampaign = z.infer<typeof FacebookCampaignSchema>;
export type FacebookAccount = z.infer<typeof FacebookAccountSchema>;
export type ApiSuccessResponse = z.infer<typeof ApiSuccessResponseSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;

// ==================== VALIDATION HELPERS ====================

/**
 * Safe parse with debug logging
 */
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    console.error(`[Validation Error] ${context || 'Unknown context'}:`, {
      errors: result.error.errors,
      data,
    });
  }
  
  return result;
}

/**
 * Validate or throw
 */
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`[Validation Error] ${context || 'Unknown context'}:`, {
        errors: error.errors,
        data,
      });
    }
    throw error;
  }
}

import { z } from 'zod';

// ✅ Валидация для Ad Account
export const AdAccountSchema = z.object({
  id: z.string()
    .regex(/^act_/, 'Ad account ID должен начинаться с act_')
    .min(1)
    .max(50),
  name: z.string()
    .min(1, 'Имя кабинета не может быть пустым')
    .max(255, 'Имя кабинета не может быть больше 255 символов'),
  status: z.enum(['active', 'inactive'])
    .describe('Статус рекламного кабинета'),
  currency: z.string()
    .length(3, 'Валюта должна быть 3-буквенным кодом')
    .regex(/^[A-Z]{3}$/, 'Валюта должна быть в формате USD, EUR и т.д.'),
  timezone: z.string()
    .min(1)
    .max(100)
});

// ✅ Валидация для Campaign
export const CampaignSchema = z.object({
  id: z.string()
    .min(1, 'Campaign ID не может быть пустым')
    .max(100),
  name: z.string()
    .min(1, 'Имя кампании не может быть пустым')
    .max(255),
  ad_account_id: z.string()
    .regex(/^act_/, 'Ad account ID должен начинаться с act_'),
  status: z.string()
    .max(100),
  spend: z.number()
    .min(0, 'Расходы не могут быть отрицательными')
    .default(0),
  impressions: z.number()
    .min(0, 'Impressions не может быть отрицательным')
    .default(0),
  clicks: z.number()
    .min(0, 'Clicks не может быть отрицательным')
    .default(0)
});

// ✅ Валидация для Settings POST/PUT
export const SaveSettingsSchema = z.object({
  fb_ad_accounts: z.array(AdAccountSchema)
    .min(1, 'Нужно выбрать хотя бы один рекламный кабинет')
    .max(100, 'Не может быть больше 100 кабинетов'),
  tracked_campaigns: z.array(CampaignSchema)
    .min(1, 'Нужно выбрать хотя бы одну кампанию')
    .max(1000, 'Не может быть больше 1000 кампаний')
});

// ✅ Валидация для Facebook Query Params
export const FacebookQuerySchema = z.object({
  access_token: z.string()
    .min(1, 'Facebook token требуется')
    .max(500),
  fields: z.string()
    .optional(),
  limit: z.number()
    .min(1)
    .max(100)
    .default(100)
});

// ✅ Типы для TypeScript
export type AdAccount = z.infer<typeof AdAccountSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type SaveSettings = z.infer<typeof SaveSettingsSchema>;

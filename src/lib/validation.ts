import { z } from 'zod';

// Zod Schema для формы логина
export const tripwireLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Некорректный email')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(6, 'Пароль не менее 6 символов')
    .max(100, 'Пароль слишком длинный'),
  remember: z.boolean().optional().default(false),
});

export type TripwireLoginFormData = z.infer<typeof tripwireLoginSchema>;

// Zod Schema для восстановления пароля
export const passwordRecoverySchema = z.object({
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Некорректный email')
    .toLowerCase()
    .trim(),
});

export type PasswordRecoveryFormData = z.infer<typeof passwordRecoverySchema>;


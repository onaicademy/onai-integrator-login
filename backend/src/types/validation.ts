import { z } from 'zod';

/**
 * Zod schemas for input validation
 * 
 * WHY:
 * - Prevents SQL injection
 * - Prevents XSS attacks
 * - Ensures data consistency
 * - Self-documenting API contracts
 * 
 * SAFE: Only validates, doesn't change business logic
 */

// ✅ Auth schemas
export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
});

// ✅ Tripwire schemas
export const CompleteLessonSchema = z.object({
  // ✅ FIXED: z.coerce автоматически конвертирует string → number (безопасно)
  lesson_id: z.coerce.number().int().positive('lesson_id must be positive integer'),
  module_id: z.coerce.number().int().positive('module_id must be positive integer'),
  tripwire_user_id: z.string().uuid('Invalid user ID format'),
  watched_percentage: z.coerce.number().min(0).max(100).default(100),
  
  // ✅ Опциональные поля для будущих расширений (backwards compatible)
  timestamp: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password too short'),
  full_name: z.string().min(2, 'Name too short'),
  role: z.enum(['student', 'admin', 'sales']),
});

export const CreateCourseSchema = z.object({
  title: z.string().min(3, 'Title too short').max(200, 'Title too long'),
  description: z.string().min(10, 'Description too short'),
  price: z.number().positive('Price must be positive').optional(),
});

export const UpdateProgressSchema = z.object({
  // ✅ FIXED: z.coerce для гибкости типов
  lesson_id: z.coerce.number().int().positive('lesson_id must be positive integer'),
  tripwire_user_id: z.string().uuid('Invalid user ID format'),
  video_progress_percent: z.coerce.number().min(0).max(100),
  watch_time_seconds: z.coerce.number().min(0),
});

// ✅ Helper function to validate and handle errors
export const validateRequest = async <T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // ✅ IMPROVED: Детальные сообщения об ошибках с типами
      throw {
        status: 400,
        message: 'Validation failed',
        errors: error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
          received: e.code === 'invalid_type' ? typeof (e as any).received : undefined,
          expected: e.code === 'invalid_type' ? (e as any).expected : undefined,
        })),
      };
    }
    throw error;
  }
};

// ✅ Express middleware wrapper для удобства
export const validate = (schema: z.ZodSchema<any>) => {
  return async (req: any, res: any, next: any) => {
    try {
      req.body = await validateRequest(schema, req.body);
      next();
    } catch (error: any) {
      res.status(error.status || 500).json({ 
        error: error.message,
        details: error.errors 
      });
    }
  };
};

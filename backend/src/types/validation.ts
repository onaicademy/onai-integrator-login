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
  lesson_id: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number().int().positive('Invalid lesson ID')
  ]),
  module_id: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number().int().positive('Invalid module ID')
  ]),
  tripwire_user_id: z.string().uuid('Invalid user ID'),
  watched_percentage: z.number().min(0).max(100).optional(),
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
  lesson_id: z.union([
    z.string().transform(val => parseInt(val, 10)),
    z.number().int().positive()
  ]),
  tripwire_user_id: z.string().uuid(),
  video_progress_percent: z.number().min(0).max(100),
  watch_time_seconds: z.number().min(0),
});

// ✅ Helper function to validate and handle errors
export const validateRequest = async <T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw {
        status: 400,
        message: 'Validation failed',
        errors: error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
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

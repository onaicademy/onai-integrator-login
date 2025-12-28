import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// 🔥 AmoCRM Webhook Schema
const AmoCRMWebhookSchema = z.object({
  leads: z.object({
    status: z.array(z.object({
      lead_id: z.number(),
      pipeline_id: z.number(),
      status_id: z.number(),
      price: z.number().optional(),
      created_at: z.number().optional(),
      updated_at: z.number().optional(),
      custom_fields: z.array(z.object({
        id: z.number(),
        name: z.string().optional(),
        values: z.array(z.object({
          value: z.string().optional(),
        })),
      })).optional(),
    })),
  }),
});

// 🔥 Express Course Webhook Schema
const ExpressCourseWebhookSchema = z.object({
  leads: z.object({
    add: z.array(z.object({
      id: z.number(),
      name: z.string(),
      pipeline_id: z.number(),
      status_id: z.number(),
      price: z.number().optional(),
      custom_fields: z.array(z.object({
        id: z.number(),
        name: z.string().optional(),
        values: z.array(z.object({
          value: z.string().optional(),
        })),
      })).optional(),
    })),
  }),
});

// 🔥 Flagship Course Webhook Schema
const FlagshipCourseWebhookSchema = z.object({
  leads: z.object({
    add: z.array(z.object({
      id: z.number(),
      name: z.string(),
      pipeline_id: z.number(),
      status_id: z.number(),
      price: z.number().optional(),
      custom_fields: z.array(z.object({
        id: z.number(),
        name: z.string().optional(),
        values: z.array(z.object({
          value: z.string().optional(),
        })),
      })).optional(),
    })),
  }),
});

// 🔥 Validation Error Type
class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

// 🔥 Validate AmoCRM Webhook
export function validateAmoCRMWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    AmoCRMWebhookSchema.parse(req.body);
    next();
  } catch (error: any) {
    console.error('❌ [Validation] AmoCRM Webhook validation error:', error.message);
    console.error('❌ [Validation] Received body:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({
      error: 'Invalid webhook data',
      message: error.message,
      details: error.errors,
    });
  }
}

// 🔥 Validate Express Course Webhook
export function validateExpressCourseWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    ExpressCourseWebhookSchema.parse(req.body);
    next();
  } catch (error: any) {
    console.error('❌ [Validation] Express Course Webhook validation error:', error.message);
    console.error('❌ [Validation] Received body:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({
      error: 'Invalid webhook data',
      message: error.message,
      details: error.errors,
    });
  }
}

// 🔥 Validate Flagship Course Webhook
export function validateFlagshipCourseWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    FlagshipCourseWebhookSchema.parse(req.body);
    next();
  } catch (error: any) {
    console.error('❌ [Validation] Flagship Course Webhook validation error:', error.message);
    console.error('❌ [Validation] Received body:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({
      error: 'Invalid webhook data',
      message: error.message,
      details: error.errors,
    });
  }
}

// 🔥 Generic validation helper
export function validateBody(schema: z.ZodSchema, req: Request, res: Response, next: NextFunction) {
  try {
    schema.parse(req.body);
    next();
  } catch (error: any) {
    console.error('❌ [Validation] Body validation error:', error.message);
    console.error('❌ [Validation] Received body:', JSON.stringify(req.body, null, 2));
    return res.status(400).json({
      error: 'Invalid request body',
      message: error.message,
      details: error.errors,
    });
  }
}

// 🔥 Validate query parameters
export function validateQuery(schema: z.ZodSchema, req: Request, res: Response, next: NextFunction) {
  try {
    schema.parse(req.query);
    next();
  } catch (error: any) {
    console.error('❌ [Validation] Query validation error:', error.message);
    console.error('❌ [Validation] Received query:', JSON.stringify(req.query, null, 2));
    return res.status(400).json({
      error: 'Invalid query parameters',
      message: error.message,
      details: error.errors,
    });
  }
}

// 🔥 Validate path parameters
export function validateParams(schema: z.ZodSchema, req: Request, res: Response, next: NextFunction) {
  try {
    schema.parse(req.params);
    next();
  } catch (error: any) {
    console.error('❌ [Validation] Params validation error:', error.message);
    console.error('❌ [Validation] Received params:', JSON.stringify(req.params, null, 2));
    return res.status(400).json({
      error: 'Invalid path parameters',
      message: error.message,
      details: error.errors,
    });
  }
}

// 🔥 Common schemas for reuse
export const CommonSchemas = {
  // Date range schema
  dateRange: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),

  // Pagination schema
  pagination: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    offset: z.string().optional(),
  }),

  // ID schema
  id: z.object({
    id: z.string().min(1),
  }),

  // Team schema
  team: z.object({
    team: z.string().min(1),
  }),
};

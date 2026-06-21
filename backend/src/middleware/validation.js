import { z } from 'zod';
import { TRANSPORT_FACTORS, FOOD_FACTORS } from '../lib/emissionFactors.js';

// Schema for User Onboarding Profile Questionnaire
export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  transport_type: z.string().refine(val => {
    const key = val.toLowerCase().replace(/\s+/g, '_');
    return TRANSPORT_FACTORS[key] !== undefined;
  }, { message: 'Invalid transport type' }),
  daily_distance: z.number().nonnegative('Commute distance must be non-negative'),
  diet_type: z.string().refine(val => {
    const key = val.toLowerCase();
    return FOOD_FACTORS[key] !== undefined;
  }, { message: 'Invalid diet type' }),
  household_size: z.number().int().positive('Household size must be at least 1'),
  electricity_usage: z.number().nonnegative('Electricity usage must be non-negative'),
  weekly_commute_frequency: z.number().int().min(1).max(7).optional(),
  meals_per_day: z.number().int().nonnegative().optional().default(3),
  ai_usage_frequency: z.number().int().nonnegative().optional().default(0),
  video_streaming_usage: z.number().nonnegative().optional().default(0),
  sustainability_goal: z.string().optional().nullable()
});

// Schema for Receipt Confirmation
export const receiptConfirmSchema = z.object({
  receiptId: z.string().uuid('Invalid receiptId format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  distance: z.number().nonnegative().optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  transport_type: z.string().optional().nullable(),
  electricity_kwh: z.number().nonnegative().optional().nullable()
});

// Schema for Goal Selection updates
export const updateGoalSchema = z.object({
  sustainability_goal: z.enum(['reduce_10', 'reduce_20', 'eco_optimizer', 'low_impact'])
});

// Schema for Carbon Log Input
export const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  transport_distance: z.number().nonnegative('Distance must be non-negative').default(0),
  transport_type: z.string().refine(val => {
    const key = val.toLowerCase().replace(/\s+/g, '_');
    return TRANSPORT_FACTORS[key] !== undefined;
  }, { message: 'Invalid transport type' }).default('walking'),
  meals: z.object({
    vegetarian: z.number().int().nonnegative().default(0),
    chicken: z.number().int().nonnegative().default(0),
    beef: z.number().int().nonnegative().default(0),
  }).default({ vegetarian: 0, chicken: 0, beef: 0 }),
  electricity_usage: z.number().nonnegative('Daily electricity usage must be non-negative').default(0),
  shopping_spent: z.number().nonnegative('Daily shopping spent must be non-negative').default(0),
});

// Schema for Goal Target
export const goalSchema = z.object({
  monthly_target: z.number().positive('Monthly target must be a positive number'),
});

// Schema for Journey History Saving
export const journeySchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  distanceKm: z.number().nonnegative('Distance must be non-negative'),
  selectedMode: z.string().min(1, 'Selected mode is required'),
  estimatedEmission: z.number().nonnegative('Estimated emission must be non-negative'),
});

// Middleware factory for validation
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

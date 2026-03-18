import { z } from 'zod';

/** Required and optional env vars. Validation runs at app bootstrap. */
export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.string().optional().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  REDIS_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  TRANZILA_TERMINAL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
  OPENWEATHERMAP_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  SKIP_EMERGENCY_FOR_TESTING: z.string().optional(),
  PIKUD_HAOREF_POLL_INTERVAL_MS: z.string().optional(),
  EMERGENCY_MODULE_ENABLED: z.string().optional(),
  EMERGENCY_SHOW_ALL_ISRAEL_ALERTS: z.string().optional(),
  SHELTER_SEARCH_RADIUS_M: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((v) => (v ? Number(v) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(env: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues;
    const messages = issues.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Environment validation failed: ${messages.join('; ')}`);
  }
  return result.data;
}

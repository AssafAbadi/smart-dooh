import { z } from 'zod';

const numberOrStringToNumber = z.union([z.number(), z.string()]).transform((v) =>
  typeof v === 'string' ? parseInt(v, 10) : v,
);

export const pikudAlertSchema = z.object({
  id: numberOrStringToNumber.optional(),
  cat: numberOrStringToNumber,
  title: z.string(),
  data: z.union([z.array(z.string()), z.string()]).transform((v) =>
    Array.isArray(v) ? v : [v],
  ),
  desc: z.string().default(''),
});

export type PikudHaorefAlert = z.infer<typeof pikudAlertSchema>;

export const activeAlertSchema = z.object({
  id: z.string(),
  cat: z.number(),
  title: z.string(),
  areas: z.array(z.string()),
  desc: z.string(),
  detectedAt: z.date(),
});

export type ActiveAlert = z.infer<typeof activeAlertSchema>;

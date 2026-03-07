import { z } from 'zod';
export declare const adInstructionSchema: z.ZodObject<{
    campaignId: z.ZodString;
    creativeId: z.ZodString;
    variantId: z.ZodOptional<z.ZodString>;
    headline: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    placeholders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    imageUrl: z.ZodOptional<z.ZodString>;
    couponCode: z.ZodOptional<z.ZodString>;
    ttlSeconds: z.ZodOptional<z.ZodNumber>;
    priority: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type AdInstruction = z.infer<typeof adInstructionSchema>;
export declare const adInstructionValidator: (data: unknown, params?: z.core.ParseContext<z.core.$ZodIssue>) => {
    campaignId: string;
    creativeId: string;
    headline: string;
    variantId?: string | undefined;
    body?: string | undefined;
    placeholders?: Record<string, string> | undefined;
    imageUrl?: string | undefined;
    couponCode?: string | undefined;
    ttlSeconds?: number | undefined;
    priority?: number | undefined;
};
export declare const adInstructionSafeParse: (data: unknown, params?: z.core.ParseContext<z.core.$ZodIssue>) => z.ZodSafeParseResult<{
    campaignId: string;
    creativeId: string;
    headline: string;
    variantId?: string | undefined;
    body?: string | undefined;
    placeholders?: Record<string, string> | undefined;
    imageUrl?: string | undefined;
    couponCode?: string | undefined;
    ttlSeconds?: number | undefined;
    priority?: number | undefined;
}>;
//# sourceMappingURL=ad-instruction.dto.d.ts.map
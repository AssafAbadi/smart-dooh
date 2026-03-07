import { z } from 'zod';
export declare const driverPreferencesSchema: z.ZodObject<{
    kosherOnly: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    excludeAlcohol: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    excludedLanguages: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    excludedCategories: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
}, z.core.$strip>;
export type DriverPreferencesDto = z.infer<typeof driverPreferencesSchema>;
export declare const driverPreferencesSafeParse: (data: unknown, params?: z.core.ParseContext<z.core.$ZodIssue>) => z.ZodSafeParseResult<{
    kosherOnly: boolean;
    excludeAlcohol: boolean;
    excludedLanguages: string[];
    excludedCategories: string[];
}>;
//# sourceMappingURL=driver-preferences.dto.d.ts.map
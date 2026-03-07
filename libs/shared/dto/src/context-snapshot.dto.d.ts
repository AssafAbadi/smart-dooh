import { z } from 'zod';
export declare const contextSnapshotSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    geohash: z.ZodString;
    speedKmh: z.ZodNumber;
    speedBucket: z.ZodString;
    weather: z.ZodOptional<z.ZodObject<{
        tempC: z.ZodOptional<z.ZodNumber>;
        condition: z.ZodOptional<z.ZodString>;
        humidity: z.ZodOptional<z.ZodNumber>;
        windKmh: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    nearbyPlaces: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodOptional<z.ZodString>;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        distanceMeters: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>>;
    proximity: z.ZodEnum<{
        IMMEDIATE: "IMMEDIATE";
        NORMAL: "NORMAL";
    }>;
    timeOfDay: z.ZodString;
    timestamp: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
}, z.core.$strip>;
export type ContextSnapshot = z.infer<typeof contextSnapshotSchema>;
export declare const contextSnapshotValidator: (data: unknown, params?: z.core.ParseContext<z.core.$ZodIssue>) => {
    lat: number;
    lng: number;
    geohash: string;
    speedKmh: number;
    speedBucket: string;
    proximity: "IMMEDIATE" | "NORMAL";
    timeOfDay: string;
    timestamp: string | number;
    weather?: {
        tempC?: number | undefined;
        condition?: string | undefined;
        humidity?: number | undefined;
        windKmh?: number | undefined;
    } | undefined;
    nearbyPlaces?: {
        id: string;
        name: string;
        lat: number;
        lng: number;
        type?: string | undefined;
        distanceMeters?: number | undefined;
    }[] | undefined;
};
export declare const contextSnapshotSafeParse: (data: unknown, params?: z.core.ParseContext<z.core.$ZodIssue>) => z.ZodSafeParseResult<{
    lat: number;
    lng: number;
    geohash: string;
    speedKmh: number;
    speedBucket: string;
    proximity: "IMMEDIATE" | "NORMAL";
    timeOfDay: string;
    timestamp: string | number;
    weather?: {
        tempC?: number | undefined;
        condition?: string | undefined;
        humidity?: number | undefined;
        windKmh?: number | undefined;
    } | undefined;
    nearbyPlaces?: {
        id: string;
        name: string;
        lat: number;
        lng: number;
        type?: string | undefined;
        distanceMeters?: number | undefined;
    }[] | undefined;
}>;
//# sourceMappingURL=context-snapshot.dto.d.ts.map
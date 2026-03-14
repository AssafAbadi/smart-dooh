import { z } from 'zod';

// ---- Zod Schemas (runtime validation) ----

export const gisFeatureSchema = z.object({
  attributes: z.object({
    oid_mitkan: z.union([z.number(), z.string()]).transform(String),
    Full_Address: z.string().optional(),
    shem_recho: z.string().optional(),
    ms_bait: z.union([z.number(), z.string()]).optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
  }).passthrough(),
  geometry: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const gisQueryResponseSchema = z.object({
  features: z.array(gisFeatureSchema),
  exceededTransferLimit: z.boolean().optional(),
});

export type GisFeature = z.infer<typeof gisFeatureSchema>;
export type GisQueryResponse = z.infer<typeof gisQueryResponseSchema>;

export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().positive().max(5000).default(500),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type NearbyQueryDto = z.infer<typeof nearbyQuerySchema>;

// ---- Domain Types ----

export interface ShelterRecord {
  id: string;
  externalId: string;
  address: string;
  lat: number;
  lng: number;
  lastUpdated: Date;
}

export interface ShelterWithDistance extends ShelterRecord {
  distanceMeters: number;
}

export interface IShelterRepository {
  upsertMany(shelters: Omit<ShelterRecord, 'id'>[]): Promise<number>;
  findNearby(lat: number, lng: number, radiusMeters: number): Promise<ShelterWithDistance[]>;
  findNearestN(lat: number, lng: number, count: number): Promise<ShelterWithDistance[]>;
  count(): Promise<number>;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextSnapshotSafeParse = exports.contextSnapshotValidator = exports.contextSnapshotSchema = void 0;
const zod_1 = require("zod");
const weatherSchema = zod_1.z.object({
    tempC: zod_1.z.number().optional(),
    condition: zod_1.z.string().optional(),
    humidity: zod_1.z.number().optional(),
    windKmh: zod_1.z.number().optional(),
});
const nearbyPlaceSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.string().optional(),
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    distanceMeters: zod_1.z.number().optional(),
});
exports.contextSnapshotSchema = zod_1.z.object({
    lat: zod_1.z.number(),
    lng: zod_1.z.number(),
    geohash: zod_1.z.string(),
    speedKmh: zod_1.z.number(),
    speedBucket: zod_1.z.string(),
    weather: weatherSchema.optional(),
    nearbyPlaces: zod_1.z.array(nearbyPlaceSchema).optional(),
    proximity: zod_1.z.enum(['IMMEDIATE', 'NORMAL']),
    timeOfDay: zod_1.z.string(),
    timestamp: zod_1.z.union([zod_1.z.string().datetime(), zod_1.z.number()]),
});
exports.contextSnapshotValidator = exports.contextSnapshotSchema.parse;
exports.contextSnapshotSafeParse = exports.contextSnapshotSchema.safeParse;
//# sourceMappingURL=context-snapshot.dto.js.map
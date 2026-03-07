"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adInstructionSafeParse = exports.adInstructionValidator = exports.adInstructionSchema = void 0;
const zod_1 = require("zod");
exports.adInstructionSchema = zod_1.z.object({
    campaignId: zod_1.z.string(),
    creativeId: zod_1.z.string(),
    variantId: zod_1.z.string().optional(),
    headline: zod_1.z.string(),
    body: zod_1.z.string().optional(),
    placeholders: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    imageUrl: zod_1.z.string().url().optional(),
    couponCode: zod_1.z.string().optional(),
    ttlSeconds: zod_1.z.number().optional(),
    priority: zod_1.z.number().optional(),
});
exports.adInstructionValidator = exports.adInstructionSchema.parse;
exports.adInstructionSafeParse = exports.adInstructionSchema.safeParse;
//# sourceMappingURL=ad-instruction.dto.js.map
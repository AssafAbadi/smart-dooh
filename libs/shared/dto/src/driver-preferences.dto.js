"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.driverPreferencesSafeParse = exports.driverPreferencesSchema = void 0;
const zod_1 = require("zod");
exports.driverPreferencesSchema = zod_1.z.object({
    kosherOnly: zod_1.z.boolean().optional().default(false),
    excludeAlcohol: zod_1.z.boolean().optional().default(false),
    excludedLanguages: zod_1.z.array(zod_1.z.string()).optional().default([]),
    excludedCategories: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.driverPreferencesSafeParse = exports.driverPreferencesSchema.safeParse;
//# sourceMappingURL=driver-preferences.dto.js.map
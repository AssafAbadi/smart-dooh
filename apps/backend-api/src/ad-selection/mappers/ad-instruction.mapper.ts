import { Injectable } from '@nestjs/common';
import type { AdInstructionResult } from '../interfaces/ad-selection.interface';

/** Public ad instruction shape (matches libs/shared/dto AdInstruction). Explicit type avoids build resolution issues. */
export interface PublicAdInstruction {
  campaignId: string;
  creativeId: string;
  variantId?: string;
  headline: string;
  body?: string;
  placeholders?: Record<string, string>;
  imageUrl?: string;
  couponCode?: string;
  ttlSeconds?: number;
  priority?: number;
  distanceMeters?: number;
  businessLat?: number;
  businessLng?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  emergencyData?: AdInstructionResult['emergencyData'];
}

@Injectable()
export class AdInstructionMapper {
  toPublic(internal: AdInstructionResult): PublicAdInstruction {
    return {
      campaignId: internal.campaignId,
      creativeId: internal.creativeId,
      variantId: internal.variantId,
      headline: internal.headline,
      body: internal.body,
      placeholders: internal.placeholders,
      imageUrl: internal.imageUrl,
      couponCode: internal.couponCode,
      ttlSeconds: internal.ttlSeconds,
      priority: internal.priority,
      distanceMeters: internal.distanceMeters,
      businessLat: internal.businessLat,
      businessLng: internal.businessLng,
      direction: internal.direction,
      emergencyData: internal.emergencyData,
    };
  }

  toPublicList(internals: AdInstructionResult[]): PublicAdInstruction[] {
    return internals.map((i) => this.toPublic(i));
  }
}

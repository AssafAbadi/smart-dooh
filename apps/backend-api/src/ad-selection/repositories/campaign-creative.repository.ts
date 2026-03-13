import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CandidateAd } from '../interfaces/ad-selection.interface';

/**
 * Returns candidate ads (campaign + creative) for given business IDs, active only, with budget.
 */
@Injectable()
export class CampaignCreativeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidatesByBusinessIds(businessIds: string[], lat?: number, lng?: number): Promise<CandidateAd[]> {
    if (businessIds.length === 0) return [];
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        businessId: { in: businessIds },
        active: true,
        budgetRemaining: { gt: 0 },
      },
      include: {
        creatives: { where: { status: 'APPROVED' } },
      },
    });
    
    // Filter by geofence if location provided
    const filteredCampaigns = lat != null && lng != null
      ? campaigns.filter((c) => this.isWithinGeofence(c.geofence, lat, lng))
      : campaigns;
    
    const result: CandidateAd[] = [];
    for (const c of filteredCampaigns) {
      for (const cr of c.creatives) {
        result.push({
          campaignId: c.id,
          creativeId: cr.id,
          variantId: cr.variantId ?? undefined,
          headline: cr.headline,
          body: cr.body ?? undefined,
          imageUrl: cr.imageUrl ?? undefined,
          couponCode: cr.couponCode ?? undefined,
          businessId: c.businessId,
          cpm: c.cpm,
          budgetRemaining: c.budgetRemaining,
        });
      }
    }
    return result;
  }

  /**
   * Check if a location is within a campaign's geofence
   */
  private isWithinGeofence(geofence: any, lat: number, lng: number): boolean {
    if (!geofence || geofence.type !== 'circle') {
      // No geofence or unsupported type = include everywhere
      return true;
    }

    const { lat: centerLat, lng: centerLng, radiusMeters } = geofence;
    if (typeof centerLat !== 'number' || typeof centerLng !== 'number' || typeof radiusMeters !== 'number') {
      return true; // Invalid geofence data
    }

    // Haversine formula to calculate distance in meters
    const R = 6371000; // Earth's radius in meters
    const φ1 = (centerLat * Math.PI) / 180;
    const φ2 = (lat * Math.PI) / 180;
    const Δφ = ((lat - centerLat) * Math.PI) / 180;
    const Δλ = ((lng - centerLng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusMeters;
  }

  /** Haversine distance in meters (for logging). */
  private distanceMeters(geofence: any, lat: number, lng: number): number | null {
    if (!geofence || geofence.type !== 'circle') return null;
    const { lat: centerLat, lng: centerLng, radiusMeters } = geofence;
    if (typeof centerLat !== 'number' || typeof centerLng !== 'number') return null;
    const R = 6371000;
    const φ1 = (centerLat * Math.PI) / 180;
    const φ2 = (lat * Math.PI) / 180;
    const Δφ = ((lat - centerLat) * Math.PI) / 180;
    const Δλ = ((lng - centerLng) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /** For logging and display: distance, radius, and geofence center per campaign. */
  async getCampaignDistances(
    businessIds: string[],
    lat: number,
    lng: number
  ): Promise<{ businessId: string; campaignId: string; distanceMeters: number; radiusMeters: number; inRange: boolean; lat: number; lng: number }[]> {
    if (businessIds.length === 0) return [];
    const campaigns = await this.prisma.campaign.findMany({
      where: { businessId: { in: businessIds }, active: true },
      select: { id: true, businessId: true, geofence: true },
    });
    const out: { businessId: string; campaignId: string; distanceMeters: number; radiusMeters: number; inRange: boolean; lat: number; lng: number }[] = [];
    for (const c of campaigns) {
      const geo = c.geofence as { type?: string; lat?: number; lng?: number; radiusMeters?: number } | null;
      if (!geo || geo.type !== 'circle' || typeof geo.lat !== 'number' || typeof geo.lng !== 'number' || typeof geo.radiusMeters !== 'number') {
        out.push({ businessId: c.businessId, campaignId: c.id, distanceMeters: 0, radiusMeters: 0, inRange: true, lat: lat, lng: lng });
        continue;
      }
      const dist = this.distanceMeters(geo, lat, lng) ?? 0;
      out.push({
        businessId: c.businessId,
        campaignId: c.id,
        distanceMeters: Math.round(dist),
        radiusMeters: geo.radiusMeters,
        inRange: dist <= geo.radiusMeters,
        lat: geo.lat,
        lng: geo.lng,
      });
    }
    return out;
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Returns the maximum boostFactor among active events that contain (lat, lng) within radius.
 * Uses simple Euclidean distance (approximate for small radii).
 */
@Injectable()
export class LiveEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getBoostForLocation(lat: number, lng: number): Promise<number> {
    const now = new Date();
    const events = await this.prisma.liveEvent.findMany({
      where: { expiresAt: { gt: now } },
    });
    let maxBoost = 1.0;
    for (const event of events) {
      const distMeters = haversineMeters(lat, lng, event.lat, event.lng);
      if (distMeters <= event.radius && event.boostFactor > maxBoost) {
        maxBoost = event.boostFactor;
      }
    }
    return maxBoost;
  }
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

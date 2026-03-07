import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { EmergencyAlertRecord, IEmergencyAlertRepository } from '../interfaces/ad-selection.interface';
import { haversineMeters } from '../../external-api/utils/distance';

@Injectable()
export class EmergencyAlertRepository implements IEmergencyAlertRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveForLocation(lat: number, lng: number): Promise<EmergencyAlertRecord | null> {
    const alerts = await this.prisma.emergencyAlert.findMany({
      where: { active: true },
    });
    for (const a of alerts) {
      const dist = haversineMeters(a.lat, a.lng, lat, lng);
      if (dist <= a.radiusMeters) {
        return {
          id: a.id,
          headline: a.headline,
          body: a.body,
          lat: a.lat,
          lng: a.lng,
          radiusMeters: a.radiusMeters,
        };
      }
    }
    return null;
  }
}

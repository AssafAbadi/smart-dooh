import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { toGeohash7 } from '../../core/utils/geohash.util';

export interface RecordImpressionInput {
  clientUuid: string;
  campaignId: string;
  creativeId: string;
  deviceId: string;
  driverId?: string;
  lat: number;
  lng: number;
  geohash: string;
  speedKmh?: number;
  dwellSeconds?: number;
}

@Injectable()
export class ImpressionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertByClientUuid(input: RecordImpressionInput): Promise<void> {
    const geohashNormalized = toGeohash7(input.geohash);
    await this.prisma.impression.upsert({
      where: { clientUuid: input.clientUuid },
      create: {
        clientUuid: input.clientUuid,
        campaignId: input.campaignId,
        creativeId: input.creativeId,
        deviceId: input.deviceId,
        driverId: input.driverId ?? null,
        lat: input.lat,
        lng: input.lng,
        geohash: geohashNormalized,
      },
      update: {
        campaignId: input.campaignId,
        creativeId: input.creativeId,
        deviceId: input.deviceId,
        driverId: input.driverId ?? null,
        lat: input.lat,
        lng: input.lng,
        geohash: geohashNormalized,
      },
    });
  }

  async count(byClientUuid?: string): Promise<number> {
    if (byClientUuid) {
      return this.prisma.impression.count({ where: { clientUuid: byClientUuid } });
    }
    return this.prisma.impression.count();
  }
}

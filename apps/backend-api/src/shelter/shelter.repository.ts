import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { haversineMeters, boundingBox } from '../core/utils/geo.util';
import type { IShelterRepository, ShelterRecord, ShelterWithDistance } from './interfaces/shelter.interface';

const UPSERT_BATCH_SIZE = 100;

@Injectable()
export class ShelterRepository implements IShelterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(shelters: Omit<ShelterRecord, 'id'>[]): Promise<number> {
    let upserted = 0;
    for (let i = 0; i < shelters.length; i += UPSERT_BATCH_SIZE) {
      const batch = shelters.slice(i, i + UPSERT_BATCH_SIZE);
      const ops = batch.map((s) =>
        this.prisma.shelter.upsert({
          where: { externalId: s.externalId },
          create: {
            externalId: s.externalId,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            lastUpdated: s.lastUpdated,
          },
          update: {
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            lastUpdated: s.lastUpdated,
          },
        }),
      );
      await this.prisma.$transaction(ops);
      upserted += batch.length;
    }
    return upserted;
  }

  async findNearby(lat: number, lng: number, radiusMeters: number): Promise<ShelterWithDistance[]> {
    const box = boundingBox(lat, lng, radiusMeters);
    const candidates = await this.prisma.shelter.findMany({
      where: {
        lat: { gte: box.minLat, lte: box.maxLat },
        lng: { gte: box.minLng, lte: box.maxLng },
      },
    });
    return candidates
      .map((s) => ({
        id: s.id,
        externalId: s.externalId,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        lastUpdated: s.lastUpdated,
        distanceMeters: haversineMeters(lat, lng, s.lat, s.lng),
      }))
      .filter((s) => s.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  async findNearestN(lat: number, lng: number, count: number): Promise<ShelterWithDistance[]> {
    const nearby = await this.findNearby(lat, lng, 2000);
    return nearby.slice(0, count);
  }

  async count(): Promise<number> {
    return this.prisma.shelter.count();
  }
}

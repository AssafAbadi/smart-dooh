import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ICarScreenRepository } from '../../core/interfaces/car-screen-repository.interface';

@Injectable()
export class CarScreenRepository implements ICarScreenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateHeartbeat(deviceId: string, driverId?: string): Promise<void> {
    await this.prisma.carScreen.upsert({
      where: { deviceId },
      create: {
        deviceId,
        driverId: driverId ?? null,
        lastHeartbeat: new Date(),
      },
      update: {
        lastHeartbeat: new Date(),
        ...(driverId !== undefined && { driverId }),
      },
    });
  }
}

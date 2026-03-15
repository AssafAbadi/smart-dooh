import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DriverRepository {
  constructor(private readonly prisma: PrismaService) {}

  async incrementBalance(driverId: string, amount: number): Promise<void> {
    await this.prisma.driver.update({
      where: { id: driverId },
      data: { balance: { increment: amount } },
    });
  }

  /** Upsert push token for a driver. Creates the driver if they do not exist. */
  async upsertPushToken(driverId: string, pushToken: string): Promise<void> {
    await this.prisma.driver.upsert({
      where: { id: driverId },
      create: { id: driverId, pushToken },
      update: { pushToken },
    });
  }

  /** Return driverId -> pushToken for drivers that have a non-null pushToken. */
  async getDriversPushTokens(driverIds: string[]): Promise<Map<string, string>> {
    if (driverIds.length === 0) return new Map();
    const drivers = await this.prisma.driver.findMany({
      where: { id: { in: driverIds }, pushToken: { not: null } },
      select: { id: true, pushToken: true },
    });
    const map = new Map<string, string>();
    for (const d of drivers) {
      if (d.pushToken) map.set(d.id, d.pushToken);
    }
    return map;
  }

  /** Return all driver IDs that have a registered push token (for notifying offline drivers on alert). */
  async getDriverIdsWithPushTokens(): Promise<string[]> {
    const drivers = await this.prisma.driver.findMany({
      where: { pushToken: { not: null } },
      select: { id: true },
    });
    return drivers.map((d) => d.id);
  }
}

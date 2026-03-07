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
}

import { Injectable } from '@nestjs/common';
import { CreativeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCreativeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(options: { status?: CreativeStatus } = {}) {
    const where = options.status ? { status: options.status } : {};
    return this.prisma.creative.findMany({
      where,
      include: { campaign: { include: { business: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findUnique(id: string) {
    return this.prisma.creative.findUnique({ where: { id } });
  }

  updateStatus(id: string, status: CreativeStatus) {
    return this.prisma.creative.update({
      where: { id },
      data: { status },
    });
  }
}

import { Injectable } from '@nestjs/common';
import type { Creative } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository, type PrismaDelegateLike } from '../../core/repositories/base.repository';

export interface CreateCreativeData {
  campaignId: string;
  headline: string;
  body: string | null;
  couponCode?: string;
  status?: string;
  trendContext?: string | null;
}

@Injectable()
export class CreativeRepository extends BaseRepository<Creative> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected getDelegate(): PrismaDelegateLike {
    return this.prisma.creative;
  }

  async create(data: CreateCreativeData): Promise<Creative> {
    return this.createOne({
      data: {
        campaignId: data.campaignId,
        headline: data.headline,
        body: data.body,
        couponCode: data.couponCode,
        status: (data.status as 'PENDING' | 'APPROVED' | 'REJECTED') ?? 'PENDING',
        trendContext: data.trendContext,
      },
    });
  }

  async findById(id: string): Promise<Creative | null> {
    return this.findUnique({ where: { id } });
  }
}

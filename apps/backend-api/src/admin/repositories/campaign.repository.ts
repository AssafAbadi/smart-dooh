import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateCampaignData {
  businessId: string;
  cpm: number;
  budgetRemaining: number;
  active?: boolean;
  geofence?: { type: 'circle'; lat: number; lng: number; radiusMeters: number } | { type: 'polygon'; coordinates: number[][] };
}

export interface UpdateCampaignData {
  cpm?: number;
  budgetRemaining?: number;
  active?: boolean;
  geofence?: { type: 'circle'; lat: number; lng: number; radiusMeters: number } | { type: 'polygon'; coordinates: number[][] } | null;
}

@Injectable()
export class AdminCampaignRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany() {
    return this.prisma.campaign.findMany({
      include: { business: true, creatives: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findUnique(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: { business: true, creatives: true },
    });
  }

  create(data: CreateCampaignData) {
    return this.prisma.campaign.create({
      data: {
        businessId: data.businessId,
        cpm: data.cpm,
        budgetRemaining: data.budgetRemaining,
        active: data.active ?? true,
        geofence: data.geofence ?? undefined,
      },
      include: { business: true },
    });
  }

  update(id: string, data: UpdateCampaignData) {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(data.cpm != null && { cpm: data.cpm }),
        ...(data.budgetRemaining != null && { budgetRemaining: data.budgetRemaining }),
        ...(data.active != null && { active: data.active }),
        ...(data.geofence !== undefined && {
          geofence: data.geofence === null ? Prisma.JsonNull : data.geofence,
        }),
      },
      include: { business: true, creatives: true },
    });
  }

  delete(id: string) {
    return this.prisma.campaign.delete({ where: { id } });
  }
}

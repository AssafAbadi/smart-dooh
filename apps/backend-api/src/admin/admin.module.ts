import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAnalyticsRepository } from './repositories/admin-analytics.repository';
import { AdminCampaignRepository } from './repositories/campaign.repository';
import { AdminCreativeRepository } from './repositories/creative.repository';
import { RedemptionRepository } from './repositories/redemption.repository';
import { AdSelectionModule } from '../ad-selection/ad-selection.module';

@Module({
  imports: [PrismaModule, AdSelectionModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminAnalyticsRepository,
    AdminCreativeRepository,
    AdminCampaignRepository,
    RedemptionRepository,
  ],
  exports: [AdminService],
})
export class AdminModule {}

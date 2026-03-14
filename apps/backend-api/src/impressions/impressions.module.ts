import { Module } from '@nestjs/common';
import { ImpressionsController } from './impressions.controller';
import { ImpressionsService } from './impressions.service';
import { ImpressionsRepository } from './repositories/impressions.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { ImpressionEstimatorModule } from '../impression-estimator/impression-estimator.module';
import { CampaignModule } from '../campaign/campaign.module';
import { DriverModule } from '../driver/driver.module';
import { AdSelectionModule } from '../ad-selection/ad-selection.module';

@Module({
  imports: [PrismaModule, ImpressionEstimatorModule, CampaignModule, DriverModule, AdSelectionModule],
  controllers: [ImpressionsController],
  providers: [ImpressionsService, ImpressionsRepository],
  exports: [ImpressionsService],
})
export class ImpressionsModule {}

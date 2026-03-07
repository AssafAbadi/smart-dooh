import { Module } from '@nestjs/common';
import { CampaignRepository } from './repositories/campaign.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CampaignRepository],
  exports: [CampaignRepository],
})
export class CampaignModule {}

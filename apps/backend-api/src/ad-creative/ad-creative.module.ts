import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CreativeRepository } from './repositories/creative.repository';
import { TrendsService } from './services/trends.service';
import { LLMService } from './services/llm.service';
import { AdCreativeService } from './ad-creative.service';
import { AdCreativeController } from './ad-creative.controller';

@Module({
  imports: [RedisModule, PrismaModule],
  controllers: [AdCreativeController],
  providers: [CreativeRepository, TrendsService, LLMService, AdCreativeService],
  exports: [AdCreativeService],
})
export class AdCreativeModule {}

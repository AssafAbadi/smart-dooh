import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { ShelterRepository } from './shelter.repository';
import { ShelterService } from './shelter.service';
import { ShelterSyncService } from './shelter-sync.service';
import { ShelterController } from './shelter.controller';
import { GisShelterClient } from './gis-shelter.client';
import { TOKENS } from '../core/constants/tokens';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [ShelterController],
  providers: [
    ShelterRepository,
    { provide: TOKENS.IShelterRepository, useExisting: ShelterRepository },
    GisShelterClient,
    { provide: TOKENS.IGisShelterClient, useExisting: GisShelterClient },
    ShelterService,
    ShelterSyncService,
  ],
  exports: [ShelterService, ShelterRepository],
})
export class ShelterModule {}

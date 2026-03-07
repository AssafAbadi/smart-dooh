import { Module } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { CarScreenRepository } from './repositories/car-screen.repository';
import { CarScreenController } from './car-screen.controller';
import { CarScreenService } from './car-screen.service';

@Module({
  controllers: [CarScreenController],
  providers: [
    CarScreenService,
    CarScreenRepository,
    { provide: TOKENS.ICarScreenRepository, useExisting: CarScreenRepository },
  ],
})
export class CarScreenModule {}

import { Module } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { RateLimitService } from './rate-limit.service';

@Module({
  providers: [
    RateLimitService,
    { provide: TOKENS.IRateLimitService, useExisting: RateLimitService },
  ],
  exports: [TOKENS.IRateLimitService, RateLimitService],
})
export class RateLimitModule {}

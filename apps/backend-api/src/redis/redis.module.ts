import { Global, Module } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    { provide: TOKENS.IRedisService, useExisting: RedisService },
  ],
  exports: [TOKENS.IRedisService, RedisService],
})
export class RedisModule {}

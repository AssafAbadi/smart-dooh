import { Module } from '@nestjs/common';
import { TOKENS } from '../core/constants/tokens';
import { RateLimitModule } from '../rate-limit/rate-limit.module';
import { ContextController } from './context.controller';
import { ContextService } from './context.service';
import { ContextSnapshotRepository } from './repositories/context-snapshot.repository';

@Module({
  imports: [RateLimitModule],
  controllers: [ContextController],
  providers: [
    ContextService,
    ContextSnapshotRepository,
    { provide: TOKENS.IContextSnapshotRepository, useExisting: ContextSnapshotRepository },
  ],
})
export class ContextModule {}

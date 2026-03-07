import { Inject, Injectable } from '@nestjs/common';
import type { ContextSnapshot } from '@smart-dooh/shared-dto';
import type { IContextSnapshotRepository } from '../core/interfaces/context-repository.interface';
import { TOKENS } from '../core/constants/tokens';

export type SubmitSnapshotResult = { ok: true; data: ContextSnapshot };

/**
 * Business logic: persist context snapshots. Validation at API boundary (ZodValidationPipe).
 */
@Injectable()
export class ContextService {
  constructor(
    @Inject(TOKENS.IContextSnapshotRepository)
    private readonly repository: IContextSnapshotRepository
  ) {}

  async submitSnapshot(data: ContextSnapshot): Promise<SubmitSnapshotResult> {
    await this.repository.save(data);
    return { ok: true, data };
  }
}

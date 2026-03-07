import { Injectable } from '@nestjs/common';
import type { ContextSnapshot } from '@smart-dooh/shared-dto';
import type { IContextSnapshotRepository } from '../../core/interfaces/context-repository.interface';

/**
 * DAL: persistence of context snapshots. Stub implementation (no DB yet).
 * Replace with Prisma/PostGIS implementation when adding persistence.
 */
@Injectable()
export class ContextSnapshotRepository implements IContextSnapshotRepository {
  async save(snapshot: ContextSnapshot): Promise<void> {
    // Stub: no persistence in scaffold. Add Prisma/queue later.
    await Promise.resolve(snapshot);
  }
}

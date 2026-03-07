import type { ContextSnapshot } from '@smart-dooh/shared-dto';

/**
 * Data Access Layer: persistence of context snapshots.
 * Implement with Prisma/PostGIS, queue, or stub for scaffold.
 */
export interface IContextSnapshotRepository {
  save(snapshot: ContextSnapshot): Promise<void>;
}

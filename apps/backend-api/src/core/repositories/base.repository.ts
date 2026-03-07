import { PrismaService } from '../../prisma/prisma.service';

/**
 * Minimal Prisma delegate interface for common CRUD.
 * Concrete repositories pass this.prisma.<model> as the delegate.
 * Uses any for args so Prisma's stricter delegate types are assignable.
 */
export interface PrismaDelegateLike {
  findUnique: (args: any) => Promise<unknown>;
  findFirst: (args: any) => Promise<unknown>;
  create: (args: any) => Promise<unknown>;
  update: (args: any) => Promise<unknown>;
  delete: (args: any) => Promise<unknown>;
}

/**
 * Abstract base for repositories that wrap a single Prisma model delegate.
 * Ensures consistent access to Prisma and optional shared helpers.
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  protected abstract getDelegate(): PrismaDelegateLike;

  protected findUnique(args: unknown): Promise<T | null> {
    return this.getDelegate().findUnique(args) as Promise<T | null>;
  }

  protected findFirst(args: unknown): Promise<T | null> {
    return this.getDelegate().findFirst(args) as Promise<T | null>;
  }

  /** Use from subclass for single-entity create. */
  protected createOne(args: unknown): Promise<T> {
    return this.getDelegate().create(args) as Promise<T>;
  }

  protected update(args: unknown): Promise<T> {
    return this.getDelegate().update(args) as Promise<T>;
  }

  protected delete(args: unknown): Promise<T> {
    return this.getDelegate().delete(args) as Promise<T>;
  }
}

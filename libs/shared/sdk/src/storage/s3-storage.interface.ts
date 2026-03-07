import { StorageService } from './storage.interface';

/**
 * S3-ready storage interface. Implement with AWS SDK when needed.
 */
export interface S3StorageProviderOptions {
  bucket: string;
  region?: string;
}

export interface S3StorageProvider extends StorageService {
  // Same as StorageService; add S3-specific options in implementation
}

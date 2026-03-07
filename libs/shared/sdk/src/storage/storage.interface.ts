export interface StorageService {
  upload(buffer: Buffer, key: string, contentType?: string): Promise<string>;
  getUrl(key: string): Promise<string>;
}

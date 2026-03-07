import * as fs from 'fs';
import * as path from 'path';
import { StorageService } from './storage.interface';

export class LocalStorageProvider implements StorageService {
  constructor(private readonly basePath: string) {}

  async upload(buffer: Buffer, key: string, _contentType?: string): Promise<string> {
    const fullPath = path.join(this.basePath, key);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    return key;
  }

  async getUrl(key: string): Promise<string> {
    return path.join(this.basePath, key);
  }
}

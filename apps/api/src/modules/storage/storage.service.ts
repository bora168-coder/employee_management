import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { APP_ENV, AppEnv } from '../../config/env';
import { LocalStorageDriver } from './local.driver';
import { S3StorageDriver } from './s3.driver';
import { StorageDriver, StoredObject } from './storage.types';

/**
 * Private file storage (photos, attachments). Files are never public:
 * controllers stream them to the client after permission checks.
 */
@Injectable()
export class StorageService {
  private readonly driver: StorageDriver;

  constructor(@Inject(APP_ENV) env: AppEnv) {
    this.driver =
      env.STORAGE_DRIVER === 's3'
        ? new S3StorageDriver({
            endpoint: env.S3_ENDPOINT!,
            region: env.S3_REGION,
            accessKeyId: env.S3_ACCESS_KEY!,
            secretAccessKey: env.S3_SECRET_KEY!,
            bucket: env.S3_BUCKET,
          })
        : new LocalStorageDriver(env.STORAGE_LOCAL_DIR);
  }

  put(key: string, body: Buffer, contentType: string): Promise<void> {
    return this.driver.put(key, body, contentType);
  }

  /** Stream for download. Throws 404 when the file is missing. */
  async get(key: string): Promise<StoredObject> {
    const obj = await this.driver.get(key);
    if (!obj) throw new NotFoundException({ error: 'NOT_FOUND', message: 'File not found' });
    return obj;
  }

  /** Whole file in memory (small files only, e.g. photos for the PDF). */
  async getBuffer(key: string): Promise<Buffer> {
    const { body } = await this.get(key);
    const chunks: Buffer[] = [];
    for await (const chunk of body) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  /** Deleting a missing file is not an error. */
  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  /** Used by /health. Throws when storage is not reachable or not writable. */
  check(): Promise<void> {
    return this.driver.check();
  }
}

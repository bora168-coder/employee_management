import { Readable } from 'stream';

export interface StoredObject {
  body: Readable;
  contentType: string;
}

export interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** null when the file does not exist */
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  check(): Promise<void>;
}

import { createReadStream } from 'fs';
import { access, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { StorageDriver, StoredObject } from './storage.types';

const META_SUFFIX = '.meta.json';

/** Files in a folder on disk. The content type is kept in a small side file. */
export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(dir: string) {
    this.root = path.resolve(dir);
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    await writeFile(file + META_SUFFIX, JSON.stringify({ contentType }));
  }

  async get(key: string): Promise<StoredObject | null> {
    const file = this.resolve(key);
    try {
      await access(file, constants.R_OK);
    } catch {
      return null;
    }
    let contentType = 'application/octet-stream';
    try {
      contentType = JSON.parse(await readFile(file + META_SUFFIX, 'utf8')).contentType ?? contentType;
    } catch {
      // no side file: keep the default type
    }
    return { body: createReadStream(file), contentType };
  }

  async delete(key: string): Promise<void> {
    const file = this.resolve(key);
    await rm(file, { force: true });
    await rm(file + META_SUFFIX, { force: true });
  }

  async check(): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await access(this.root, constants.R_OK | constants.W_OK);
  }

  /** Maps a key to a path and refuses keys that leave the storage folder. */
  private resolve(key: string): string {
    const file = path.resolve(this.root, key);
    if (!file.startsWith(this.root + path.sep)) throw new Error(`Invalid storage key: ${key}`);
    return file;
  }
}

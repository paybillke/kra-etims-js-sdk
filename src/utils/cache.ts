import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';

export interface TokenCache {
  access_token: string;
  expires_at: number; // Unix timestamp
}

export class TokenCacheManager {
  private cachePath: string;

  constructor(private cacheFile?: string) {
    this.cachePath = cacheFile || join(tmpdir(), 'kra_etims_token.json');
  }

  async read(): Promise<TokenCache | null> {
    try {
      if (!(await fs.stat(this.cachePath)).isFile()) return null;
      const data = await fs.readFile(this.cachePath, 'utf-8');
      return JSON.parse(data) as TokenCache;
    } catch {
      return null;
    }
  }

  async write(token: TokenCache): Promise<void> {
    await fs.mkdir(dirname(this.cachePath), { recursive: true });
    await fs.writeFile(this.cachePath, JSON.stringify(token, null, 2));
  }

  async clear(): Promise<void> {
    try {
      await fs.unlink(this.cachePath);
    } catch {
      // Ignore missing file errors
    }
  }
}
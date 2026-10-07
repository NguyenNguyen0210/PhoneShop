import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const normalizeQuery = (text: string): string =>
  String(text || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly config: ConfigService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  async embed(text: string): Promise<number[]> {
    // Câu hỏi lặp (hỏi dồn, reindex) dùng lại vector 1h — bớt call Gemini, tránh 429.
    const cacheKey = `chatbot:embed:${normalizeQuery(text)}`;
    if (this.cache) {
      try {
        const hit = await this.cache.get<number[]>(cacheKey);
        if (Array.isArray(hit) && hit.length === 768) return hit;
      } catch {
        // Cache lỗi thì gọi API như thường
      }
    }
    const apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const model =
      this.config.get<string>('GEMINI_EMBED_MODEL') ||
      process.env.GEMINI_EMBED_MODEL ||
      'gemini-embedding-001';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      let res: Response | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                model: `models/${model}`,
                content: { parts: [{ text }] },
                outputDimensionality: 768,
              }),
            },
          );
        } catch (err: any) {
          if (attempt === 3) throw err;
          this.logger.warn(`Embed network error, retry in 2s: ${err?.message || err}`);
          await sleep(2000);
          continue;
        }
        if (res.ok) break;
        const retryAfterSec = Number(res.headers?.get?.('retry-after') ?? 0);
        const waitMs =
          Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 15000) : 2000;
        if ((res.status !== 429 && (res.status < 500 || res.status > 599)) || attempt === 3) {
          throw new Error(`Embed HTTP ${res.status}`);
        }
        this.logger.warn(`Embed hit ${res.status}, retry in ${Math.round(waitMs)}ms`);
        await sleep(waitMs);
      }
      const data: any = await res!.json();
      const values: number[] = data?.embedding?.values || [];
      if (values.length !== 768) throw new Error(`Unexpected embedding dim ${values.length}`);
      if (this.cache) {
        try {
          await this.cache.set(cacheKey, values, 3_600_000);
        } catch {
          // Bỏ qua lỗi ghi cache
        }
      }
      return values;
    } catch (err: any) {
      this.logger.warn(`Embed failed: ${err?.message || err}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

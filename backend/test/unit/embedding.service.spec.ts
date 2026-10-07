import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from '../../src/modules/rag/embedding.service';

const vec = () => new Array(768).fill(0.1);

describe('EmbeddingService cache', () => {
  let store: Map<string, any>;
  let fakeCache: any;
  let service: EmbeddingService;

  beforeEach(() => {
    store = new Map();
    fakeCache = {
      get: (jest.fn() as any).mockImplementation(async (k: string) => store.get(k)),
      set: (jest.fn() as any).mockImplementation(async (k: string, v: any) => {
        store.set(k, v);
      }),
    };
    const mockConfig = new ConfigService({ GEMINI_API_KEY: 'k' });
    service = new EmbeddingService(mockConfig as any, fakeCache as any);
  });

  it('should call API once for repeated same query (cache hit)', async () => {
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: vec() } }),
    });

    const first = await service.embed('  Máy PIN trâu  ');
    const second = await service.embed('máy pin trâu');

    expect(first).toHaveLength(768);
    expect(second).toEqual(first);
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
    (global as any).fetch = undefined;
  });

  it('should work without cache manager', async () => {
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: { values: vec() } }),
    });
    const noCache = new EmbeddingService(new ConfigService({ GEMINI_API_KEY: 'k' }) as any);

    const values = await noCache.embed('pin trâu');

    expect(values).toHaveLength(768);
    (global as any).fetch = undefined;
  });
});

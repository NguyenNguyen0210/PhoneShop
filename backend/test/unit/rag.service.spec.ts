import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { RagService } from '../../src/modules/rag/rag.service';

describe('RagService Unit Tests', () => {
  let service: RagService;
  let mockPrisma: any;
  let mockEmbedding: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: (jest.fn() as any).mockResolvedValue(null),
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
      productVariant: { findFirst: (jest.fn() as any).mockResolvedValue(null) },
      $executeRaw: (jest.fn() as any).mockResolvedValue(1),
      $queryRaw: (jest.fn() as any).mockResolvedValue([]),
    };
    mockEmbedding = { embed: (jest.fn() as any).mockResolvedValue(new Array(768).fill(0.1)) };
    const mockConfig = new ConfigService({ GEMINI_API_KEY: 'k' });
    void mockConfig;
    service = new RagService(mockPrisma as any, mockEmbedding as any);
  });

  it('should upsert product chunk with vector literal', async () => {
    (mockPrisma.product.findUnique as any).mockResolvedValue({
      id: 'p1', slug: 'samsung-galaxy-a56', name: 'Galaxy A56', status: 'ACTIVE',
      shortDescription: 'Pin trau', specs: { battery: '5000mAh' }, warrantyMonths: 12,
      brand: { name: 'Samsung' },
    });
    (mockPrisma.productVariant.findFirst as any).mockResolvedValue({ price: 12990000 });

    await service.indexProduct('p1');

    expect(mockEmbedding.embed).toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it('should remove chunk when product inactive', async () => {
    (mockPrisma.product.findUnique as any).mockResolvedValue({ id: 'p1', slug: 'old-phone', status: 'DRAFT' });

    await service.indexProduct('p1');

    expect(mockEmbedding.embed).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it('should filter vector hits by maxPrice via SQL hydration', async () => {
    (mockPrisma.$queryRaw as any).mockResolvedValue([
      { slug: 'cheap-phone', score: 0.1 },
      { slug: 'expensive-phone', score: 0.2 },
    ]);
    (mockPrisma.product.findMany as any).mockResolvedValue([
      { slug: 'cheap-phone', variants: [{ price: 10000000, inventory: { availableQty: 5 } }] },
    ]);

    const hits = await service.searchProducts('pin trau', { maxPrice: 15000000, limit: 5 });

    expect(hits.map((h) => h.slug)).toEqual(['cheap-phone']);
  });

  it('should return [] when embedding fails', async () => {
    (mockEmbedding.embed as any).mockRejectedValue(new Error('Embed HTTP 429'));

    await expect(service.searchProducts('pin trau')).resolves.toEqual([]);
  });
});

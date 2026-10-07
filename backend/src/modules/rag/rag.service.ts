import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { SHOP_FAQ } from '../chatbot/data/faq';

export interface RagProductHit {
  slug: string;
  score: number;
}

const toVectorLiteral = (v: number[]): string => `[${v.join(',')}]`;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: EmbeddingService,
  ) {}

  buildProductContent(p: any): string {
    const specs = p.specs && typeof p.specs === 'object'
      ? Object.entries(p.specs).slice(0, 6).map(([k, v]) => `${k}: ${String(v)}`).join('; ')
      : '';
    return [`${p.brand?.name || ''} ${p.name}`.trim(), p.shortDescription || '', specs, `BH ${p.warrantyMonths ?? 12} tháng`]
      .filter(Boolean)
      .join(' | ');
  }

  private async upsertChunk(docType: string, docId: string, content: string, metadata: any, vector: number[]): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "document_chunks" ("id", "doc_type", "doc_id", "content", "metadata", "embedding", "updated_at")
      VALUES (gen_random_uuid(), ${docType}, ${docId}, ${content}, ${JSON.stringify(metadata)}::jsonb, ${toVectorLiteral(vector)}::vector, NOW())
      ON CONFLICT ("doc_type", "doc_id")
      DO UPDATE SET "content" = EXCLUDED."content", "metadata" = EXCLUDED."metadata",
        "embedding" = EXCLUDED."embedding", "updated_at" = NOW()`;
  }

  async indexProduct(productId: string): Promise<void> {
    const p: any = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { brand: { select: { name: true } } },
    });
    if (!p) return;
    if (p.status !== 'ACTIVE') {
      await this.removeChunk('PRODUCT', p.slug);
      return;
    }
    const cheapest: any = await this.prisma.productVariant.findFirst({
      where: { productId, isActive: true },
      orderBy: { price: 'asc' },
      select: { price: true },
    });
    const vector = await this.embedding.embed(this.buildProductContent(p));
    await this.upsertChunk('PRODUCT', p.slug, this.buildProductContent(p), {
      slug: p.slug,
      brand: p.brand?.name,
      minPrice: cheapest ? Number(cheapest.price) : null,
    }, vector);
  }

  async removeChunk(docType: string, docId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM "document_chunks" WHERE "doc_type" = ${docType} AND "doc_id" = ${docId}`;
  }

  async searchProducts(query: string, opts: { maxPrice?: number; limit?: number } = {}): Promise<RagProductHit[]> {
    const limit = Math.min(8, Math.max(1, opts.limit ?? 5));
    let vector: number[];
    try {
      vector = await this.embedding.embed(query);
    } catch (err) {
      this.logger.warn(`RAG embed failed, skip vector: ${(err as Error)?.message}`);
      return [];
    }
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT "metadata"->>'slug' AS slug, ("embedding" <=> ${toVectorLiteral(vector)}::vector) AS score
      FROM "document_chunks"
      WHERE "doc_type" = 'PRODUCT'
      ORDER BY "embedding" <=> ${toVectorLiteral(vector)}::vector
      LIMIT ${limit * 2}`;
    const hits: RagProductHit[] = [];
    for (const r of rows || []) {
      if (!r?.slug) continue;
      hits.push({ slug: String(r.slug), score: Number(r.score) });
      if (hits.length >= limit * 2) break;
    }
    if (opts.maxPrice !== undefined) {
      const slugs = hits.map((h) => h.slug);
      if (slugs.length === 0) return [];
      const inStock: any[] = await this.prisma.product.findMany({
        where: { slug: { in: slugs }, status: 'ACTIVE' as any },
        include: {
          variants: {
            where: { isActive: true },
            take: 1,
            orderBy: { price: 'asc' },
            select: { price: true, inventory: { select: { availableQty: true } } },
          },
        },
      });
      const ok = new Map(
        inStock
          .filter((p: any) => (p.variants?.[0]?.inventory?.availableQty || 0) > 0 && Number(p.variants[0].price) <= opts.maxPrice!)
          .map((p: any) => [p.slug, true]),
      );
      return hits.filter((h) => ok.has(h.slug)).slice(0, limit);
    }
    return hits.slice(0, limit);
  }

  async reindexAll(): Promise<{ products: number; faq: number }> {
    const products: any[] = await this.prisma.product.findMany({
      where: { status: 'ACTIVE' as any },
      include: { brand: { select: { name: true } } },
    });
    let done = 0;
    for (const p of products) {
      try {
        await this.indexProduct(p.id);
        done++;
      } catch (err) {
        this.logger.warn(`Index product ${p.slug} failed: ${(err as Error)?.message}`);
      }
    }
    let faqDone = 0;
    for (const f of SHOP_FAQ) {
      try {
        const vector = await this.embedding.embed(`${f.question} ${f.answer}`);
        await this.upsertChunk('FAQ', f.question, `${f.question} ${f.answer}`, {}, vector);
        faqDone++;
      } catch (err) {
        this.logger.warn(`Index FAQ failed: ${(err as Error)?.message}`);
      }
    }
    return { products: done, faq: faqDone };
  }
}

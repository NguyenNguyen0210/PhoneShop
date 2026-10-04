import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ChatbotService } from '../../src/modules/chatbot/chatbot.service';
import { ConfigService } from '@nestjs/config';

describe('ChatbotService Unit Tests', () => {
  let service: ChatbotService;
  let mockPrisma: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
      flashSaleCampaign: {
        findMany: (jest.fn() as any).mockResolvedValue([
          {
            id: 'campaign-1',
            name: 'Flash Sale Giữa Tháng',
            isActive: true,
            startAt: new Date(Date.now() - 3600000),
            endAt: new Date(Date.now() + 86400000),
            items: [
              {
                flashPrice: 27271000,
                stockLimit: 20,
                soldCount: 4,
                variant: {
                  id: 'var-1',
                  name: 'iPhone 16 Pro Max 256GB - Titan Sa Mạc',
                  imageUrl: '/images/ip16.png',
                  price: 30990000,
                  compareAtPrice: 34990000,
                  inventory: { availableQty: 16 },
                  product: {
                    id: 'prod-1',
                    slug: 'iphone-16-pro-max',
                    name: 'iPhone 16 Pro Max',
                    brand: { name: 'Apple' },
                    thumbnailUrl: '/images/ip16.png',
                    warrantyMonths: 12,
                    specs: { chip: 'A18 Pro', ram: '8GB', storage: '256GB' },
                    variants: [
                      {
                        id: 'var-1',
                        name: 'iPhone 16 Pro Max 256GB - Titan Sa Mạc',
                        price: 30990000,
                        compareAtPrice: 34990000,
                        inventory: { availableQty: 16 },
                      },
                    ],
                  },
                },
              },
            ],
          },
        ]),
      },
      voucher: {
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
      systemSetting: {
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
      order: {
        findMany: (jest.fn() as any).mockResolvedValue([]),
      },
    };

    mockConfig = new ConfigService({
      CHATBOT_ENABLED: 'true',
      GEMINI_API_KEY: '', // Test fallback response
      GEMINI_MODEL: 'gemini-3.5-flash-lite',
    });

    service = new ChatbotService(mockPrisma as any, mockConfig as any);
  });

  it('should find flash sale products when user asks "sản phẩm flash sale"', async () => {
    const res = await service.ask({ message: 'sản phẩm flash sale' }, null);

    expect(res).toBeDefined();
    expect(res.products.length).toBeGreaterThan(0);
    expect(res.products[0].name).toBe('iPhone 16 Pro Max');
    expect(res.products[0].price).toBe(27271000);
    expect(res.sources).toContain('flash-sale');
    expect(res.reply).toContain('iPhone 16 Pro Max');
    expect(res.reply).toContain('27.271.000đ');
  });

  it('should filter flash sale items when user asks for a specific brand "iphone flash sale"', async () => {
    const res = await service.ask({ message: 'iphone flash sale' }, null);

    expect(res.products.length).toBe(1);
    expect(res.products[0].name).toBe('iPhone 16 Pro Max');
  });

  it('should return empty flash products if user asks for a brand not in flash sale "samsung flash sale"', async () => {
    const res = await service.ask({ message: 'samsung flash sale' }, null);

    expect(res.products.length).toBe(0);
  });
});

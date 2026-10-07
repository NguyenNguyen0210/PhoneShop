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
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
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

  it('should refuse unknown product with contact hint when catalog empty', async () => {
    const res = await service.ask({ message: 'Vertu còn hàng không' }, null);

    expect(res.products.length).toBe(0);
    expect(res.reply).toMatch(/không có máy khớp|không kinh doanh|chưa về hàng/i);
  });

  it('should trim to 1 product for action intent instead of spamming recommendations', async () => {    const row = (slug: string, name: string) => ({
      slug, name, brand: { name: 'Apple' }, warrantyMonths: 12, specs: {},
      variants: [{ name: 'V', price: 30000000, inventory: { availableQty: 5 } }],
    });
    (mockPrisma.product.findMany as any).mockResolvedValue([
      row('iphone-16-pro-max', 'iPhone 16 Pro Max'),
      row('iphone-15-pro-max', 'iPhone 15 Pro Max'),
      row('iphone-16-pro', 'iPhone 16 Pro'),
    ]);
    const action = await service.ask({ message: 'thêm iPhone 16 Pro Max vào giỏ' }, null);
    const advice = await service.ask({ message: 'tư vấn iPhone dưới 35 triệu' }, null);

    expect(action.products.length).toBe(1);
    expect(action.products[0].slug).toBe('iphone-16-pro-max');
    expect(advice.products.length).toBeGreaterThan(1);
  });

  it('should find exact product via strong-keyword AND query even when OR is crowded', async () => {
    const iphone = { slug: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', brand: { name: 'Apple' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 30000000, inventory: { availableQty: 5 } }] };
    const junk = { slug: 'junk-a', name: 'Junk A Pro', brand: { name: 'Junk' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 1000000, inventory: { availableQty: 5 } }] };
    (mockPrisma.product.findMany as any).mockImplementation((args: any) =>
      Promise.resolve(args?.where?.AND ? [iphone] : [junk, junk, junk]),
    );
    const res = await service.ask({ message: 'thêm iPhone 16 Pro Max vào giỏ' }, null);

    expect(res.products.map((p) => p.slug)).toContain('iphone-16-pro-max');
  });

  it('should rank exact keyword matches first when broad keywords crowd out', async () => {
    (mockPrisma.product.findMany as any).mockResolvedValue([
      { slug: 'junk-a', name: 'Junk A Pro', brand: { name: 'Junk' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 1000000, inventory: { availableQty: 5 } }] },
      { slug: 'junk-b', name: 'Junk B Pro', brand: { name: 'Junk' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 1000000, inventory: { availableQty: 5 } }] },
      { slug: 'junk-c', name: 'Junk C 16', brand: { name: 'Junk' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 1000000, inventory: { availableQty: 5 } }] },
      { slug: 'junk-d', name: 'Junk D 16', brand: { name: 'Junk' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 1000000, inventory: { availableQty: 5 } }] },
      { slug: 'iphone-16-pro-max', name: 'iPhone 16 Pro Max', brand: { name: 'Apple' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 30000000, inventory: { availableQty: 5 } }] },
    ]);
    const res = await service.ask({ message: 'thêm iPhone 16 Pro Max vào giỏ' }, null);

    expect(res.products.map((p) => p.slug)).toContain('iphone-16-pro-max');
  });

  it('should not dump flash-sale/voucher blocks for unrelated payment question', async () => {
    (mockPrisma.voucher.findMany as any).mockResolvedValue([
      {
        code: 'RACE1',
        name: 'Race',
        type: 'FIXED',
        value: 20000,
        minOrderValue: null,
        maxDiscountAmount: null,
        endAt: new Date(Date.now() + 86400000),
      },
    ]);
    const res = await service.ask({ message: 'Thanh toán VNPay lỗi phải làm sao?' }, null);

    expect(res.reply).toContain('VNPay');
    expect(res.reply).not.toContain('Flash sale đang chạy');
    expect(res.reply).not.toContain('Voucher dùng được hôm nay');
    expect(res.sources).not.toContain('flash-sale');
    expect(res.sources).not.toContain('voucher');
  });

  it('should load default SHOP_SYSTEM_PROMPT when env not set', () => {
    expect(service.getSystemPrompt()).toMatch(/QUY TẮC GROUNDING/);
    expect(service.getSystemPrompt()).toMatch(/Flash Sale mua như hàng thường/);
    expect(service.getSystemPrompt()).toMatch(/Ngoài phạm vi shop thì từ chối/);
  });

  it('should prefer CHATBOT_SYSTEM_PROMPT override when configured', () => {
    const override = new ConfigService({ CHATBOT_SYSTEM_PROMPT: 'Custom prompt.' } as any);
    const svc = new ChatbotService(mockPrisma as any, override as any);

    expect(svc.getSystemPrompt()).toBe('Custom prompt.');
  });

  it('should execute lookup_order tool and synthesize reply', async () => {
    (mockPrisma.order as any) = {
      findMany: (jest.fn() as any).mockResolvedValue([]),
      findUnique: (jest.fn() as any).mockResolvedValue({
        orderNumber: 'ORD-20261004-ABCD',
        userId: 'u1',
        status: 'SHIPPING',
        totalAmount: 450000,
        items: [{ productName: 'Sạc 20W', quantity: 1, unitPrice: 450000 }],
        payments: [],
        shipping: {
          providerName: 'GHN',
          trackingNumber: 'GHN1',
          status: 'TRANSIT',
          estimatedDeliveryDate: new Date(),
        },
        user: { id: 'u1', phone: '0901234567' },
        address: { phone: '0901234567' },
      }),
    };
    const keyed = new ConfigService({
      CHATBOT_ENABLED: 'true',
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
    });
    const svc = new ChatbotService(mockPrisma as any, keyed as any);
    (global as any).fetch = (jest.fn() as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'lookup_order',
                      args: { order_code: 'ORD-20261004-ABCD', phone_last4: '4567' },
                    },
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Đơn ORD-20261004-ABCD đang được GHN giao.' }] } }],
        }),
      });
    const res = await svc.ask({ message: 'Đơn ORD-20261004-ABCD tới đâu rồi, SĐT 4567' } as any, null);

    expect(res.reply).toContain('GHN');
    (global as any).fetch = undefined;
  });

  it('should refuse add_to_cart for guest and require login', async () => {
    const keyed = new ConfigService({
      CHATBOT_ENABLED: 'true',
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
    });
    const svc = new ChatbotService(mockPrisma as any, keyed as any);
    (global as any).fetch = (jest.fn() as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ functionCall: { name: 'add_to_cart', args: { productSlug: 'iphone-16-pro-max', quantity: 1 } } }] } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'Bạn đăng nhập để thêm vào giỏ nhé.' }] } }] }),
      });
    const res = await svc.ask({ message: 'Thêm iPhone vào giỏ' } as any, null);

    expect(res.reply).toContain('đăng nhập');
    (global as any).fetch = undefined;
  });

  it('should clamp add_to_cart quantity to 10 and use cheapest in-stock variant', async () => {
    (mockPrisma.product as any).findUnique = (jest.fn() as any).mockResolvedValue({
      name: 'iPhone 16 Pro Max',
      variants: [
        { id: 'v-cheap', name: 'Var A', price: 27000000, inventory: { availableQty: 10 } },
        { id: 'v-exp', name: 'Var B', price: 30000000, inventory: { availableQty: 10 } },
      ],
    });
    const mockCart = { getCart: (jest.fn() as any).mockResolvedValue({ items: [], subtotal: 0 }), addItem: (jest.fn() as any).mockResolvedValue({}) };
    const keyed = new ConfigService({
      CHATBOT_ENABLED: 'true',
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
    });
    const svc = new ChatbotService(mockPrisma as any, keyed as any, undefined as any, mockCart as any);
    (global as any).fetch = (jest.fn() as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ functionCall: { name: 'add_to_cart', args: { productSlug: 'iphone-16-pro-max', quantity: 99 } } }] } }],
        }),
      })
      .mockImplementation(async (_url: any, opts: any) => {
        const body = JSON.parse(opts.body);
        const toolPart = (body.contents || []).find((c: any) => c?.parts?.[0]?.functionResponse);
        expect(toolPart.parts[0].functionResponse.response.ok).toBe(true);
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Đã thêm vào giỏ.' }] } }] }) };
      });
    const res = await svc.ask({ message: 'Thêm iPhone vào giỏ' } as any, { id: 'u1' });

    expect(mockCart.addItem).toHaveBeenCalledWith('u1', { variantId: 'v-cheap', quantity: 10 });
    expect(res.reply).toContain('Đã thêm');
    (global as any).fetch = undefined;
  });

  it('should refuse tool lookup when phone last4 does not match', async () => {
    (mockPrisma.order as any) = {
      findMany: (jest.fn() as any).mockResolvedValue([]),
      findUnique: (jest.fn() as any).mockResolvedValue({
        orderNumber: 'ORD-20261004-ABCD',
        userId: 'u1',
        status: 'SHIPPING',
        totalAmount: 450000,
        items: [],
        payments: [],
        shipping: null,
        user: { id: 'u1', phone: '0901234567' },
        address: { phone: '0901234567' },
      }),
    };
    const keyed = new ConfigService({
      CHATBOT_ENABLED: 'true',
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
    });
    const svc = new ChatbotService(mockPrisma as any, keyed as any);
    (global as any).fetch = (jest.fn() as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  { functionCall: { name: 'lookup_order', args: { order_code: 'ORD-20261004-ABCD', phone_last4: '0000' } } },
                ],
              },
            },
          ],
        }),
      })
      .mockImplementation(async (_url: any, opts: any) => {
        const body = JSON.parse(opts.body);
        const toolPart = (body.contents || []).find((c: any) => c?.parts?.[0]?.functionResponse);
        expect(toolPart.parts[0].functionResponse.response.ok).toBe(false);
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'SĐT không khớp.' }] } }] }) };
      });
    const res = await svc.ask({ message: 'Đơn ORD-20261004-ABCD tới đâu rồi, SĐT 0000' } as any, null);

    expect(res.reply).toContain('SĐT không khớp');
    (global as any).fetch = undefined;
  });

  it('should execute add_to_cart deterministically without calling LLM', async () => {
    (mockPrisma.product.findMany as any).mockResolvedValue([
      { slug: 'honor-magic6-pro', name: 'HONOR Magic6 Pro 5G', brand: { name: 'HONOR' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 20000000, inventory: { availableQty: 5 } }] },
    ]);
    (mockPrisma.product as any).findUnique = (jest.fn() as any).mockResolvedValue({
      name: 'HONOR Magic6 Pro 5G',
      variants: [{ id: 'v1', name: 'Xanh', price: 20000000, inventory: { availableQty: 5 } }],
    });
    const mockCart = { getCart: (jest.fn() as any).mockResolvedValue({ items: [{ variantId: 'v1', quantity: 1 }] }), addItem: (jest.fn() as any).mockResolvedValue({}) };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any, undefined as any, mockCart as any);
    (global as any).fetch = undefined;

    const res = await svc.ask({ message: 'thêm máy honor magic6 pro 5g vào giỏ hàng của tôi' } as any, { id: 'u1' });

    expect(mockCart.addItem).toHaveBeenCalledWith('u1', { variantId: 'v1', quantity: 1 });
    expect(res.reply).toContain('đã thêm HONOR Magic6 Pro 5G');
    expect(res.reply).toContain('giỏ hiện có 1 chiếc');
  });

  it('should refuse deterministic add_to_cart for guest without LLM', async () => {
    (mockPrisma.product.findMany as any).mockResolvedValue([
      { slug: 'honor-magic6-pro', name: 'HONOR Magic6 Pro 5G', brand: { name: 'HONOR' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 20000000, inventory: { availableQty: 5 } }] },
    ]);
    const mockCart = { getCart: (jest.fn() as any), addItem: (jest.fn() as any) };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any, undefined as any, mockCart as any);

    const res = await svc.ask({ message: 'thêm máy honor magic6 pro 5g vào giỏ hàng của tôi' } as any, null);

    expect(mockCart.addItem).not.toHaveBeenCalled();
    expect(res.reply).toContain('đăng nhập');
  });

  it('should NOT auto-add when user only asks to view cart', async () => {    (mockPrisma.product.findMany as any).mockResolvedValue([
      { slug: 'honor-magic6-pro', name: 'HONOR Magic6 Pro 5G', brand: { name: 'HONOR' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 20000000, inventory: { availableQty: 5 } }] },
    ]);
    const mockCart = { getCart: (jest.fn() as any), addItem: (jest.fn() as any) };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any, undefined as any, mockCart as any);

    const res = await svc.ask({ message: 'cho tôi xem giỏ hàng của tôi' } as any, { id: 'u1' });

    expect(mockCart.addItem).not.toHaveBeenCalled();
    expect(res.reply).not.toContain('đã thêm');
  });

  it('should NOT auto-add when model numbers do not match (iphone 29 vs 17)', async () => {
    (mockPrisma.product.findMany as any).mockResolvedValue([
      { slug: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', brand: { name: 'Apple' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V 256GB', price: 34990000, inventory: { availableQty: 5 } }] },
    ]);
    const mockCart = { getCart: (jest.fn() as any), addItem: (jest.fn() as any).mockResolvedValue({}) };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any, undefined as any, mockCart as any);

    const res = await svc.ask({ message: 'thêm iphone 29 promax vào giỏ hàng của tôi' } as any, { id: 'u1' });

    expect(mockCart.addItem).not.toHaveBeenCalled();
    expect(res.reply).not.toContain('đã thêm');
  });

  it('should persist turns and return conversationId for guest with conversationId', async () => {
    const convId = '11111111-1111-4111-8111-111111111111';
    const createMany = (jest.fn() as any).mockResolvedValue({ count: 2 });
    (mockPrisma as any).aiConversation = {
      findFirst: (jest.fn() as any).mockResolvedValue(null),
      create: (jest.fn() as any).mockResolvedValue({ id: convId, summary: null }),
      update: (jest.fn() as any).mockResolvedValue({}),
    };
    (mockPrisma as any).aiMessage = {
      findMany: (jest.fn() as any).mockResolvedValue([]),
      createMany,
      count: (jest.fn() as any).mockResolvedValue(2),
    };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any);

    const res = await svc.ask({ message: 'Ship mất bao lâu?', conversationId: convId } as any, null);

    expect((mockPrisma as any).aiConversation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: convId }) }),
    );
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ role: 'user' })]) }),
    );
    expect(res.conversationId).toBe(convId);
  });

  it('should redact IMEI before persisting memory', async () => {
    const convId = '22222222-2222-4222-8222-222222222222';
    const createMany = (jest.fn() as any).mockResolvedValue({ count: 2 });
    (mockPrisma as any).aiConversation = {
      findFirst: (jest.fn() as any).mockResolvedValue({ id: convId, summary: null }),
      create: (jest.fn() as any),
      update: (jest.fn() as any).mockResolvedValue({}),
    };
    (mockPrisma as any).aiMessage = {
      findMany: (jest.fn() as any).mockResolvedValue([]),
      createMany,
      count: (jest.fn() as any).mockResolvedValue(2),
    };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any);

    await svc.ask({ message: 'tra bảo hành imei 123456789012345 giúp mình', conversationId: convId } as any, null);

    const savedUser = createMany.mock.calls[0][0].data.find((r: any) => r.role === 'user').content;
    expect(savedUser).toContain('***2345');
    expect(savedUser).not.toContain('123456789012345');
  });

  it('should skip memory for guest without conversationId', async () => {
    const createMany = (jest.fn() as any).mockResolvedValue({ count: 2 });
    (mockPrisma as any).aiConversation = { findFirst: (jest.fn() as any), create: (jest.fn() as any) };
    (mockPrisma as any).aiMessage = { findMany: (jest.fn() as any).mockResolvedValue([]), createMany, count: (jest.fn() as any) };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any);

    const res = await svc.ask({ message: 'Ship mất bao lâu?' } as any, null);

    expect(createMany).not.toHaveBeenCalled();
    expect(res.conversationId).toBeNull();
  });

  it('should retry with previous user message when follow-up finds nothing', async () => {
    const samsung = { slug: 'samsung-galaxy-a56', name: 'Galaxy A56', brand: { name: 'Samsung' }, warrantyMonths: 12, specs: {}, variants: [{ name: 'V', price: 15000000, inventory: { availableQty: 5 } }] };
    (mockPrisma.product.findMany as any).mockImplementation((args: any) =>
      Promise.resolve(JSON.stringify(args?.where ?? {}).toLowerCase().includes('samsung') ? [samsung] : []),
    );
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any);
    const res = await svc.ask({
      message: 'còn con nào pin trâu hơn?',
      history: [
        { role: 'user', content: 'tìm Samsung dưới 20 triệu' },
        { role: 'assistant', content: '...' },
      ],
    } as any, null);

    expect(res.products.map((p) => p.slug)).toContain('samsung-galaxy-a56');
  });

  it('should return no products for pure support question without product signal', async () => {
    const findMany = (mockPrisma.product.findMany as any);
    const res = await service.ask({ message: 'Ship mất bao lâu, phí bao nhiêu?' } as any, null);

    expect(res.products).toHaveLength(0);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('should stream tokens then products then done via streamAsk', async () => {
    const sse = (texts: string[]) =>
      texts.map((t) => `data: {"candidates":[{"content":{"parts":[{"text":${JSON.stringify(t)}}]}}]}\n\n`).join('');
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(sse(['Xin ', 'chào bạn'])));
          c.close();
        },
      }),
    });
    const keyed = new ConfigService({
      CHATBOT_ENABLED: 'true',
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
    });
    const svc = new ChatbotService(mockPrisma as any, keyed as any);
    const events: any[] = [];
    await svc.streamAsk({ message: 'xin chào shop' } as any, null, (e) => events.push(e));

    expect(events.filter((e) => e.type === 'token').map((e) => e.text).join('')).toBe('Xin chào bạn');
    expect(events.some((e) => e.type === 'products')).toBe(true);
    expect(events[events.length - 1].type).toBe('done');
    (global as any).fetch = undefined;
  });

  it('should retry once on Gemini 429 then answer', async () => {
    (mockPrisma.product.findMany as any).mockResolvedValue([]);
    const keyed = new ConfigService({
      CHATBOT_ENABLED: 'true',
      GEMINI_API_KEY: 'k',
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
    });
    const svc = new ChatbotService(mockPrisma as any, keyed as any);
    (global as any).fetch = (jest.fn() as any)
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'Thử lại thành công.' }] } }] }),
      });
    const res = await svc.ask({ message: 'xin chào shop' } as any, null);

    expect(res.reply).toContain('Thử lại thành công');
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    (global as any).fetch = undefined;
  });

  it('should skip RAG embedding when SQL already has 3+ clear hits', async () => {
    const row = (slug: string, name: string) => ({
      slug, name, brand: { name: 'Apple' }, warrantyMonths: 12, specs: {},
      variants: [{ name: 'V', price: 30000000, inventory: { availableQty: 5 } }],
    });
    (mockPrisma.product.findMany as any).mockResolvedValue([
      row('iphone-16-pro-max', 'iPhone 16 Pro Max'),
      row('iphone-15-pro-max', 'iPhone 15 Pro Max'),
      row('iphone-16-pro', 'iPhone 16 Pro'),
    ]);
    const ragSpy = { searchProducts: (jest.fn() as any).mockResolvedValue([]) };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any, ragSpy as any);

    await svc.ask({ message: 'tư vấn iPhone dưới 35 triệu' } as any, null);

    expect(ragSpy.searchProducts).not.toHaveBeenCalled();
  });

  it('should still use RAG for semantic query with no SQL hits', async () => {
    (mockPrisma.product.findMany as any).mockResolvedValue([]);
    const ragSpy = { searchProducts: (jest.fn() as any).mockResolvedValue([]) };
    const noKey = new ConfigService({ CHATBOT_ENABLED: 'true', GEMINI_API_KEY: '' });
    const svc = new ChatbotService(mockPrisma as any, noKey as any, ragSpy as any);

    await svc.ask({ message: 'máy nào pin trâu chụp đêm tốt' } as any, null);

    expect(ragSpy.searchProducts).toHaveBeenCalled();
  });

  it('should answer via Groq chat/completions when CHATBOT_PROVIDER=groq', async () => {
    (mockPrisma.product.findMany as any).mockResolvedValue([]);
    const groqCfg = new ConfigService({
      CHATBOT_ENABLED: 'true',
      CHATBOT_PROVIDER: 'groq',
      GROQ_API_KEY: 'g-test',
      GROQ_MODEL: 'openai/gpt-oss-120b',
    });
    const svc = new ChatbotService(mockPrisma as any, groqCfg as any);
    (global as any).fetch = (jest.fn() as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Chào bạn, mình là trợ lý.', tool_calls: [] } }] }),
    });

    const res = await svc.ask({ message: 'xin chào shop' } as any, null);
    const [url, opts]: any = (global as any).fetch.mock.calls[0];

    expect(res.reply).toContain('trợ lý');
    expect(String(url)).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(opts.headers.Authorization).toBe('Bearer g-test');
    expect(JSON.parse(opts.body).model).toBe('openai/gpt-oss-120b');
    expect(JSON.parse(opts.body).tools[0].function.name).toBe('lookup_order');
    (global as any).fetch = undefined;
  });

  it('should run Groq tool loop and stream tokens via streamAsk', async () => {    (mockPrisma.order as any) = {
      findMany: (jest.fn() as any).mockResolvedValue([]),
      findUnique: (jest.fn() as any).mockResolvedValue({
        orderNumber: 'ORD-20261004-ABCD', userId: 'u1', status: 'SHIPPING', totalAmount: 450000,
        items: [{ productName: 'Sạc 20W', quantity: 1, unitPrice: 450000 }], payments: [],
        shipping: { providerName: 'GHN', trackingNumber: 'GHN1', status: 'TRANSIT', estimatedDeliveryDate: new Date() },
        user: { id: 'u1', phone: '0901234567' }, address: { phone: '0901234567' },
      }),
    };
    const groqCfg = new ConfigService({
      CHATBOT_ENABLED: 'true',
      CHATBOT_PROVIDER: 'groq',
      GROQ_API_KEY: 'g-test',
      GROQ_MODEL: 'openai/gpt-oss-120b',
    });
    const svc = new ChatbotService(mockPrisma as any, groqCfg as any);
    const sse = (obj: any) => `data: ${JSON.stringify(obj)}\n\n`;
    const toolLeg = sse({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'lookup_order', arguments: '{"order_code":"ORD-20261004-ABCD","phone_last4":"4567"}' } }] } }] });
    const textLeg = sse({ choices: [{ delta: { content: 'Đơn của bạn đang giao.' } }] }) + 'data: [DONE]\n\n';
    const streamBody = (payload: string) =>
      new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(payload)); c.close(); } });
    (global as any).fetch = (jest.fn() as any)
      .mockResolvedValueOnce({ ok: true, body: streamBody(toolLeg) })
      .mockResolvedValueOnce({ ok: true, body: streamBody(textLeg) });

    const events: any[] = [];
    await svc.streamAsk({ message: 'Đơn ORD-20261004-ABCD tới đâu rồi, SĐT 4567' } as any, null, (e) => events.push(e));

    expect(events.filter((e) => e.type === 'token').map((e) => e.text).join('')).toContain('đang giao');
    expect(events[events.length - 1].type).toBe('done');
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    (global as any).fetch = undefined;
  });

  it('should honor Retry-After on Groq 429 then succeed', async () => {    (mockPrisma.product.findMany as any).mockResolvedValue([]);
    const groqCfg = new ConfigService({
      CHATBOT_ENABLED: 'true',
      CHATBOT_PROVIDER: 'groq',
      GROQ_API_KEY: 'g-test',
      GROQ_MODEL: 'openai/gpt-oss-120b',
    });
    const svc = new ChatbotService(mockPrisma as any, groqCfg as any);
    (global as any).fetch = (jest.fn() as any)
      .mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => '1' } })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Rồi, qua được 429.', tool_calls: [] } }] }),
      });
    const res = await svc.ask({ message: 'xin chào shop' } as any, null);

    expect(res.reply).toContain('qua được 429');
    expect((global as any).fetch).toHaveBeenCalledTimes(2);
    (global as any).fetch = undefined;
  });

  it('should default to ninerouter outside production/test and use local gateway', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevProvider = process.env.CHATBOT_PROVIDER;
    const prevNineKey = process.env.NINEROUTER_API_KEY;
    process.env.NODE_ENV = 'development';
    delete process.env.CHATBOT_PROVIDER;
    process.env.NINEROUTER_API_KEY = 'nine-test';
    try {
      const svc = new ChatbotService(mockPrisma as any, new ConfigService({}) as any);
      expect(svc.llmProvider()).toBe('ninerouter');
      expect(svc.groqConfig().baseUrl).toBe('http://localhost:20128/v1');
      expect(svc.groqConfig().model).toBe('ag/gemini-3.8-flash-high');

      (mockPrisma.product.findMany as any).mockResolvedValue([]);
      (global as any).fetch = (jest.fn() as any).mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Chào từ 9router.', tool_calls: [] } }] }),
      });
      const res = await svc.ask(
        { message: 'xin chào shop', conversationId: '33333333-3333-4333-8333-333333333333' } as any,
        null,
      );
      const [url]: any = (global as any).fetch.mock.calls[0];
      expect(String(url)).toBe('http://localhost:20128/v1/chat/completions');
      expect(res.reply).toContain('9router');
      (global as any).fetch = undefined;
    } finally {
      if (prevNode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNode;
      if (prevProvider !== undefined) process.env.CHATBOT_PROVIDER = prevProvider;
      if (prevNineKey === undefined) delete process.env.NINEROUTER_API_KEY;
      else process.env.NINEROUTER_API_KEY = prevNineKey;
    }
  });
});

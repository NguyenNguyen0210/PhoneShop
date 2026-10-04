import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { findFaqMatches } from './data/faq';

export interface ChatbotVariant {
  name: string;
  color?: string;
  storage?: string;
  ram?: string;
  price: number;
  compareAtPrice?: number;
  availableQty: number;
  flashPrice?: number;
}

export interface ChatbotProduct {
  slug: string;
  name: string;
  brand?: string;
  price: number;
  image: string;
  warrantyMonths?: number;
  specsSummary?: string;
  variants?: ChatbotVariant[];
}

export interface ChatbotVoucher {
  code: string;
  name: string;
  type: string;
  value: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  endAt: string;
}

export interface ChatbotFlashSaleItem {
  campaignName: string;
  productName: string;
  variantName: string;
  flashPrice: number;
  normalPrice: number;
  remaining: number;
  endAt: string;
}

export interface ChatbotStoreInfo {
  name: string;
  hotline: string;
  email: string;
  address: string;
}

export interface ChatbotWarrantyLookup {
  masked: string;
  productName?: string;
  variantName?: string;
  deviceStatus?: string;
  warrantyStatus?: string;
  endDate?: string;
  orderNumber?: string;
  needLogin?: boolean;
  denied?: boolean;
}

export interface ChatbotResponse {
  reply: string;
  products: ChatbotProduct[];
  sources: string[];
  escalate: boolean;
}

const ESCALATE_KEYWORDS = [
  'gặp nhân viên',
  'người thật',
  'nhân viên',
  'khiếu nại',
  'lừa đảo',
  'gọi điện',
  'hotline',
  'quá tệ',
  'tẩy chay',
];

const VI_STOPWORDS = new Set([
  'cho', 'tôi', 'mình', 'bạn', 'shop', 'có', 'không', 'là', 'và', 'hoặc',
  'bao', 'nhiêu', 'giá', 'mua', 'tìm', 'xem', 'cái', 'chiếc', 'điện', 'thoại',
  'nào', 'gì', 'với', 'dưới', 'trên', 'khoảng', 'tầm', 'con', 'máy',
]);

const STORE_DEFAULTS: ChatbotStoreInfo = {
  name: 'Phone Shop',
  hotline: '1900 6868',
  email: 'support@phoneshop.vn',
  address: 'Hồ Chí Minh, Việt Nam',
};

function extractKeywords(message: string): string[] {
  return message
    .toLowerCase()
    .normalize('NFC')
    .split(/[^a-z0-9à-ỹđ\s]/gi)
    .join(' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !VI_STOPWORDS.has(w))
    .slice(0, 6);
}

function maskImei(imei: string): string {
  if (!imei || imei.length < 4) return '***';
  return `***${imei.slice(-4)}`;
}

function extractImei(message: string): string | null {
  const normalized = message.replace(/[\s\-_.]/g, '');
  const m = normalized.match(/\d{14,17}/);
  return m ? m[0] : null;
}

function formatVnd(n: any): string {
  const num = Number(n || 0);
  return `${num.toLocaleString('vi-VN')}đ`;
}

function formatVoucherValue(v: ChatbotVoucher): string {
  if (v.type === 'PERCENTAGE') return `giảm ${Number(v.value)}%`;
  if (v.type === 'FREE_SHIPPING') return 'miễn phí ship';
  return `giảm ${formatVnd(v.value)}`;
}

function summarizeSpecs(specs: any): string {
  if (!specs || typeof specs !== 'object') return '';
  const pick = ['chip', 'ram', 'storage', 'camera', 'battery', 'screen', 'display'];
  const parts: string[] = [];
  for (const k of pick) {
    const val = (specs as any)[k];
    if (val) parts.push(`${k}: ${String(val)}`);
  }
  if (parts.length === 0) {
    return Object.entries(specs)
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join('; ');
  }
  return parts.slice(0, 4).join('; ');
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async ask(dto: AskChatbotDto, user: any | null): Promise<ChatbotResponse> {
    const message = dto.message.trim();
    const faqs = findFaqMatches(message, 2);
    const imei = extractImei(message);

    const [products, personal, vouchers, flashSales, store, warranty] = await Promise.all([
      this.searchProducts(message),
      user?.id ? this.getPersonalContext(user.id, message) : Promise.resolve(null),
      this.getActiveVouchers(5),
      this.getActiveFlashSales(5),
      this.getStoreInfo(),
      imei ? this.lookupWarrantyByImei(imei, user?.id ?? null) : Promise.resolve(null),
    ]);

    const escalate = this.shouldEscalate(message, products.length, faqs.length);

    const apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const enabled =
      (this.config.get<string>('CHATBOT_ENABLED') ?? process.env.CHATBOT_ENABLED ?? 'true') !== 'false';

    if (!enabled || !apiKey) {
      return {
        reply: this.buildFallbackReply(message, faqs, products, personal, !!user, vouchers, flashSales, store, warranty),
        products,
        sources: this.buildSources(products, faqs, personal, vouchers, flashSales, warranty),
        escalate,
      };
    }

    try {
      const reply = await this.callGemini(
        message,
        dto.history || [],
        faqs,
        products,
        personal,
        vouchers,
        flashSales,
        store,
        warranty,
      );
      return {
        reply,
        products,
        sources: this.buildSources(products, faqs, personal, vouchers, flashSales, warranty),
        escalate: escalate || /gặp nhân viên|liên hệ cskh|không chắc chắn/i.test(reply),
      };
    } catch (err: any) {
      this.logger.warn(`Gemini call failed: ${err?.message || err}`);
      return {
        reply: `${this.buildFallbackReply(message, faqs, products, personal, !!user, vouchers, flashSales, store, warranty)}\n\n(Lưu ý: AI đang bận nên trả lời từ dữ liệu shop. Bấm "Gặp nhân viên" để được hỗ trợ trực tiếp.)`,
        products,
        sources: this.buildSources(products, faqs, personal, vouchers, flashSales, warranty),
        escalate: true,
      };
    }
  }

  getSuggestions(): string[] {
    return [
      'iPhone dưới 20 triệu còn hàng?',
      'So sánh Galaxy S và Xiaomi 15?',
      'Đơn hàng của tôi đâu rồi?',
      'Tra bảo hành bằng IMEI?',
      'Thanh toán VNPay lỗi phải làm sao?',
      'Voucher nào dùng được hôm nay?',
      'Flash sale nào đang chạy?',
      'Ship mất bao lâu, phí bao nhiêu?',
    ];
  }

  private shouldEscalate(message: string, productCount: number, faqCount: number): boolean {
    const lower = message.toLowerCase();
    if (ESCALATE_KEYWORDS.some((k) => lower.includes(k))) return true;
    if (productCount === 0 && faqCount === 0 && lower.length > 12) return false;
    return false;
  }

  private buildSources(
    products: ChatbotProduct[],
    faqs: { question: string }[],
    personal: { orders: any[] } | null,
    vouchers: ChatbotVoucher[] = [],
    flashSales: ChatbotFlashSaleItem[] = [],
    warranty: ChatbotWarrantyLookup | null = null,
  ): string[] {
    const sources: string[] = [];
    if (products.length > 0) sources.push('catalog');
    if (faqs.length > 0) sources.push('faq');
    if (personal && personal.orders.length > 0) sources.push('order');
    if (vouchers.length > 0) sources.push('voucher');
    if (flashSales.length > 0) sources.push('flash-sale');
    if (warranty && !warranty.needLogin && !warranty.denied) sources.push('warranty');
    return sources;
  }

  private async searchProducts(message: string): Promise<ChatbotProduct[]> {
    const isFlashSaleQuery = /flash\s*sale|giảm\s*sốc|săn\s*sale|khuyến\s*mãi\s*khung\s*giờ/i.test(message);
    const keywords = extractKeywords(message);

    // Nếu hỏi về flash sale: ưu tiên lấy các sản phẩm đang chạy Flash Sale
    if (isFlashSaleQuery) {
      try {
        const now = new Date();
        const campaigns: any[] = await (this.prisma as any).flashSaleCampaign.findMany({
          where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
          take: 3,
          include: {
            items: {
              take: 10,
              include: {
                variant: {
                  include: {
                    inventory: { select: { availableQty: true } },
                    product: {
                      include: {
                        brand: { select: { name: true } },
                        variants: {
                          where: { isActive: true },
                          take: 5,
                          include: { inventory: { select: { availableQty: true } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const flashProductsMap = new Map<string, ChatbotProduct>();
        const IGNORED_FLASH_QUERY_WORDS = new Set([
          'flash', 'sale', 'san', 'pham', 'sản', 'phẩm', 'mua', 'bán', 'ban',
          'co', 'có', 'nao', 'nào', 'chay', 'chạy', 'đang', 'dang', 'shop',
          'chuong', 'trinh', 'chương', 'trình', 'khuyen', 'mai', 'khuyến', 'mãi',
          'giam', 'soc', 'giảm', 'sốc', 'gia', 'giá', 'xem', 'cac', 'các', 'cho',
          'hien', 'hiện', 'tai', 'tại', 'hot', 'deal', 'deals', 'nhung', 'những',
        ]);
        const specificKeywords = keywords.filter((k) => !IGNORED_FLASH_QUERY_WORDS.has(k.toLowerCase()));

        for (const c of campaigns || []) {
          for (const it of c.items || []) {
            const p = it.variant?.product;
            if (!p || flashProductsMap.has(p.slug)) continue;

            if (specificKeywords.length > 0) {
              const textToMatch = `${p.name} ${p.brand?.name || ''}`.toLowerCase();
              const matches = specificKeywords.some((kw) => textToMatch.includes(kw));
              if (!matches) continue;
            }

            const flashPrice = Number(it.flashPrice);
            flashProductsMap.set(p.slug, {
              slug: p.slug,
              name: p.name,
              brand: p.brand?.name,
              price: flashPrice,
              image: it.variant?.imageUrl || p.thumbnailUrl || '/images/products/iphone-16-pro-max.png',
              warrantyMonths: p.warrantyMonths ?? 12,
              specsSummary: summarizeSpecs(p.specs) || undefined,
              variants: (p.variants || [])
                .filter((v: any) => (v.inventory?.availableQty || 0) > 0)
                .map((v: any) => ({
                  name: v.name,
                  color: v.color ?? undefined,
                  storage: v.storage ?? undefined,
                  ram: v.ram ?? undefined,
                  price: Number(v.price),
                  compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
                  availableQty: v.inventory?.availableQty ?? 0,
                  flashPrice: v.id === it.variant?.id ? flashPrice : undefined,
                })),
            });
            if (flashProductsMap.size >= 3) break;
          }
          if (flashProductsMap.size >= 3) break;
        }

        if (flashProductsMap.size > 0) {
          return Array.from(flashProductsMap.values());
        }
      } catch (err) {
        this.logger.warn(`Flash sale searchProducts failed: ${(err as Error)?.message}`);
      }
    }

    if (keywords.length === 0) return [];

    const orConditions = keywords.slice(0, 4).flatMap((kw) => [
      { name: { contains: kw, mode: 'insensitive' as const } },
      { brand: { name: { contains: kw, mode: 'insensitive' as const } } },
    ]);

    // Giá tối đa trong câu hỏi: "dưới 20 triệu / <20tr / 15tr"
    let maxPrice: number | undefined;
    const priceMatch = message.match(/dưới\s+(\d{1,3})\s*(triệu|tr|m)/i);
    if (priceMatch) maxPrice = parseInt(priceMatch[1], 10) * 1_000_000;

    try {
      const rows = await this.prisma.product.findMany({
        where: {
          status: 'ACTIVE' as any,
          OR: orConditions.length > 0 ? orConditions : undefined,
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: {
          brand: { select: { name: true } },
          variants: {
            where: { isActive: true },
            take: 5,
            orderBy: { price: 'asc' },
            select: {
              name: true,
              color: true,
              storage: true,
              ram: true,
              price: true,
              compareAtPrice: true,
              inventory: { select: { availableQty: true } },
            },
          },
        },
      });

      // Giá flash đang chạy (map theo tên variant trong cùng batch)
      let flashByVariant = new Map<string, number>();
      try {
        const now = new Date();
        const campaigns: any[] = await (this.prisma as any).flashSaleCampaign.findMany({
          where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
          take: 3,
          include: {
            items: {
              take: 20,
              include: { variant: { select: { name: true, price: true } } },
            },
          },
        });
        for (const c of campaigns || []) {
          for (const it of c.items || []) {
            if (it?.variant?.name && it?.flashPrice) {
              flashByVariant.set(String(it.variant.name), Number(it.flashPrice));
            }
          }
        }
      } catch {
        flashByVariant = new Map();
      }

      const mapped: ChatbotProduct[] = rows
        .map((p: any) => {
          const variants: ChatbotVariant[] = (p.variants || []).map((v: any) => ({
            name: v.name,
            color: v.color ?? undefined,
            storage: v.storage ?? undefined,
            ram: v.ram ?? undefined,
            price: Number(v.price),
            compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
            availableQty: v.inventory?.availableQty ?? 0,
            flashPrice: flashByVariant.get(String(v.name)),
          }));
          const inStockVariants = variants.filter((v) => v.availableQty > 0);
          if (inStockVariants.length === 0) return null;
          const cheapest = [...inStockVariants].sort((a, b) => a.price - b.price)[0];
          if (maxPrice !== undefined && cheapest.price > maxPrice) return null;
          return {
            slug: p.slug,
            name: p.name,
            brand: p.brand?.name,
            price: cheapest.price,
            image: (p.variants || [])[0]?.imageUrl || p.thumbnailUrl || '/images/products/iphone-16-pro-max.png',
            warrantyMonths: p.warrantyMonths ?? 12,
            specsSummary: summarizeSpecs(p.specs) || undefined,
            variants: inStockVariants.slice(0, 4),
          };
        })
        .filter(Boolean) as ChatbotProduct[];

      return mapped.slice(0, 3);
    } catch (err) {
      this.logger.warn(`Product grounding failed: ${(err as Error)?.message}`);
      return [];
    }
  }

  private async getPersonalContext(userId: string, message: string) {
    const lower = message.toLowerCase();
    const wantsOrder = /đơn|order|giao|ship|vận đơn|mua rồi|đã đặt|vận chuyển|theo dõi/i.test(lower);
    if (!wantsOrder) return { orders: [] };

    try {
      const orders = await this.prisma.order.findMany({
        where: { userId },
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          orderNumber: true,
          status: true,
          totalAmount: true,
          shippingFee: true,
          shippingMethod: true,
          createdAt: true,
          items: {
            take: 5,
            select: { productName: true, quantity: true, unitPrice: true },
          },
          payments: {
            take: 2,
            orderBy: { createdAt: 'desc' },
            select: { method: true, status: true, amount: true },
          },
          shipping: {
            select: {
              providerName: true,
              trackingNumber: true,
              status: true,
              estimatedDeliveryDate: true,
            },
          },
        },
      });
      return { orders };
    } catch {
      return { orders: [] };
    }
  }

  private async getActiveVouchers(limit = 5): Promise<ChatbotVoucher[]> {
    try {
      const now = new Date();
      const rows: any[] = await (this.prisma as any).voucher.findMany({
        where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
        take: limit,
        orderBy: { endAt: 'asc' },
        select: {
          code: true,
          name: true,
          type: true,
          value: true,
          minOrderValue: true,
          maxDiscountAmount: true,
          endAt: true,
        },
      });
      return (rows || []).map((v) => ({
        code: v.code,
        name: v.name,
        type: String(v.type),
        value: Number(v.value),
        minOrderValue: v.minOrderValue ? Number(v.minOrderValue) : undefined,
        maxDiscountAmount: v.maxDiscountAmount ? Number(v.maxDiscountAmount) : undefined,
        endAt: new Date(v.endAt).toLocaleDateString('vi-VN'),
      }));
    } catch (err) {
      this.logger.warn(`Voucher grounding failed: ${(err as Error)?.message}`);
      return [];
    }
  }

  private async getActiveFlashSales(limit = 5): Promise<ChatbotFlashSaleItem[]> {
    try {
      const now = new Date();
      const campaigns: any[] = await (this.prisma as any).flashSaleCampaign.findMany({
        where: { isActive: true, startAt: { lte: now }, endAt: { gte: now } },
        take: 3,
        orderBy: { endAt: 'asc' },
        include: {
          items: {
            take: 10,
            include: {
              variant: {
                select: {
                  name: true,
                  price: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      const flat: ChatbotFlashSaleItem[] = [];
      for (const c of campaigns || []) {
        for (const it of c.items || []) {
          const remaining = Math.max(0, Number(it.stockLimit || 0) - Number(it.soldCount || 0));
          if (remaining <= 0) continue;
          flat.push({
            campaignName: c.name,
            productName: it.variant?.product?.name || it.variant?.name || 'Máy',
            variantName: it.variant?.name || '',
            flashPrice: Number(it.flashPrice),
            normalPrice: Number(it.variant?.price || it.flashPrice),
            remaining,
            endAt: new Date(c.endAt).toLocaleString('vi-VN'),
          });
          if (flat.length >= limit) return flat;
        }
      }
      return flat;
    } catch (err) {
      this.logger.warn(`Flash sale grounding failed: ${(err as Error)?.message}`);
      return [];
    }
  }

  private async getStoreInfo(): Promise<ChatbotStoreInfo> {
    try {
      const rows: any[] = await (this.prisma as any).systemSetting.findMany({
        where: { key: { in: ['STORE_NAME', 'STORE_HOTLINE', 'STORE_EMAIL', 'STORE_ADDRESS'] } },
        select: { key: true, value: true },
      });
      const map = new Map((rows || []).map((r) => [r.key, r.value]));
      return {
        name: map.get('STORE_NAME') || STORE_DEFAULTS.name,
        hotline: map.get('STORE_HOTLINE') || STORE_DEFAULTS.hotline,
        email: map.get('STORE_EMAIL') || STORE_DEFAULTS.email,
        address: map.get('STORE_ADDRESS') || STORE_DEFAULTS.address,
      };
    } catch {
      return { ...STORE_DEFAULTS };
    }
  }

  private async lookupWarrantyByImei(imei: string, userId: string | null): Promise<ChatbotWarrantyLookup | null> {
    if (!imei) return null;
    if (!userId) return { masked: maskImei(imei), needLogin: true };
    try {
      const device: any = await (this.prisma as any).imeiDevice.findUnique({
        where: { imei },
        include: {
          variant: { select: { name: true, product: { select: { name: true } } } },
          warranty: { select: { status: true, endDate: true, warrantyCode: true, userId: true } },
          orderItem: {
            select: {
              order: { select: { userId: true, orderNumber: true } },
            },
          },
        },
      });
      if (!device) {
        return { masked: maskImei(imei), denied: true };
      }
      const ownerUserId = device.orderItem?.order?.userId || device.warranty?.userId || null;
      if (ownerUserId && ownerUserId !== userId) {
        return { masked: maskImei(imei), denied: true };
      }
      if (!ownerUserId) {
        // Không gắn đơn/user nào: chỉ cho xem trạng thái chung, không lộ chi tiết
        return {
          masked: maskImei(imei),
          productName: device.variant?.product?.name,
          variantName: device.variant?.name,
          deviceStatus: device.status,
          denied: true,
        };
      }
      return {
        masked: maskImei(imei),
        productName: device.variant?.product?.name,
        variantName: device.variant?.name,
        deviceStatus: device.status,
        warrantyStatus: device.warranty?.status,
        endDate: device.warranty?.endDate ? new Date(device.warranty.endDate).toLocaleDateString('vi-VN') : undefined,
        orderNumber: device.orderItem?.order?.orderNumber,
      };
    } catch (err) {
      this.logger.warn(`Warranty lookup failed: ${(err as Error)?.message}`);
      return null;
    }
  }

  private buildFallbackReply(
    message: string,
    faqs: { question: string; answer: string }[],
    products: ChatbotProduct[],
    personal: { orders: any[] } | null,
    isLoggedIn: boolean,
    vouchers: ChatbotVoucher[] = [],
    flashSales: ChatbotFlashSaleItem[] = [],
    store: ChatbotStoreInfo = STORE_DEFAULTS,
    warranty: ChatbotWarrantyLookup | null = null,
  ): string {
    const parts: string[] = [];

    if (products.length > 0) {
      parts.push(
        `Mình tìm thấy ${products.length} máy khớp yêu cầu (còn hàng, giá thật từ shop):\n` +
          products
            .map((p) => {
              const base = `• ${p.brand ? p.brand + ' ' : ''}${p.name} — từ ${formatVnd(p.price)} (BH ${p.warrantyMonths ?? 12} tháng)`;
              const spec = p.specsSummary ? `\n  Cấu hình: ${p.specsSummary}` : '';
              const vars = (p.variants || [])
                .slice(0, 3)
                .map(
                  (v) =>
                    `\n  - ${[v.color, v.storage, v.ram].filter(Boolean).join(' / ') || v.name}: ${formatVnd(v.flashPrice ?? v.price)}${v.flashPrice ? ` (flash, gốc ${formatVnd(v.price)})` : ''} — còn ${v.availableQty} máy`,
                )
                .join('');
              return base + spec + vars;
            })
            .join('\n'),
      );
    }

    if (flashSales.length > 0) {
      parts.push(
        `Flash sale đang chạy:\n` +
          flashSales
            .map((f) => `• ${f.productName}${f.variantName ? ` (${f.variantName})` : ''} — ${formatVnd(f.flashPrice)} (gốc ${formatVnd(f.normalPrice)}) — còn ${f.remaining} suất, hết ${f.endAt}`)
            .join('\n'),
      );
    }

    if (vouchers.length > 0) {
      parts.push(
        `Voucher dùng được hôm nay:\n` +
          vouchers
            .map(
              (v) =>
                `• ${v.code} — ${formatVoucherValue(v)}${v.minOrderValue ? ` (đơn từ ${formatVnd(v.minOrderValue)})` : ''}${v.maxDiscountAmount ? ` (tối đa ${formatVnd(v.maxDiscountAmount)})` : ''} — HSD ${v.endAt}`,
            )
            .join('\n'),
      );
    }

    if (warranty) {
      if (warranty.needLogin) {
        parts.push(`Để tra bảo hành IMEI ${warranty.masked}, vui lòng đăng nhập rồi hỏi lại (IMEI phải thuộc đơn của bạn).`);
      } else if (warranty.denied) {
        parts.push(
          `IMEI ${warranty.masked} không thuộc tài khoản của bạn hoặc không tìm thấy. Vui lòng đăng nhập đúng tài khoản đã mua, hoặc liên hệ ${store.hotline} để được hỗ trợ.`,
        );
      } else {
        parts.push(
          `Bảo hành IMEI ${warranty.masked}${warranty.productName ? ` (${warranty.productName}${warranty.variantName ? ` - ${warranty.variantName}` : ''})` : ''}: ` +
            `trạng thái máy ${warranty.deviceStatus || '—'}${warranty.warrantyStatus ? `, bảo hành ${warranty.warrantyStatus}` : ''}${warranty.endDate ? ` đến ${warranty.endDate}` : ''}${warranty.orderNumber ? ` (đơn ${warranty.orderNumber})` : ''}.`,
        );
      }
    }

    if (personal && personal.orders.length > 0) {
      const o = personal.orders[0];
      const itemText = (o.items || [])
        .map((i: any) => `${i.productName} x${i.quantity}`)
        .join(', ');
      const shipText = o.shipping
        ? ` — ship ${o.shipping.providerName || ''} ${o.shipping.trackingNumber || ''} (${o.shipping.status || ''}${o.shipping.estimatedDeliveryDate ? `, dự kiến ${new Date(o.shipping.estimatedDeliveryDate).toLocaleDateString('vi-VN')}` : ''})`
        : o.shippingFee
          ? ` — phí ship ${formatVnd(o.shippingFee)} (${o.shippingMethod || 'STANDARD'})`
          : ' — miễn phí ship';
      parts.push(
        `Đơn gần nhất của bạn: ${o.orderNumber} — ${o.status} — ${formatVnd(o.totalAmount)} (đặt ${new Date(o.createdAt).toLocaleDateString('vi-VN')})${itemText ? `\n  Gồm: ${itemText}` : ''}${shipText}.`,
      );
    } else if (/đơn|order/i.test(message) && !isLoggedIn) {
      parts.push('Để tra đơn/bảo hành của bạn, vui lòng đăng nhập rồi hỏi lại (ví dụ: "đơn của tôi đâu rồi?").');
    }

    for (const f of faqs) parts.push(`${f.question} ${f.answer}`);

    if (parts.length === 0) {
      return (
        `Mình là trợ lý AI ${store.name} (Gemini 3.5 Flash-Lite). Bạn hỏi về tư vấn máy, giá/tồn thật theo phiên bản, flash sale, voucher, giao hàng, thanh toán (COD/VietQR/VNPay), bảo hành IMEI hoặc đơn hàng nhé. ` +
          `Ví dụ: "iPhone dưới 20 triệu còn hàng?" hoặc đăng nhập rồi hỏi "đơn của tôi đâu rồi?". Hotline ${store.hotline}.`
      );
    }
    parts.push(`Cần thêm? Liên hệ ${store.name} — hotline ${store.hotline}, ${store.email}, ${store.address}.`);
    return parts.join('\n\n');
  }

  private buildPrompt(
    message: string,
    history: { role: string; content: string }[],
    faqs: { question: string; answer: string }[],
    products: ChatbotProduct[],
    personal: { orders: any[] } | null,
    vouchers: ChatbotVoucher[] = [],
    flashSales: ChatbotFlashSaleItem[] = [],
    store: ChatbotStoreInfo = STORE_DEFAULTS,
    warranty: ChatbotWarrantyLookup | null = null,
  ): string {
    const catalog = products.length
      ? products
          .map((p) => {
            const vars = (p.variants || [])
              .map(
                (v) =>
                  `${[v.color, v.storage, v.ram].filter(Boolean).join('/') || v.name} | ${v.flashPrice ?? v.price}đ${v.flashPrice ? ` (flash, gốc ${v.price}đ)` : ''} | còn ${v.availableQty}`,
              )
              .join(' ; ');
            return `- ${p.brand || ''} ${p.name} | từ ${p.price}đ | BH ${p.warrantyMonths ?? 12}th | /products/${p.slug}${p.specsSummary ? ` | ${p.specsSummary}` : ''}${vars ? `\n  Bản: ${vars}` : ''}`;
          })
          .join('\n')
      : '(không có sản phẩm khớp)';
    const faqText = faqs.length ? faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n') : '(không có FAQ khớp)';
    const orderText =
      personal && personal.orders.length
        ? personal.orders
            .map((o: any) => {
              const items = (o.items || []).map((i: any) => `${i.productName} x${i.quantity} (${i.unitPrice}đ)`).join(', ');
              const pay = (o.payments || []).map((pm: any) => `${pm.method}/${pm.status}`).join(', ');
              const ship = o.shipping
                ? `${o.shipping.providerName || ''} ${o.shipping.trackingNumber || ''} ${o.shipping.status || ''}`
                : `phí ${o.shippingFee || 0}đ (${o.shippingMethod || 'STANDARD'})`;
              return `- ${o.orderNumber} | ${o.status} | ${o.totalAmount}đ | items: ${items || '—'} | pay: ${pay || '—'} | ship: ${ship}`;
            })
            .join('\n')
        : '(không có / không được phép xem đơn cá nhân)';
    const voucherText = vouchers.length
      ? vouchers
          .map(
            (v) =>
              `- ${v.code} | ${v.name} | ${formatVoucherValue(v)} | đơn từ ${v.minOrderValue ? formatVnd(v.minOrderValue) : '0đ'}${v.maxDiscountAmount ? ` | tối đa ${formatVnd(v.maxDiscountAmount)}` : ''} | HSD ${v.endAt}`,
          )
          .join('\n')
      : '(không có voucher hiệu lực)';
    const flashText = flashSales.length
      ? flashSales
          .map(
            (f) =>
              `- [${f.campaignName}] ${f.productName}${f.variantName ? ` (${f.variantName})` : ''} | flash ${formatVnd(f.flashPrice)} (gốc ${formatVnd(f.normalPrice)}) | còn ${f.remaining} suất | hết ${f.endAt}`,
          )
          .join('\n')
      : '(không có flash sale đang chạy)';
    const warrantyText = !warranty
      ? '(không tra IMEI)'
      : warranty.needLogin
        ? `IMEI ${warranty.masked}: khách chưa login → nhắc đăng nhập, không tiết lộ thêm`
        : warranty.denied
          ? `IMEI ${warranty.masked}: không thuộc user hoặc không tồn tại → từ chối khéo, gợi ý hotline ${store.hotline}`
          : `IMEI ${warranty.masked}: ${warranty.productName || ''} ${warranty.variantName || ''} | máy ${warranty.deviceStatus || '—'} | BH ${warranty.warrantyStatus || '—'}${warranty.endDate ? ` đến ${warranty.endDate}` : ''}${warranty.orderNumber ? ` | đơn ${warranty.orderNumber}` : ''}`;
    const hist = (history || [])
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'Khách' : 'AI'}: ${h.content}`)
      .join('\n');

    return [
      `Bạn là trợ lý AI ${store.name}, trả lời tiếng Việt, ngắn gọn, thân thiện. Hotline ${store.hotline}, email ${store.email}, địa chỉ ${store.address}.`,
      'QUY TẮC BẮT BUỘC:',
      '- Khi khách hỏi về Flash Sale / giảm giá / ưu đãi: hãy giới thiệu cụ thể các máy trong mục "Flash sale đang chạy" và CATALOG bên dưới (nêu rõ tên máy, giá flash, giá gốc, số suất còn). Tuyệt đối không nói shop không có flash sale nếu mục Flash sale bên dưới có dữ liệu.',
      '- Chỉ dùng giá/tồn/sản phẩm trong CATALOG dưới đây (giá theo từng bản màu/RAM/dung lượng, kèm tồn exact). Không bịa máy, giá, tồn kho.',
      '- Voucher/flash sale chỉ dùng danh sách VOUCHER / FLASH SALE dưới đây, ghi đúng mã, điều kiện, HSD, số suất còn.',
      '- Không bao giờ tiết lộ IMEI đầy đủ, chỉ dạng ***1234. IMEI chỉ tra cho chủ sở hữu đã login (xem WARRANTY).',
      '- Đơn hàng/ship/payment cá nhân chỉ dùng ORDER CONTEXT; khách chưa login thì nhắc đăng nhập.',
      '- Ship: miễn phí toàn quốc; nội thành 1-2 ngày, tỉnh 2-4 ngày; giữ máy 15 phút sau khi đặt.',
      `- Catalog:\n${catalog}`,
      `- FAQ:\n${faqText}`,
      `- Đơn cá nhân:\n${orderText}`,
      `- Voucher hiệu lực:\n${voucherText}`,
      `- Flash sale đang chạy:\n${flashText}`,
      `- Tra IMEI:\n${warrantyText}`,
      hist ? `- Hội thoại trước:\n${hist}` : '',
      `- Câu hỏi: ${message}`,
      'Trả lời (tối đa 220 từ, kèm gợi ý 1-2 máy nếu có, ghi hotline khi cần gặp người):',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async callGemini(
    message: string,
    history: { role: string; content: string }[],
    faqs: { question: string; answer: string }[],
    products: ChatbotProduct[],
    personal: { orders: any[] } | null,
    vouchers: ChatbotVoucher[] = [],
    flashSales: ChatbotFlashSaleItem[] = [],
    store: ChatbotStoreInfo = STORE_DEFAULTS,
    warranty: ChatbotWarrantyLookup | null = null,
  ): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const primaryModel = this.config.get<string>('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const candidateModels = [primaryModel, 'gemini-2.5-flash'].filter((m, i, arr) => arr.indexOf(m) === i);
    const prompt = this.buildPrompt(message, history, faqs, products, personal, vouchers, flashSales, store, warranty);

    let lastError: any = null;
    for (const model of candidateModels) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              system_instruction: { parts: [{ text: 'Trợ lý PhoneShop: trung thực, chỉ dùng dữ liệu shop, tiếng Việt.' }] },
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 768 },
            }),
          },
        );
        if (!res.ok) {
          throw new Error(`Gemini HTTP ${res.status}`);
        }
        const data: any = await res.json();
        const text: string =
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('')?.trim() || '';
        if (!text) throw new Error('Gemini empty response');
        void maskImei;
        return text;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Gemini model ${model} failed: ${err?.message || err}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed');
  }
}

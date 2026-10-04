import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AskChatbotDto } from './dto/ask-chatbot.dto';
import { findFaqMatches } from './data/faq';

export interface ChatbotProduct {
  slug: string;
  name: string;
  brand?: string;
  price: number;
  image: string;
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
    const products = await this.searchProducts(message);
    const personal = user?.id ? await this.getPersonalContext(user.id, message) : null;

    const escalate = this.shouldEscalate(message, products.length, faqs.length);

    const apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const enabled =
      (this.config.get<string>('CHATBOT_ENABLED') ?? process.env.CHATBOT_ENABLED ?? 'true') !== 'false';

    if (!enabled || !apiKey) {
      return {
        reply: this.buildFallbackReply(message, faqs, products, personal, !!user),
        products,
        sources: this.buildSources(products, faqs, personal),
        escalate,
      };
    }

    try {
      const reply = await this.callGemini(message, dto.history || [], faqs, products, personal);
      return {
        reply,
        products,
        sources: this.buildSources(products, faqs, personal),
        escalate: escalate || /gặp nhân viên|liên hệ cskh|không chắc chắn/i.test(reply),
      };
    } catch (err: any) {
      this.logger.warn(`Gemini call failed: ${err?.message || err}`);
      return {
        reply: `${this.buildFallbackReply(message, faqs, products, personal, !!user)}\n\n(Lưu ý: AI đang bận nên trả lời từ dữ liệu shop. Bấm "Gặp nhân viên" để được hỗ trợ trực tiếp.)`,
        products,
        sources: this.buildSources(products, faqs, personal),
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
  ): string[] {
    const sources: string[] = [];
    if (products.length > 0) sources.push('catalog');
    if (faqs.length > 0) sources.push('faq');
    if (personal && personal.orders.length > 0) sources.push('order');
    return sources;
  }

  private async searchProducts(message: string): Promise<ChatbotProduct[]> {
    const keywords = extractKeywords(message);
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
            take: 3,
            orderBy: { price: 'asc' },
            select: { price: true, imageUrl: true, inventory: { select: { availableQty: true } } },
          },
        },
      });

      const mapped: ChatbotProduct[] = rows
        .map((p: any) => {
          const cheapest = (p.variants || []).sort((a: any, b: any) => Number(a.price) - Number(b.price))[0];
          const price = cheapest ? Number(cheapest.price) : 0;
          const inStock = (p.variants || []).some((v: any) => (v.inventory?.availableQty || 0) > 0);
          if (!inStock) return null;
          if (maxPrice !== undefined && price > maxPrice) return null;
          return {
            slug: p.slug,
            name: p.name,
            brand: p.brand?.name,
            price,
            image: cheapest?.imageUrl || p.thumbnailUrl || '/images/products/iphone-16-pro-max.png',
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
    const wantsOrder = /đơn|order|giao|ship|vận đơn|mua rồi|đã đặt/i.test(lower);
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
          createdAt: true,
        },
      });
      return { orders };
    } catch {
      return { orders: [] };
    }
  }

  private buildFallbackReply(
    message: string,
    faqs: { question: string; answer: string }[],
    products: ChatbotProduct[],
    personal: { orders: any[] } | null,
    isLoggedIn: boolean,
  ): string {
    const parts: string[] = [];

    if (products.length > 0) {
      parts.push(
        `Mình tìm thấy ${products.length} máy khớp yêu cầu (còn hàng, giá thật từ shop):\n` +
          products
            .map((p) => `• ${p.brand ? p.brand + ' ' : ''}${p.name} — ${Number(p.price).toLocaleString('vi-VN')}đ`)
            .join('\n'),
      );
    }

    if (personal && personal.orders.length > 0) {
      const o = personal.orders[0];
      parts.push(
        `Đơn gần nhất của bạn: ${o.orderNumber} — ${o.status} — ${Number(o.totalAmount).toLocaleString('vi-VN')}đ (đặt ${new Date(o.createdAt).toLocaleDateString('vi-VN')}).`,
      );
    } else if (/đơn|order/i.test(message) && !isLoggedIn) {
      parts.push('Để tra đơn/bảo hành của bạn, vui lòng đăng nhập rồi hỏi lại (ví dụ: "đơn của tôi đâu rồi?").');
    }

    for (const f of faqs) parts.push(`${f.question} ${f.answer}`);

    if (parts.length === 0) {
      return (
        'Mình là trợ lý AI PhoneShop (Gemini Flash). Bạn hỏi về tư vấn máy, giá/tồn thật, giao hàng, thanh toán (COD/VietQR/VNPay), bảo hành IMEI hoặc đơn hàng nhé. ' +
        'Ví dụ: "iPhone dưới 20 triệu còn hàng?" hoặc đăng nhập rồi hỏi "đơn của tôi đâu rồi?".'
      );
    }
    return parts.join('\n\n');
  }

  private buildPrompt(
    message: string,
    history: { role: string; content: string }[],
    faqs: { question: string; answer: string }[],
    products: ChatbotProduct[],
    personal: { orders: any[] } | null,
  ): string {
    const catalog = products.length
      ? products.map((p) => `- ${p.brand || ''} ${p.name} | ${p.price}đ | /products/${p.slug}`.trim()).join('\n')
      : '(không có sản phẩm khớp)';
    const faqText = faqs.length ? faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n') : '(không có FAQ khớp)';
    const orderText =
      personal && personal.orders.length
        ? personal.orders.map((o: any) => `- ${o.orderNumber} | ${o.status} | ${o.totalAmount}đ`).join('\n')
        : '(không có / không được phép xem đơn cá nhân)';
    const hist = (history || [])
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'Khách' : 'AI'}: ${h.content}`)
      .join('\n');

    return [
      'Bạn là trợ lý AI PhoneShop, trả lời tiếng Việt, ngắn gọn, thân thiện.',
      'QUY TẮC BẮT BUỘC:',
      '- Chỉ dùng giá/tồn/sản phẩm trong CATALOG dưới đây. Không bịa máy, giá, tồn kho.',
      '- Không bao giờ tiết lộ IMEI đầy đủ, chỉ dạng ***1234.',
      '- Đơn hàng cá nhân chỉ dùng ORDER CONTEXT; khách chưa login thì nhắc đăng nhập.',
      '- Nếu không chắc hoặc khiếu nại/pháp lý/hỏng nặng: nói rõ giới hạn và gợi ý gặp nhân viên.',
      `- Catalog:\n${catalog}`,
      `- FAQ:\n${faqText}`,
      `- Đơn cá nhân:\n${orderText}`,
      hist ? `- Hội thoại trước:\n${hist}` : '',
      `- Câu hỏi: ${message}`,
      'Trả lời (tối đa 180 từ, kèm gợi ý 1-2 máy nếu có):',
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
  ): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || '';
    const model = this.config.get<string>('GEMINI_MODEL') || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const prompt = this.buildPrompt(message, history, faqs, products, personal);

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
            generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
          }),
        },
      );
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data: any = await res.json();
      const text: string =
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('')?.trim() || '';
      if (!text) throw new Error('Gemini empty response');
      void maskImei;
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }
}

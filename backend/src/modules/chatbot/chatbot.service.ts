import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { groqChatTurn, type GroqConfig, type ChatMessage } from './groq.client';
import { AskChatbotDto } from './dto/ask-chatbot.dto';

export interface ChatbotProduct {
  slug: string;
  name: string;
  price?: number;
  variants?: Array<{ name: string; price: number }>;
}

export interface ChatbotResponse {
  reply: string;
  products: ChatbotProduct[];
  sources: string[];
  escalate: boolean;
  conversationId: string | null;
}

export interface ChatbotStoreInfo {
  name: string;
  hotline: string;
  email: string;
  address: string;
}

const STORE_DEFAULTS: ChatbotStoreInfo = {
  name: 'PhoneShop',
  hotline: '1900 6868',
  email: 'support@phoneshop.vn',
  address: '123 Đường 3/2, Quận 10, TP.HCM',
};

const MAINTENANCE_REPLY: ChatbotResponse = {
  reply:
    'Xin chào! Tôi là trợ lý ảo PhoneShop. Hiện tại hệ thống AI đang ở chế độ bảo trì, bạn vui lòng liên hệ hotline 1900 6868 để được nhân viên hỗ trợ nhanh nhất nhé!',
  products: [],
  sources: [],
  escalate: false,
  conversationId: null,
};

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async ask(dto: AskChatbotDto, _user: any): Promise<ChatbotResponse> {
    const message = (dto.message || '').trim();
    if (!message) {
      return {
        reply: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?',
        products: [],
        sources: [],
        escalate: false,
        conversationId: dto.conversationId || null,
      };
    }

    const enabled =
      (this.config.get<string>('CHATBOT_ENABLED') ??
        process.env.CHATBOT_ENABLED ??
        'true') !== 'false';
    const llmConfig = this.getLlmConfig();

    if (!enabled || !llmConfig || !llmConfig.apiKey) {
      this.logger.warn('Chatbot disabled or API key missing, returning maintenance reply');
      return { ...MAINTENANCE_REPLY };
    }

    try {
      // 1. Query top 10 active products with variants and pricing
      const products = await this.prisma.product.findMany({
        where: { status: 'ACTIVE' },
        take: 10,
        select: {
          name: true,
          slug: true,
          variants: {
            select: {
              name: true,
              price: true,
            },
          },
        },
      });

      // 2. Query basic store info
      const store = this.getStoreInfo();

      // 3. Create concise system prompt
      const systemPrompt = this.buildSystemPrompt(store, products);

      // 4. Build chat messages (system, history, current message)
      const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

      if (Array.isArray(dto.history)) {
        for (const turn of dto.history.slice(-6)) {
          if (turn.content && (turn.role === 'user' || turn.role === 'assistant')) {
            messages.push({ role: turn.role, content: turn.content });
          }
        }
      }

      messages.push({ role: 'user', content: message });

      // 5. Call LLM via groqChatTurn (with fallback model if needed)
      const result = await this.callLlm(llmConfig, messages);

      if (!result?.text) {
        throw new Error('Empty response from AI model');
      }

      return {
        reply: result.text,
        products: [],
        sources: [],
        escalate: false,
        conversationId: dto.conversationId || null,
      };
    } catch (err: any) {
      this.logger.error(`Chatbot ask failed: ${err?.message || err}`);
      return { ...MAINTENANCE_REPLY };
    }
  }

  getSuggestions(): string[] {
    return [
      'iPhone mới nhất giá bao nhiêu?',
      'Chính sách bảo hành tại PhoneShop thế nào?',
      'Shop có hỗ trợ giao hàng tận nơi không?',
      'Các phương thức thanh toán được hỗ trợ?',
    ];
  }

  private getStoreInfo(): ChatbotStoreInfo {
    return {
      name: this.config.get<string>('STORE_NAME') || STORE_DEFAULTS.name,
      hotline: this.config.get<string>('STORE_HOTLINE') || STORE_DEFAULTS.hotline,
      email: this.config.get<string>('STORE_EMAIL') || STORE_DEFAULTS.email,
      address: this.config.get<string>('STORE_ADDRESS') || STORE_DEFAULTS.address,
    };
  }

  private buildSystemPrompt(
    store: ChatbotStoreInfo,
    products: Array<{
      name: string;
      slug: string;
      variants: Array<{ name: string; price: any }>;
    }>,
  ): string {
    const catalog = products
      .map((p) => {
        const variantsStr = p.variants
          .map((v) => `${v.name}: ${Number(v.price).toLocaleString('vi-VN')}đ`)
          .join(', ');
        return `- ${p.name}${variantsStr ? ` (${variantsStr})` : ''}`;
      })
      .join('\n');

    return (
      `Bạn là trợ lý ảo AI PhoneShop của cửa hàng bán lẻ điện thoại ${store.name}.\n` +
      `Nhiệm vụ của bạn là tư vấn nhiệt tình, lịch sự và chính xác cho khách hàng về điện thoại, giá bán và chính sách bảo hành.\n\n` +
      `Thông tin cửa hàng:\n` +
      `- Hotline: ${store.hotline}\n` +
      `- Email: ${store.email}\n` +
      `- Địa chỉ: ${store.address}\n` +
      `- Chính sách bảo hành: 12 tháng chính hãng, lỗi 1 đổi 1 trong vòng 30 ngày đầu.\n` +
      `- Giao hàng: Giao hàng toàn quốc, hỗ trợ kiểm tra hàng trước khi thanh toán.\n` +
      `- Thanh toán: Hỗ trợ tiền mặt (COD), chuyển khoản, VNPay và trả góp 0%.\n\n` +
      `Danh sách 10 sản phẩm tiêu biểu hiện có tại cửa hàng:\n` +
      `${catalog || '- Hiện chưa có sản phẩm nào.'}\n\n` +
      `Quy tắc trả lời:\n` +
      `1. Trả lời bằng tiếng Việt ngắn gọn, thân thiện, súc tích.\n` +
      `2. Chỉ tư vấn thông tin dựa trên dữ liệu sản phẩm và chính sách trên. Nếu thông tin không có hoặc khách muốn khiếu nại/hỗ trợ kỹ thuật chuyên sâu, hãy hướng dẫn khách gọi hotline ${store.hotline}.`
    );
  }

  private getLlmConfig(): GroqConfig | null {
    const provider = (
      this.config.get<string>('CHATBOT_PROVIDER') ||
      process.env.CHATBOT_PROVIDER ||
      ''
    ).toLowerCase();

    const geminiKey =
      this.config.get<string>('GEMINI_API_KEY') ||
      process.env.GEMINI_API_KEY ||
      '';

    const groqKey =
      this.config.get<string>('GROQ_API_KEY') ||
      process.env.GROQ_API_KEY ||
      '';

    const nineRouterKey =
      this.config.get<string>('NINEROUTER_API_KEY') ||
      process.env.NINEROUTER_API_KEY ||
      '';

    if (provider === 'groq' || (!provider && groqKey)) {
      if (!groqKey) return null;
      return {
        label: 'Groq',
        apiKey: groqKey,
        model:
          this.config.get<string>('GROQ_MODEL') ||
          process.env.GROQ_MODEL ||
          'llama-3.3-70b-versatile',
        baseUrl: (
          this.config.get<string>('GROQ_BASE_URL') ||
          process.env.GROQ_BASE_URL ||
          'https://api.groq.com/openai/v1'
        ).replace(/\/+$/, ''),
      };
    }

    if (provider === 'ninerouter' || (!provider && nineRouterKey)) {
      if (!nineRouterKey) return null;
      return {
        label: '9router',
        apiKey: nineRouterKey,
        model:
          this.config.get<string>('NINEROUTER_MODEL') ||
          process.env.NINEROUTER_MODEL ||
          'ag/gemini-3.8-flash-high',
        baseUrl: (
          this.config.get<string>('NINEROUTER_BASE_URL') ||
          process.env.NINEROUTER_BASE_URL ||
          'http://localhost:20128/v1'
        ).replace(/\/+$/, ''),
      };
    }

    if (geminiKey) {
      return {
        label: 'Gemini',
        apiKey: geminiKey,
        model:
          this.config.get<string>('GEMINI_MODEL') ||
          process.env.GEMINI_MODEL ||
          'gemini-2.5-flash',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      };
    }

    return null;
  }

  private async callLlm(
    cfg: GroqConfig,
    messages: ChatMessage[],
  ): Promise<{ text: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      return await groqChatTurn(
        cfg,
        messages,
        (w) => this.logger.warn(w),
        controller.signal,
      );
    } catch (err: any) {
      // If primary Gemini model is overloaded (e.g. 503 high demand), try gemini-2.5-flash fallback
      if (cfg.label === 'Gemini' && cfg.model !== 'gemini-2.5-flash') {
        this.logger.warn(`Retrying with fallback Gemini model gemini-2.5-flash...`);
        const fallbackCfg: GroqConfig = { ...cfg, model: 'gemini-2.5-flash' };
        return await groqChatTurn(
          fallbackCfg,
          messages,
          (w) => this.logger.warn(w),
          controller.signal,
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

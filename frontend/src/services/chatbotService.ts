import { apiClient, ensureFreshAccessToken, getApiBaseUrl, getStoredAccessToken } from './apiClient';

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

export interface FlashSalePricingInfo {
  isFlashSale: boolean;
  flashPrice: number;
  originalPrice: number;
  discountPercent?: number;
}

export function getFlashSaleInfo(product: ChatbotProduct): FlashSalePricingInfo {
  const flashVariants = (product.variants || []).filter(
    (v) => typeof v.flashPrice === 'number' && v.flashPrice > 0,
  );

  if (flashVariants.length > 0) {
    const lowest = flashVariants.reduce((min, cur) =>
      (cur.flashPrice ?? cur.price) < (min.flashPrice ?? min.price) ? cur : min,
    );
    const flashPrice = lowest.flashPrice || lowest.price;
    const originalPrice = lowest.compareAtPrice || lowest.price;
    const discountPercent =
      originalPrice > flashPrice ? Math.round(((originalPrice - flashPrice) / originalPrice) * 100) : undefined;

    return {
      isFlashSale: true,
      flashPrice,
      originalPrice,
      discountPercent,
    };
  }

  return {
    isFlashSale: false,
    flashPrice: product.price,
    originalPrice: product.price,
  };
}

export interface ChatbotAskResponse {
  reply: string;
  products: ChatbotProduct[];
  sources: string[];
  escalate: boolean;
  conversationId?: string | null;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamChatEvent {
  type: 'token' | 'products' | 'done';
  text?: string;
  products?: ChatbotProduct[];
  sources?: string[];
  escalate?: boolean;
}

export const chatbotService = {
  ask: async (
    message: string,
    history: ChatHistoryItem[] = [],
    conversationId?: string | null,
  ): Promise<ChatbotAskResponse> => {
    await ensureFreshAccessToken();
    const res = await apiClient.post('/chatbot/ask', { message, history, conversationId });
    return res.data?.data ?? res.data;
  },

  getSuggestions: async (): Promise<string[]> => {
    const res = await apiClient.get('/chatbot/suggestions');
    const data = res.data?.data ?? res.data;
    return data?.suggestions ?? [];
  },

  // Streaming SSE: gọi token từng chunk, fallback về ask() khi lỗi.
  askStream: async (
    message: string,
    conversationId: string | null | undefined,
    onEvent: (e: StreamChatEvent) => void,
  ): Promise<void> => {
    await ensureFreshAccessToken();
    const params = new URLSearchParams({ message });
    if (conversationId) params.set('conversationId', conversationId);
    const res = await fetch(`${getApiBaseUrl().replace(/\/$/, '')}/chatbot/stream?${params.toString()}`, {
      headers: {
        Accept: 'text/event-stream',
        ...(getStoredAccessToken() ? { Authorization: `Bearer ${getStoredAccessToken()}` } : {}),
      },
    });
    if (!res.ok || !res.body) throw new Error(`Stream HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const payload = t.slice(5).trim();
        if (!payload) continue;
        onEvent(JSON.parse(payload) as StreamChatEvent);
      }
    }
  },
};

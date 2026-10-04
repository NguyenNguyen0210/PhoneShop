import { apiClient } from './apiClient';

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
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export const chatbotService = {
  ask: async (message: string, history: ChatHistoryItem[] = []): Promise<ChatbotAskResponse> => {
    const res = await apiClient.post('/chatbot/ask', { message, history });
    return res.data?.data ?? res.data;
  },

  getSuggestions: async (): Promise<string[]> => {
    const res = await apiClient.get('/chatbot/suggestions');
    const data = res.data?.data ?? res.data;
    return data?.suggestions ?? [];
  },
};

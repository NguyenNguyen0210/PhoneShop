import { apiClient } from './apiClient';

export interface ChatbotProduct {
  slug: string;
  name: string;
  brand?: string;
  price: number;
  image: string;
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

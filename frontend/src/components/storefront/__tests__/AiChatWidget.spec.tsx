// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AiChatWidget } from '../AiChatWidget';
import { chatbotService } from '../../../services/chatbotService';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useCartStore } from '../../../stores/useCartStore';

vi.mock('../../../services/chatbotService', () => ({
  chatbotService: {
    ask: vi.fn(),
    getSuggestions: vi.fn(),
  },
  getFlashSaleInfo: (_p?: any) => ({
    isFlashSale: true,
    flashPrice: 27271000,
    originalPrice: 30990000,
    discountPercent: 12,
  }),
}));

describe('AiChatWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    useAuthStore.setState({ user: null });
    (chatbotService.getSuggestions as any).mockResolvedValue([
      '⚡ Flash sale nào đang chạy?',
      '🏷️ Voucher nào dùng được hôm nay?',
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders open button and displays flash sale suggestion', async () => {
    render(
      <BrowserRouter>
        <AiChatWidget />
      </BrowserRouter>,
    );

    const openBtn = screen.getByRole('button', { name: /Hỏi AI PhoneShop/i });
    expect(openBtn).toBeDefined();

    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(screen.getByText(/⚡ Flash sale nào đang chạy\?/i)).toBeDefined();
    });
  });

  it('displays Flash Sale tag, sources badge and strike-through price when chatbot replies with flash products', async () => {
    (chatbotService.ask as any).mockResolvedValue({
      reply: 'Hiện có iPhone 16 Pro Max đang Flash Sale cực sốc!',
      products: [
        {
          slug: 'iphone-16-pro-max',
          name: 'iPhone 16 Pro Max',
          brand: 'Apple',
          price: 27271000,
          image: '/images/ip16.png',
        },
      ],
      sources: ['flash-sale', 'voucher'],
      escalate: false,
    });

    render(
      <BrowserRouter>
        <AiChatWidget />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hỏi AI PhoneShop/i }));

    const flashChip = await screen.findByText(/⚡ Flash sale nào đang chạy\?/i);
    fireEvent.click(flashChip);

    await waitFor(() => {
      expect(screen.getByText('Hiện có iPhone 16 Pro Max đang Flash Sale cực sốc!')).toBeDefined();
      expect(screen.getAllByText(/Flash Sale/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/27\.271\.000đ/)).toBeDefined();
      expect(screen.getByText(/30\.990\.000đ/)).toBeDefined();
    });
  });

  it('refreshes local cart after a successful ask so cart page is not stale', async () => {    (chatbotService.ask as any).mockResolvedValue({
      reply: 'Đã thêm vào giỏ.',
      products: [],
      sources: [],
      escalate: false,
    });
    const syncSpy = vi.spyOn(useCartStore.getState(), 'syncWithBackend').mockResolvedValue(undefined);

    render(
      <BrowserRouter>
        <AiChatWidget />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hỏi AI PhoneShop/i }));
    const flashChip = await screen.findByText(/⚡ Flash sale nào đang chạy\?/i);
    fireEvent.click(flashChip);

    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalled();
    });
    syncSpy.mockRestore();
  });

  it('keeps partial streamed content and skips REST duplicate on mid-stream error', async () => {    (chatbotService.ask as any).mockClear();
    (chatbotService as any).askStream = vi.fn(async (_msg: string, _conv: string, onEvent: any) => {
      onEvent({ type: 'token', text: 'Chào' });
      throw new Error('cut');
    });

    render(
      <BrowserRouter>
        <AiChatWidget />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hỏi AI PhoneShop/i }));
    const flashChip = await screen.findByText(/⚡ Flash sale nào đang chạy\?/i);
    fireEvent.click(flashChip);

    await waitFor(() => {
      expect(screen.getByText('Chào')).toBeDefined();
    });
    expect(chatbotService.ask).not.toHaveBeenCalled();
    delete (chatbotService as any).askStream;
  });

  it('renders streamed tokens progressively and falls back cleanly', async () => {
    (chatbotService as any).askStream = vi.fn(async (_msg: string, _conv: string, onEvent: any) => {
      onEvent({ type: 'token', text: 'Xin ' });
      onEvent({ type: 'token', text: 'chào' });
      onEvent({ type: 'products', products: [], sources: [], escalate: false });
      onEvent({ type: 'done' });
    });

    render(
      <BrowserRouter>
        <AiChatWidget />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hỏi AI PhoneShop/i }));
    const flashChip = await screen.findByText(/⚡ Flash sale nào đang chạy\?/i);
    fireEvent.click(flashChip);

    await waitFor(() => {
      expect(screen.getByText('Xin chào')).toBeDefined();
    });
    expect(chatbotService.ask).not.toHaveBeenCalled();
    delete (chatbotService as any).askStream;
  });

  it('retries REST once after 429 before showing busy', async () => {
    delete (chatbotService as any).askStream;
    (chatbotService.ask as any)
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValueOnce({
        reply: 'Xong sau retry.',
        products: [],
        sources: [],
        escalate: false,
      });

    render(
      <BrowserRouter>
        <AiChatWidget />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Hỏi AI PhoneShop/i }));
    const flashChip = await screen.findByText(/⚡ Flash sale nào đang chạy\?/i);
    fireEvent.click(flashChip);

    await waitFor(
      () => {
        expect(screen.getByText('Xong sau retry.')).toBeDefined();
      },
      { timeout: 8000 },
    );
    expect(chatbotService.ask).toHaveBeenCalledTimes(2);
  });
});

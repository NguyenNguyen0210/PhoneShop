// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FlashSaleSection } from '../FlashSaleSection';
import { BrowserRouter } from 'react-router-dom';

describe('FlashSaleSection', () => {
  it('renders countdown and items when active campaign provided', () => {
    const mockCampaign: any = {
      id: 'camp-1',
      name: 'Flash Sale Giá Sốc',
      startAt: new Date(Date.now() - 1000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      items: [
        {
          id: 'item-1',
          flashPrice: 20000000,
          stockLimit: 50,
          soldCount: 30,
          variant: {
            name: 'iPhone 15 Pro',
            price: 25000000,
            product: { name: 'iPhone 15 Pro', slug: 'iphone-15-pro' },
          },
        },
      ],
    };

    render(
      <BrowserRouter>
        <FlashSaleSection campaign={mockCampaign} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Flash Sale Giá Sốc/i)).toBeTruthy();
    expect(screen.getByText(/KẾT THÚC TRONG/i)).toBeTruthy();
    expect(screen.getByText(/20.000.000₫/i)).toBeTruthy();
    expect(screen.getByText(/ĐÃ BÁN 30\/50/i)).toBeTruthy();
  });

  it('renders null when campaign has no items or is null', () => {
    const { container: c1 } = render(<FlashSaleSection campaign={null} />);
    expect(c1.firstChild).toBeNull();

    const emptyCampaign: any = {
      id: 'camp-2',
      name: 'Sale',
      endAt: new Date(Date.now() + 3600000).toISOString(),
      items: [],
    };
    const { container: c2 } = render(<FlashSaleSection campaign={emptyCampaign} />);
    expect(c2.firstChild).toBeNull();
  });

  it('renders "VỪA MỞ BÁN" when soldCount is 0', () => {
    const mockCampaign: any = {
      id: 'camp-3',
      name: 'Flash Sale Giá Sốc',
      startAt: new Date(Date.now() - 1000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      items: [
        {
          id: 'item-new',
          flashPrice: 15000000,
          stockLimit: 20,
          soldCount: 0,
          variant: {
            name: 'Xiaomi 14',
            price: 18000000,
            product: { name: 'Xiaomi 14', slug: 'xiaomi-14' },
          },
        },
      ],
    };

    render(
      <BrowserRouter>
        <FlashSaleSection campaign={mockCampaign} />
      </BrowserRouter>
    );

    expect(screen.getByText(/VỪA MỞ BÁN/i)).toBeTruthy();
  });

  it('renders "SẮP CHÁY HÀNG" when soldCount >= 80% of stockLimit', () => {
    const mockCampaign: any = {
      id: 'camp-4',
      name: 'Flash Sale Giá Sốc',
      startAt: new Date(Date.now() - 1000).toISOString(),
      endAt: new Date(Date.now() + 3600000).toISOString(),
      items: [
        {
          id: 'item-hot',
          flashPrice: 15000000,
          stockLimit: 20,
          soldCount: 18,
          variant: {
            name: 'Samsung S24',
            price: 19000000,
            product: { name: 'Samsung S24', slug: 'samsung-s24' },
          },
        },
      ],
    };

    render(
      <BrowserRouter>
        <FlashSaleSection campaign={mockCampaign} />
      </BrowserRouter>
    );

    expect(screen.getByText(/SẮP CHÁY HÀNG/i)).toBeTruthy();
  });

  it('renders null when campaign has already expired', () => {
    const expiredCampaign: any = {
      id: 'camp-expired',
      name: 'Expired Sale',
      startAt: new Date(Date.now() - 7200000).toISOString(),
      endAt: new Date(Date.now() - 3600000).toISOString(),
      items: [
        {
          id: 'item-expired',
          flashPrice: 10000000,
          stockLimit: 10,
          soldCount: 5,
        },
      ],
    };

    const { container } = render(<FlashSaleSection campaign={expiredCampaign} />);
    expect(container.firstChild).toBeNull();
  });
});

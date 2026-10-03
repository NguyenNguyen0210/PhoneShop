// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrandStatsCards } from '../BrandStatsCards';
import { BrandFormModal, slugify } from '../BrandFormModal';
import type { Brand } from '../../../../../types';

// Mock matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ImageUploadDragger
vi.mock('../../../../../components/admin/ImageUploadDragger', () => ({
  ImageUploadDragger: ({ value, onChange }: any) => (
    <div data-testid="mock-image-upload-dragger" onClick={() => onChange?.('https://example.com/logo.webp')}>
      {value ? `Current Logo: ${value}` : 'Upload Dragger'}
    </div>
  ),
}));

describe('slugify helper', () => {
  it('converts Vietnamese text with accents and diacritics to clean slug', () => {
    expect(slugify('Điện Thoại Thông Minh')).toBe('dien-thoai-thong-minh');
    expect(slugify('Đồng Hồ Thông Minh & Phụ Kiện')).toBe('dong-ho-thong-minh-phu-kien');
  });

  it('handles special characters and whitespace', () => {
    expect(slugify('  Apple iPhone 16 Pro!  ')).toBe('apple-iphone-16-pro');
    expect(slugify('Samsung Galaxy S24 Ultra (512GB)')).toBe('samsung-galaxy-s24-ultra-512gb');
  });
});

describe('BrandStatsCards', () => {
  it('renders 4 statistic cards with given numbers', () => {
    render(
      <BrandStatsCards
        total={25}
        active={20}
        inactive={5}
        totalProducts={150}
        loading={false}
      />
    );

    expect(screen.getByText('Tổng thương hiệu')).toBeDefined();
    expect(screen.getByText('25')).toBeDefined();

    expect(screen.getByText('Đang hoạt động')).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();

    expect(screen.getByText('Ngừng kinh doanh')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();

    expect(screen.getByText('Tổng sản phẩm')).toBeDefined();
    expect(screen.getByText('150')).toBeDefined();
  });

  it('renders skeleton loaders when loading is true', () => {
    const { container } = render(
      <BrandStatsCards
        total={25}
        active={20}
        inactive={5}
        totalProducts={150}
        loading={true}
      />
    );

    const skeletons = container.querySelectorAll('.ant-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText('25')).toBeNull();
  });
});

describe('BrandFormModal', () => {
  const mockBrand: Brand = {
    id: 'brand-1',
    name: 'Xiaomi',
    slug: 'xiaomi',
    logoUrl: 'https://cdn.example.com/xiaomi.png',
    websiteUrl: 'https://mi.com',
    description: 'Thương hiệu công nghệ Xiaomi',
    isActive: true,
  };

  it('renders create modal and auto-generates slug on name change', async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BrandFormModal
        open={true}
        onCancel={onCancel}
        onSubmit={onSubmit}
        loading={false}
        editingBrand={null}
      />
    );

    expect(screen.getByText('Thêm mới Thương hiệu')).toBeDefined();

    const nameInput = screen.getByPlaceholderText(/Apple, Samsung, Xiaomi/i);
    const slugInput = screen.getByPlaceholderText(/ví-du: apple/i);

    fireEvent.change(nameInput, { target: { value: 'Google Pixel' } });

    expect((slugInput as HTMLInputElement).value).toBe('google-pixel');
  });

  it('populates fields when editing an existing brand and does not overwrite slug on name change', async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BrandFormModal
        open={true}
        onCancel={onCancel}
        onSubmit={onSubmit}
        loading={false}
        editingBrand={mockBrand}
      />
    );

    expect(screen.getByText('Chỉnh sửa Thương hiệu')).toBeDefined();

    const nameInput = screen.getByPlaceholderText(/Apple, Samsung, Xiaomi/i) as HTMLInputElement;
    const slugInput = screen.getByPlaceholderText(/ví-du: apple/i) as HTMLInputElement;

    expect(nameInput.value).toBe('Xiaomi');
    expect(slugInput.value).toBe('xiaomi');

    // In edit mode, changing name does NOT overwrite existing slug
    fireEvent.change(nameInput, { target: { value: 'Xiaomi Global' } });
    expect(slugInput.value).toBe('xiaomi');
  });

  it('submits form with trimmed values', async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <BrandFormModal
        open={true}
        onCancel={onCancel}
        onSubmit={onSubmit}
        loading={false}
        editingBrand={null}
      />
    );

    const nameInput = screen.getByPlaceholderText(/Apple, Samsung, Xiaomi/i);
    fireEvent.change(nameInput, { target: { value: 'Realme ' } });

    const okButton = screen.getByRole('button', { name: /Tạo mới/i });
    fireEvent.click(okButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Realme',
          slug: 'realme',
          isActive: true,
        })
      );
    });
  });
});

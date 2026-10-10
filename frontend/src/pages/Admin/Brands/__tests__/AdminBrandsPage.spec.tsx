// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminBrandsPage } from '../AdminBrandsPage';
import { brandService } from '../../../../services/brandService';

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

vi.mock('../../../../services/brandService', () => ({
  brandService: {
    getAllAdmin: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    activate: vi.fn(),
    deactivate: vi.fn(),
    getFeatured: vi.fn(),
    updateFeatured: vi.fn(),
  },
}));

vi.mock('../../../../stores/useAuthStore', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      user: {
        id: 'admin-id-1',
        email: 'admin@cellphones.com',
        role: 'ADMIN',
        fullName: 'Admin User',
      },
      isAdmin: () => true,
    };
    return selector ? selector(state) : state;
  },
}));

const mockBrandsData = [
  {
    id: 'b-apple',
    name: 'Apple',
    slug: 'apple',
    logoUrl: 'https://cdn.example.com/apple.png',
    websiteUrl: 'https://apple.com',
    description: 'Thương hiệu Apple iPhone cao cấp',
    isActive: true,
    _count: { products: 15 },
  },
  {
    id: 'b-samsung',
    name: 'Samsung',
    slug: 'samsung',
    logoUrl: 'https://cdn.example.com/samsung.png',
    websiteUrl: 'https://samsung.com',
    description: 'Thương hiệu Samsung Galaxy',
    isActive: true,
    _count: { products: 0 },
  },
  {
    id: 'b-htc',
    name: 'HTC',
    slug: 'htc',
    logoUrl: null,
    websiteUrl: null,
    description: 'Thương hiệu cũ ngừng kinh doanh',
    isActive: false,
    _count: { products: 0 },
  },
];

describe('AdminBrandsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (brandService.getAllAdmin as any).mockResolvedValue(mockBrandsData);
    (brandService.getFeatured as any).mockResolvedValue(['apple', 'samsung']);
    (brandService.updateFeatured as any).mockResolvedValue(['samsung']);
  });

  it('renders KPI stats, toolbar and brand table with loaded data', async () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Quản lý Thương hiệu')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeDefined();
      expect(screen.getByText('Samsung')).toBeDefined();
      expect(screen.getByText('HTC')).toBeDefined();
    });

    // Check KPI counts: total 3, active 2, inactive 1, products 15
    expect(screen.getByText('Tổng thương hiệu')).toBeDefined();
    expect(screen.getByText(/15 sản phẩm/)).toBeDefined();
  });

  it('renders authorization tier and origin metadata', async () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/AAR \(Đại lý ủy quyền\)/)).toBeDefined();
      expect(screen.getByText(/Flagship Partner/)).toBeDefined();
    });
  });

  it('filters brands based on search input', async () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc slug...');
    fireEvent.change(searchInput, { target: { value: 'Samsung' } });

    expect(screen.getByText('Samsung')).toBeDefined();
    expect(screen.queryByText('Apple')).toBeNull();
    expect(screen.queryByText('HTC')).toBeNull();
  });

  it('opens BrandFormModal when clicking Thêm Thương hiệu button', async () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    const addButton = screen.getByRole('button', { name: /Thêm Thương hiệu/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Thêm mới Thương hiệu')).toBeDefined();
    });
  });

  it('disables delete button for brands that have associated products', async () => {
    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeDefined();
    });

    // Apple has 15 products, delete button must be disabled
    const deleteButtons = screen.getAllByRole('button', { name: /Xóa thương hiệu/i });
    const disabledDeleteBtn = deleteButtons.find((btn) => btn.hasAttribute('disabled'));
    expect(disabledDeleteBtn).toBeDefined();
  });

  it('toggles brand active status when switch is clicked', async () => {
    (brandService.deactivate as any).mockResolvedValue({ id: 'b-apple', isActive: false });

    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Apple')).toBeDefined();
    });

    const switches = screen.getAllByRole('switch');
    // First switch belongs to Apple (active)
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(brandService.deactivate).toHaveBeenCalledWith('b-apple');
    });
  });

  it('loads featured brands on mount and toggles featured status via API when clicked', async () => {
    (brandService.updateFeatured as any).mockResolvedValue(['samsung']);

    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(brandService.getFeatured).toHaveBeenCalled();
      expect(screen.getByText('Apple')).toBeDefined();
    });

    // Apple and Samsung are featured ('★ Nổi bật'), HTC is not ('☆ Thường')
    const featuredButtons = screen.getAllByRole('button', { name: /★ Nổi bật/i });
    expect(featuredButtons.length).toBe(2);

    const normalButtons = screen.getAllByRole('button', { name: /☆ Thường/i });
    expect(normalButtons.length).toBe(1);

    // Click Apple's featured button to unfeature it
    fireEvent.click(featuredButtons[0]);

    await waitFor(() => {
      expect(brandService.updateFeatured).toHaveBeenCalledWith(['samsung']);
    });
  });

  it('adds brand to featured list via API when clicking non-featured button', async () => {
    (brandService.updateFeatured as any).mockResolvedValue(['apple', 'samsung', 'htc']);

    render(
      <MemoryRouter>
        <AdminBrandsPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('HTC')).toBeDefined();
    });

    const normalButton = screen.getByRole('button', { name: /☆ Thường/i });
    fireEvent.click(normalButton);

    await waitFor(() => {
      expect(brandService.updateFeatured).toHaveBeenCalledWith(['apple', 'samsung', 'htc']);
    });
  });
});

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { AdminCategoriesPage } from '../AdminCategoriesPage';
import { categoryService } from '../../../../services/categoryService';

// Mock window.matchMedia for Ant Design
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
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

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;
window.ResizeObserver = ResizeObserverMock;

vi.mock('../../../../services/categoryService', () => ({
  categoryService: {
    getAdminCategoryTree: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    activateCategory: vi.fn(),
    deactivateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

const mockTreeData = [
  {
    id: 'cat-1',
    name: 'Điện thoại iOS',
    slug: 'dien-thoai-ios',
    isActive: true,
    sortOrder: 1,
    imageUrl: 'https://example.com/ios.png',
    _count: { products: 15, children: 1 },
    children: [
      {
        id: 'cat-1-1',
        name: 'iPhone 16 Series',
        slug: 'iphone-16-series',
        parentId: 'cat-1',
        isActive: true,
        sortOrder: 1,
        imageUrl: null,
        _count: { products: 6, children: 0 },
        children: [],
      },
    ],
  },
  {
    id: 'cat-2',
    name: 'Điện thoại Android',
    slug: 'dien-thoai-android',
    isActive: false,
    sortOrder: 2,
    imageUrl: null,
    _count: { products: 10, children: 0 },
    children: [],
  },
];

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders category tree table and stat cards correctly', async () => {
    (categoryService.getAdminCategoryTree as any).mockResolvedValue(mockTreeData);

    render(<AdminCategoriesPage />);

    expect(screen.getByText('Quản lý Danh mục Smartphone')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText('Điện thoại iOS')).toBeTruthy();
      expect(screen.getByText('Điện thoại Android')).toBeTruthy();
    });

    // Check stats (Total categories = 3, Active = 2, Inactive = 1, Products = 31)
    expect(screen.getByText('Tổng số danh mục')).toBeTruthy();
    expect(screen.getByText('Đang kích hoạt')).toBeTruthy();
    expect(screen.getByText('Tạm ẩn')).toBeTruthy();
    expect(screen.getByText('Tổng Smartphone')).toBeTruthy();
    expect(screen.getByText('31 máy')).toBeTruthy();
  });

  it('opens create modal when clicking "+ Thêm danh mục mới"', async () => {
    (categoryService.getAdminCategoryTree as any).mockResolvedValue(mockTreeData);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Điện thoại iOS')).toBeTruthy();
    });

    const createBtn = screen.getByRole('button', { name: /\+ Thêm danh mục mới/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Thêm danh mục Smartphone mới')).toBeTruthy();
  });

  it('opens add child modal when clicking "+ Con"', async () => {
    (categoryService.getAdminCategoryTree as any).mockResolvedValue(mockTreeData);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Điện thoại iOS')).toBeTruthy();
    });

    const addChildBtns = screen.getAllByRole('button', { name: /\+ Con/i });
    fireEvent.click(addChildBtns[0]);

    expect(screen.getByText('Thêm danh mục con cho "Điện thoại iOS"')).toBeTruthy();
  });

  it('opens edit modal when clicking "Sửa"', async () => {
    (categoryService.getAdminCategoryTree as any).mockResolvedValue(mockTreeData);

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Điện thoại iOS')).toBeTruthy();
    });

    const editBtns = screen.getAllByRole('button', { name: /Sửa/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Chỉnh sửa danh mục: Điện thoại iOS')).toBeTruthy();
  });

  it('calls activate/deactivate when toggling category status', async () => {
    (categoryService.getAdminCategoryTree as any).mockResolvedValue(mockTreeData);
    (categoryService.deactivateCategory as any).mockResolvedValue({ id: 'cat-1', isActive: false });

    render(<AdminCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Điện thoại iOS')).toBeTruthy();
    });

    const switches = screen.getAllByRole('switch');
    // First switch is active (Điện thoại iOS) -> click toggles to deactivate
    fireEvent.click(switches[0]);

    await waitFor(() => {
      expect(categoryService.deactivateCategory).toHaveBeenCalledWith('cat-1');
    });
  });
});

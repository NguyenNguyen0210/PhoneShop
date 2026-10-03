// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ProductSpecsTab } from '../ProductSpecsTab';
import { productService } from '../../../../../services/productService';

vi.mock('../../../../../services/productService', () => ({
  productService: {
    updateProduct: vi.fn(),
  },
}));

// Mock window.matchMedia for Ant Design components
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

describe('ProductSpecsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders standard hardware preset fields', () => {
    render(<ProductSpecsTab productId="prod-1" />);

    // Check all 7 hardware preset labels exist
    expect(screen.getByText('Màn hình')).toBeDefined();
    expect(screen.getByText('Chipset / CPU')).toBeDefined();
    expect(screen.getByText('Camera sau')).toBeDefined();
    expect(screen.getByText('Camera trước')).toBeDefined();
    expect(screen.getByText('Pin & Công nghệ sạc')).toBeDefined();
    expect(screen.getByText('Hệ điều hành')).toBeDefined();
    expect(screen.getByText('Cổng kết nối')).toBeDefined();
  });

  it('renders initialSpecs correctly for both preset and custom fields', () => {
    const initialSpecs = {
      'Màn hình': '6.9 inch Super Retina XDR OLED',
      'Chipset / CPU': 'Apple A18 Pro',
      'Pin & Công nghệ sạc': '4685 mAh, Sạc 33W',
      'Kháng nước': 'IP68',
      'Trọng lượng': '227g',
    };

    render(
      <ProductSpecsTab
        productId="prod-100"
        initialSpecs={initialSpecs}
      />
    );

    // Preset fields filled with initial values
    expect(screen.getByDisplayValue('6.9 inch Super Retina XDR OLED')).toBeDefined();
    expect(screen.getByDisplayValue('Apple A18 Pro')).toBeDefined();
    expect(screen.getByDisplayValue('4685 mAh, Sạc 33W')).toBeDefined();

    // Custom fields filled
    expect(screen.getByDisplayValue('Kháng nước')).toBeDefined();
    expect(screen.getByDisplayValue('IP68')).toBeDefined();
    expect(screen.getByDisplayValue('Trọng lượng')).toBeDefined();
    expect(screen.getByDisplayValue('227g')).toBeDefined();
  });

  it('allows adding and removing custom spec rows', async () => {
    render(<ProductSpecsTab productId="prod-100" />);

    // Initially no custom spec inputs
    expect(screen.queryByPlaceholderText(/Tên thông số/i)).toBeNull();

    // Click "+ Thêm thông số khác" button
    const addButton = screen.getByRole('button', { name: /\+ Thêm thông số khác/i });
    fireEvent.click(addButton);

    // Now key and value inputs should appear
    const keyInput = screen.getByPlaceholderText(/Tên thông số/i);
    const valueInput = screen.getByPlaceholderText(/Giá trị/i);
    expect(keyInput).toBeDefined();
    expect(valueInput).toBeDefined();

    // Type custom values
    fireEvent.change(keyInput, { target: { value: 'SIM' } });
    fireEvent.change(valueInput, { target: { value: '2 eSIM' } });
    expect(screen.getByDisplayValue('SIM')).toBeDefined();
    expect(screen.getByDisplayValue('2 eSIM')).toBeDefined();

    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    // Row should be removed
    expect(screen.queryByDisplayValue('SIM')).toBeNull();
    expect(screen.queryByDisplayValue('2 eSIM')).toBeNull();
  });

  it('submits updated specs payload on clicking "Lưu thông số kỹ thuật" and invokes onSaveSuccess', async () => {
    (productService.updateProduct as any).mockResolvedValueOnce({ id: 'prod-100' });
    const onSaveSuccess = vi.fn();

    render(
      <ProductSpecsTab
        productId="prod-100"
        initialSpecs={{
          'Màn hình': '6.9 inch Super Retina OLED',
          'Chipset / CPU': 'Apple A18 Pro',
        }}
        onSaveSuccess={onSaveSuccess}
      />
    );

    // Add a custom spec row
    const addButton = screen.getByRole('button', { name: /\+ Thêm thông số khác/i });
    fireEvent.click(addButton);

    const keyInput = screen.getByPlaceholderText(/Tên thông số/i);
    const valueInput = screen.getByPlaceholderText(/Giá trị/i);
    fireEvent.change(keyInput, { target: { value: 'Âm thanh' } });
    fireEvent.change(valueInput, { target: { value: 'Stereo Speakers, Dolby Atmos' } });

    // Update one preset
    const osInput = screen.getByPlaceholderText(/VD: iOS 18/i);
    fireEvent.change(osInput, { target: { value: 'iOS 18.1' } });

    // Click "Lưu thông số kỹ thuật"
    const saveButton = screen.getByRole('button', { name: /lưu thông số kỹ thuật/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledWith('prod-100', {
        specs: {
          'Màn hình': '6.9 inch Super Retina OLED',
          'Chipset / CPU': 'Apple A18 Pro',
          'Hệ điều hành': 'iOS 18.1',
          'Âm thanh': 'Stereo Speakers, Dolby Atmos',
        },
      });
      expect(onSaveSuccess).toHaveBeenCalled();
    });
  });

  it('handles error gracefully when productService.updateProduct rejects', async () => {
    (productService.updateProduct as any).mockRejectedValueOnce(new Error('Update failed'));
    const onSaveSuccess = vi.fn();

    render(
      <ProductSpecsTab
        productId="prod-100"
        initialSpecs={{ 'Màn hình': '6.1 inch' }}
        onSaveSuccess={onSaveSuccess}
      />
    );

    const saveButton = screen.getByRole('button', { name: /lưu thông số kỹ thuật/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalled();
      expect(onSaveSuccess).not.toHaveBeenCalled();
    });
  });

  it('updates form values when initialSpecs prop changes', () => {
    const { rerender } = render(
      <ProductSpecsTab
        productId="prod-100"
        initialSpecs={{ 'Màn hình': '6.1 inch' }}
      />
    );

    expect(screen.getByDisplayValue('6.1 inch')).toBeDefined();

    rerender(
      <ProductSpecsTab
        productId="prod-100"
        initialSpecs={{ 'Màn hình': '6.7 inch Dynamic Island' }}
      />
    );

    expect(screen.getByDisplayValue('6.7 inch Dynamic Island')).toBeDefined();
  });

  it('ignores empty preset fields and empty custom keys when saving', async () => {
    (productService.updateProduct as any).mockResolvedValueOnce({ id: 'prod-100' });
    const onSaveSuccess = vi.fn();

    render(
      <ProductSpecsTab
        productId="prod-100"
        initialSpecs={{
          'Màn hình': '   ', // whitespace only
          'Chipset / CPU': 'Snapdragon 8 Gen 3',
        }}
        onSaveSuccess={onSaveSuccess}
      />
    );

    // Add empty custom row
    const addButton = screen.getByRole('button', { name: /\+ Thêm thông số khác/i });
    fireEvent.click(addButton);

    // Click Save directly without typing key
    const saveButton = screen.getByRole('button', { name: /lưu thông số kỹ thuật/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(productService.updateProduct).toHaveBeenCalledWith('prod-100', {
        specs: {
          'Chipset / CPU': 'Snapdragon 8 Gen 3',
        },
      });
      expect(onSaveSuccess).toHaveBeenCalled();
    });
  });

  it('correctly maps legacy "Chipset" key from initialSpecs to "Chipset / CPU"', () => {
    render(
      <ProductSpecsTab
        productId="prod-100"
        initialSpecs={{
          'Chipset': 'Google Tensor G4',
        }}
      />
    );

    expect(screen.getByDisplayValue('Google Tensor G4')).toBeDefined();
  });
});

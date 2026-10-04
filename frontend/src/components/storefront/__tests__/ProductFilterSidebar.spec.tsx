// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductFilterSidebar } from '../ProductFilterSidebar';

describe('ProductFilterSidebar', () => {
  const defaultProps = {
    priceRange: [0, 50000000] as [number, number],
    onPriceRangeChange: vi.fn(),
    selectedStorages: [],
    onToggleStorage: vi.fn(),
    selectedRams: [],
    onToggleRam: vi.fn(),
    inStockOnly: false,
    onToggleInStock: vi.fn(),
    onSaleOnly: false,
    onToggleOnSale: vi.fn(),
    minRating: null,
    onSelectMinRating: vi.fn(),
    has5GOnly: false,
    onToggle5G: vi.fn(),
    selectedScreenRanges: [],
    onToggleScreenRange: vi.fn(),
    selectedBatteryRanges: [],
    onToggleBatteryRange: vi.fn(),
    selectedOs: [],
    onToggleOs: vi.fn(),
    selectedChipsets: [],
    onToggleChipset: vi.fn(),
    selectedColors: [],
    onToggleColor: vi.fn(),
    hasActiveFilters: false,
    onResetFilters: vi.fn(),
    showBrands: true,
    brands: [
      { id: 'b1', name: 'Apple', slug: 'apple', isActive: true },
      { id: 'b2', name: 'Samsung', slug: 'samsung', isActive: true },
    ],
    selectedBrands: [],
    onToggleBrand: vi.fn(),
  };

  it('renders 5G toggle and triggers callback on click', () => {
    const onToggle5G = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onToggle5G={onToggle5G}
      />
    );
    const toggle5G = screen.getByText(/5G/i);
    fireEvent.click(toggle5G);
    expect(onToggle5G).toHaveBeenCalledWith(true);
  });

  it('renders quick price buttons and triggers onPriceRangeChange', () => {
    const onPriceRangeChange = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onPriceRangeChange={onPriceRangeChange}
      />
    );
    const quickPriceBtn = screen.getByText('< 5 triệu');
    fireEvent.click(quickPriceBtn);
    expect(onPriceRangeChange).toHaveBeenCalledWith([0, 5000000]);
  });

  it('triggers onToggleRam and onToggleStorage when clicked', () => {
    const onToggleRam = vi.fn();
    const onToggleStorage = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onToggleRam={onToggleRam}
        onToggleStorage={onToggleStorage}
      />
    );
    const ramBtn = screen.getByText('8GB');
    fireEvent.click(ramBtn);
    expect(onToggleRam).toHaveBeenCalledWith('8GB');

    const storageBtn = screen.getByText('256GB');
    fireEvent.click(storageBtn);
    expect(onToggleStorage).toHaveBeenCalledWith('256GB');
  });

  it('triggers onToggleScreenRange and onToggleBatteryRange', () => {
    const onToggleScreenRange = vi.fn();
    const onToggleBatteryRange = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onToggleScreenRange={onToggleScreenRange}
        onToggleBatteryRange={onToggleBatteryRange}
      />
    );
    const screenBtn = screen.getByText('6.1" - 6.7"');
    fireEvent.click(screenBtn);
    expect(onToggleScreenRange).toHaveBeenCalledWith('6.1" - 6.7"');

    const batteryBtn = screen.getByText('4000 - 5000 mAh');
    fireEvent.click(batteryBtn);
    expect(onToggleBatteryRange).toHaveBeenCalledWith('4000 - 5000 mAh');
  });

  it('triggers onToggleOs and onToggleChipset', () => {
    const onToggleOs = vi.fn();
    const onToggleChipset = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onToggleOs={onToggleOs}
        onToggleChipset={onToggleChipset}
      />
    );
    const osBtn = screen.getByText('iOS');
    fireEvent.click(osBtn);
    expect(onToggleOs).toHaveBeenCalledWith('iOS');

    const chipBtn = screen.getByText('Snapdragon');
    fireEvent.click(chipBtn);
    expect(onToggleChipset).toHaveBeenCalledWith('Snapdragon');
  });

  it('renders color swatches and triggers onToggleColor', () => {
    const onToggleColor = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onToggleColor={onToggleColor}
      />
    );
    const colorBtn = screen.getByText('Titan');
    fireEvent.click(colorBtn);
    expect(onToggleColor).toHaveBeenCalledWith('Titan');
  });

  it('triggers onSelectMinRating when rating is clicked', () => {
    const onSelectMinRating = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onSelectMinRating={onSelectMinRating}
      />
    );
    const ratingLabel = screen.getByText(/Từ 4.0 trở lên/i);
    fireEvent.click(ratingLabel);
    expect(onSelectMinRating).toHaveBeenCalledWith(4);
  });

  it('triggers onToggleBrand when brand checkbox is clicked', () => {
    const onToggleBrand = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        onToggleBrand={onToggleBrand}
      />
    );
    const brandLabel = screen.getByText('Samsung');
    fireEvent.click(brandLabel);
    expect(onToggleBrand).toHaveBeenCalledWith('Samsung');
  });

  it('collapses and expands accordion section on title click', () => {
    render(<ProductFilterSidebar {...defaultProps} />);
    expect(screen.getByText('Titan')).toBeDefined();

    // Click accordion header for Bảng màu sắc
    const colorHeader = screen.getByRole('button', { name: /Bảng màu sắc/i });
    fireEvent.click(colorHeader);
    expect(screen.queryByText('Titan')).toBeNull();

    // Re-open
    fireEvent.click(colorHeader);
    expect(screen.getByText('Titan')).toBeDefined();
  });

  it('shows reset button and triggers onResetFilters', () => {
    const onResetFilters = vi.fn();
    render(
      <ProductFilterSidebar
        {...defaultProps}
        hasActiveFilters={true}
        onResetFilters={onResetFilters}
      />
    );
    const resetBtn = screen.getByText('Xóa bộ lọc');
    fireEvent.click(resetBtn);
    expect(onResetFilters).toHaveBeenCalled();
  });
});

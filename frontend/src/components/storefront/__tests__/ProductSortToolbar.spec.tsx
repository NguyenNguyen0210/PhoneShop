// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ProductSortToolbar } from '../ProductSortToolbar';

describe('ProductSortToolbar', () => {
  it('renders sort options including best-seller and top-discount', () => {
    const onSortChange = vi.fn();
    render(
      <ProductSortToolbar
        searchKeyword=""
        onSearchChange={vi.fn()}
        sortBy="default"
        onSortChange={onSortChange}
        totalCount={10}
      />
    );
    expect(screen.getByText(/Bán chạy nhất/)).toBeDefined();
    expect(screen.getByText(/Khuyến mãi nhiều nhất/)).toBeDefined();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'best-seller' } });
    expect(onSortChange).toHaveBeenCalledWith('best-seller');

    fireEvent.change(select, { target: { value: 'top-discount' } });
    expect(onSortChange).toHaveBeenCalledWith('top-discount');
  });
});

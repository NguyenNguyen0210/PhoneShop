// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StorefrontServiceBar } from '../StorefrontServiceBar';

describe('StorefrontServiceBar', () => {
  it('renders all 4 retail commercial guarantee titles and descriptions', () => {
    render(<StorefrontServiceBar />);

    // 1. Giao hỏa tốc 2h - Miễn phí nội thành
    expect(screen.getByText('Giao hỏa tốc 2h')).toBeTruthy();
    expect(screen.getByText('Miễn phí nội thành')).toBeTruthy();

    // 2. Bảo hành 12 tháng - Chính hãng toàn quốc
    expect(screen.getByText('Bảo hành 12 tháng')).toBeTruthy();
    expect(screen.getByText('Chính hãng toàn quốc')).toBeTruthy();

    // 3. 1 đổi 1 trong 30 ngày - Nếu lỗi nhà sản xuất
    expect(screen.getByText('1 đổi 1 trong 30 ngày')).toBeTruthy();
    expect(screen.getByText('Nếu lỗi nhà sản xuất')).toBeTruthy();

    // 4. Thu cũ đổi mới - Trợ giá đến 2.000.000₫
    expect(screen.getByText('Thu cũ đổi mới')).toBeTruthy();
    expect(screen.getByText('Trợ giá đến 2.000.000₫')).toBeTruthy();
  });

  it('renders a responsive 2-column mobile and 4-column desktop grid container', () => {
    const { container } = render(<StorefrontServiceBar />);
    const grid = container.querySelector('.grid');
    expect(grid).not.toBeNull();
    expect(grid?.className).toMatch(/grid-cols-2/);
    expect(grid?.className).toMatch(/(md|lg):grid-cols-4/);
  });

  it('applies custom className if passed', () => {
    const { container } = render(<StorefrontServiceBar className="custom-test-class" />);
    expect(container.firstChild).toHaveProperty('className');
    expect((container.firstChild as HTMLElement).className).toContain('custom-test-class');
  });
});

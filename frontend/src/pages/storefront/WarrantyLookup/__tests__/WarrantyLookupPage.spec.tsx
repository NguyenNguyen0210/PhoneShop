// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { WarrantyLookupPage } from '../WarrantyLookupPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <WarrantyLookupPage />
    </MemoryRouter>
  );

describe('WarrantyLookupPage — customer care portal', () => {
  it('renders 2 lookup tabs with IMEI active by default', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /theo mã IMEI/ })).toBeDefined();
    expect(screen.getByRole('tab', { name: /theo Số điện thoại/ })).toBeDefined();
    expect(screen.getByText(/Mã số IMEI hoặc Số Sê-ri/)).toBeDefined();
  });

  it('switches to phone tab and validates VN phone', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /theo Số điện thoại/ }));
    expect(screen.getByText(/Số điện thoại mua hàng/)).toBeDefined();
    fireEvent.click(screen.getByText('Tiếp tục tra cứu'));
    expect(screen.getByText(/nhập số điện thoại mua hàng/i)).toBeDefined();
  });

  it('shows visual IMEI guide and hotline banner', () => {
    renderPage();
    expect(screen.getByText(/Hướng dẫn tìm mã IMEI/)).toBeDefined();
    expect(screen.getByText('Bấm phím gọi')).toBeDefined();
    expect(screen.getByText('1800 6869')).toBeDefined();
  });
});

// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardFilterBar } from '../DashboardFilterBar';

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

describe('DashboardFilterBar', () => {
  const defaultProps = {
    preset: '7_DAYS' as const,
    dateRange: ['2026-09-27', '2026-10-04'] as [string, string],
    onPresetChange: vi.fn(),
    onCustomRangeChange: vi.fn(),
    onRefresh: vi.fn(),
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all preset options and timezone tag', () => {
    render(<DashboardFilterBar {...defaultProps} />);

    expect(screen.getByText('7 ngày qua')).toBeDefined();
    expect(screen.getByText('30 ngày qua')).toBeDefined();
    expect(screen.getByText('Tháng này')).toBeDefined();
    expect(screen.getByText('Tùy chọn')).toBeDefined();
    expect(screen.getByText('Múi giờ: Asia/Ho_Chi_Minh')).toBeDefined();
    expect(screen.getByText('Làm mới')).toBeDefined();
  });

  it('does not display RangePicker when preset is not CUSTOM', () => {
    const { container } = render(<DashboardFilterBar {...defaultProps} preset="7_DAYS" />);
    expect(container.querySelector('.ant-picker-range')).toBeNull();
  });

  it('displays RangePicker when preset is CUSTOM', () => {
    const { container } = render(<DashboardFilterBar {...defaultProps} preset="CUSTOM" />);
    expect(container.querySelector('.ant-picker-range')).not.toBeNull();
  });

  it('calls onPresetChange when a preset option is clicked', () => {
    render(<DashboardFilterBar {...defaultProps} />);

    const thirtyDaysBtn = screen.getByText('30 ngày qua');
    fireEvent.click(thirtyDaysBtn);

    expect(defaultProps.onPresetChange).toHaveBeenCalledWith('30_DAYS');
  });

  it('calls onRefresh when reload button is clicked', () => {
    render(<DashboardFilterBar {...defaultProps} />);

    const refreshBtn = screen.getByText('Làm mới');
    fireEvent.click(refreshBtn);

    expect(defaultProps.onRefresh).toHaveBeenCalledTimes(1);
  });

  it('displays the date range values in RangePicker inputs when preset is CUSTOM', () => {
    const { container } = render(
      <DashboardFilterBar {...defaultProps} preset="CUSTOM" dateRange={['2026-09-01', '2026-09-15']} />
    );
    const inputs = container.querySelectorAll<HTMLInputElement>('.ant-picker-input input');
    expect(inputs[0].value).toBe('2026-09-01');
    expect(inputs[1].value).toBe('2026-09-15');
  });

  it('disables refresh button when loading is true', () => {
    render(<DashboardFilterBar {...defaultProps} loading={true} />);

    const refreshBtn = screen.getByRole('button', { name: /làm mới/i });
    expect(refreshBtn).toHaveProperty('disabled', true);
  });
});

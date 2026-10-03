// @vitest-environment jsdom
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminAuditLogsPage } from '../AdminAuditLogsPage';
import { auditLogService } from '../../../../services/auditLogService';

// Mock window.matchMedia for Ant Design components
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

vi.mock('../../../../services/auditLogService', () => ({
  auditLogService: {
    getAuditLogs: vi.fn(),
    getAuditLogStats: vi.fn(),
    exportAuditLogsToCsv: vi.fn(),
  },
}));

describe('AdminAuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auditLogService.getAuditLogStats as any).mockResolvedValue({
      totalLogs: 120,
      todayLogs: 15,
      sensitiveOperations: 5,
    });
    (auditLogService.getAuditLogs as any).mockResolvedValue({
      data: [
        {
          id: 'log-001',
          action: 'CREATE',
          entity: 'Product',
          entityId: 'prod-1234567890',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 Chrome',
          createdAt: new Date().toISOString(),
          user: {
            id: 'u-1',
            email: 'admin@system.com',
            firstName: 'Super',
            lastName: 'Admin',
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });
  });

  it('should render header and metric cards', async () => {
    render(<AdminAuditLogsPage />);

    expect(screen.getByText('Nhật ký kiểm toán hệ thống')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('Tổng số nhật ký hệ thống')).toBeDefined();
      expect(screen.getByText('120')).toBeDefined();
      expect(screen.getByText('15')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
    });
  });

  it('should render audit log rows and open detail drawer on click', async () => {
    render(<AdminAuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByText('Product')).toBeDefined();
      expect(screen.getByText('admin@system.com')).toBeDefined();
    });

    const detailBtn = screen.getByRole('button', { name: /chi tiết/i });
    fireEvent.click(detailBtn);

    await waitFor(() => {
      expect(screen.getByText('Chi tiết nhật ký kiểm toán')).toBeDefined();
      expect(screen.getByText('Log ID')).toBeDefined();
    });
  }, 15000);

  it('should trigger export CSV when clicking Xuất CSV button', async () => {
    (auditLogService.exportAuditLogsToCsv as any).mockResolvedValueOnce(undefined);
    render(<AdminAuditLogsPage />);

    const exportBtn = screen.getByRole('button', { name: /xuất csv/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(auditLogService.exportAuditLogsToCsv).toHaveBeenCalled();
    });
  });

  it('should reset filters when clicking Đặt lại button', async () => {
    render(<AdminAuditLogsPage />);

    const resetBtn = screen.getByRole('button', { name: /đặt lại/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(auditLogService.getAuditLogs).toHaveBeenCalled();
    });
  });
});

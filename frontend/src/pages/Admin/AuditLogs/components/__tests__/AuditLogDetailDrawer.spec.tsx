// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuditLogDetailDrawer,
  getAuditActionColor,
} from '../AuditLogDetailDrawer';
import type { AuditLogEntry } from '../../../../../types/auditLog';

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

describe('AuditLogDetailDrawer', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuditActionColor', () => {
    it('returns appropriate color mapping for known actions', () => {
      expect(getAuditActionColor('CREATE')).toBe('success');
      expect(getAuditActionColor('UPDATE')).toBe('processing');
      expect(getAuditActionColor('DELETE')).toBe('error');
      expect(getAuditActionColor('PAYMENT')).toBe('gold');
      expect(getAuditActionColor('REFUND')).toBe('volcano');
      expect(getAuditActionColor('LOGIN')).toBe('cyan');
      expect(getAuditActionColor('LOGOUT')).toBe('purple');
      expect(getAuditActionColor('CANCEL_ORDER')).toBe('magenta');
      expect(getAuditActionColor('UPDATE_STOCK')).toBe('orange');
      expect(getAuditActionColor('CHANGE_ROLE')).toBe('geekblue');
      expect(getAuditActionColor('UNKNOWN' as any)).toBe('default');
    });
  });

  it('renders empty message when log is null', () => {
    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={null} />);
    expect(screen.getByText('Không có thông tin nhật ký')).toBeDefined();
  });

  it('renders all metadata correctly for a complete log entry', () => {
    const mockLog: AuditLogEntry = {
      id: 'log-uuid-1234',
      userId: 'user-uuid-5678',
      action: 'UPDATE',
      entity: 'Product',
      entityId: 'prod-item-99',
      oldData: { price: 100000, name: 'iPhone 14' },
      newData: { price: 120000, name: 'iPhone 14' },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      createdAt: '2026-10-04T10:30:00.000Z',
      user: {
        id: 'user-uuid-5678',
        email: 'manager@shop.com',
        firstName: 'Thanh',
        lastName: 'Tran',
      },
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);

    // Log ID
    expect(screen.getByText('log-uuid-1234')).toBeDefined();
    // Action tag
    expect(screen.getByText('UPDATE')).toBeDefined();
    // Entity
    expect(screen.getByText('Product')).toBeDefined();
    expect(screen.getByText('ID: prod-item-99')).toBeDefined();
    // User
    expect(screen.getByText('Thanh Tran')).toBeDefined();
    expect(screen.getByText(/manager@shop\.com/)).toBeDefined();
    // IP and UserAgent
    expect(screen.getByText('192.168.1.100')).toBeDefined();
    expect(screen.getByText('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBeDefined();
  });

  it('renders "Hệ thống (System)" when log has no user and no userId', () => {
    const mockLog: AuditLogEntry = {
      id: 'log-system-1',
      userId: null,
      action: 'UPDATE_STOCK',
      entity: 'Inventory',
      entityId: 'inv-1',
      oldData: null,
      newData: null,
      ipAddress: null,
      userAgent: null,
      createdAt: '2026-10-04T10:30:00.000Z',
      user: null,
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);
    expect(screen.getByText('Hệ thống (System)')).toBeDefined();
    expect(screen.getAllByText('Không có').length).toBeGreaterThanOrEqual(2);
  });

  it('renders "Không có dữ liệu thay đổi để so sánh" when both oldData and newData are null', () => {
    const mockLog: AuditLogEntry = {
      id: 'log-empty',
      action: 'LOGIN',
      entity: 'Auth',
      oldData: null,
      newData: null,
      createdAt: '2026-10-04T10:30:00.000Z',
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);
    expect(screen.getByText('Không có dữ liệu thay đổi để so sánh')).toBeDefined();
  });

  it('renders created diff tag "Dữ liệu được tạo mới" when oldData is null and newData exists', () => {
    const mockLog: AuditLogEntry = {
      id: 'log-created',
      action: 'CREATE',
      entity: 'Order',
      entityId: 'ord-100',
      oldData: null,
      newData: { orderNumber: 'ORD-2026-001', totalAmount: 500000 },
      createdAt: '2026-10-04T10:30:00.000Z',
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);
    expect(screen.getByText('Dữ liệu được tạo mới')).toBeDefined();
    expect(screen.getByText(/ORD-2026-001/)).toBeDefined();
  });

  it('renders deleted diff tag "Dữ liệu đã bị xóa" when only oldData exists', () => {
    const mockLog: AuditLogEntry = {
      id: 'log-deleted',
      action: 'DELETE',
      entity: 'Product',
      entityId: 'prod-007',
      oldData: { name: 'Sản phẩm thử nghiệm', price: 99000 },
      newData: null,
      createdAt: '2026-10-04T10:30:00.000Z',
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);
    expect(screen.getByText('Dữ liệu đã bị xóa')).toBeDefined();
    expect(screen.getByText(/Sản phẩm thử nghiệm/)).toBeDefined();
  });

  it('renders key-by-key comparison cards when both oldData and newData exist', () => {
    const mockLog: AuditLogEntry = {
      id: 'log-updated',
      action: 'UPDATE',
      entity: 'User',
      entityId: 'usr-1',
      oldData: {
        role: 'STAFF',
        phone: '0901234567',
        status: 'ACTIVE',
      },
      newData: {
        role: 'MANAGER',
        phone: '0901234567',
        status: 'LOCKED',
      },
      createdAt: '2026-10-04T10:30:00.000Z',
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);

    // Keys
    expect(screen.getByText('role')).toBeDefined();
    expect(screen.getByText('phone')).toBeDefined();
    expect(screen.getByText('status')).toBeDefined();

    // Changed / Unchanged tags
    const changedTags = screen.getAllByText('Thay đổi');
    expect(changedTags.length).toBe(2); // role and status changed

    const unchangedTags = screen.getAllByText('Không đổi');
    expect(unchangedTags.length).toBe(1); // phone unchanged
  });

  it('switches to Tab 2 "Dữ liệu gốc (JSON)" and displays oldData and newData', async () => {
    const mockLog: AuditLogEntry = {
      id: 'log-json',
      action: 'UPDATE',
      entity: 'Product',
      oldData: { sku: 'SKU-OLD-1' },
      newData: { sku: 'SKU-NEW-2' },
      createdAt: '2026-10-04T10:30:00.000Z',
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);

    // Click JSON tab
    const jsonTab = screen.getByText('Dữ liệu gốc (JSON)');
    fireEvent.click(jsonTab);

    expect(screen.getByText('Dữ liệu trước thay đổi (oldData):')).toBeDefined();
    expect(screen.getByText('Dữ liệu sau thay đổi (newData):')).toBeDefined();
    expect(screen.getByText('Sao chép oldData')).toBeDefined();
    expect(screen.getByText('Sao chép newData')).toBeDefined();
  });

  it('handles copy button click without crashing', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const mockLog: AuditLogEntry = {
      id: 'log-copy',
      action: 'CREATE',
      entity: 'Voucher',
      oldData: null,
      newData: { code: 'SALE50' },
      createdAt: '2026-10-04T10:30:00.000Z',
    };

    render(<AuditLogDetailDrawer open={true} onClose={vi.fn()} log={mockLog} />);

    const copyBtn = screen.getByText('Sao chép JSON');
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(JSON.stringify(mockLog.newData, null, 2));
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  auditLogService,
  getAuditLogs,
  getAuditLogById,
  getAuditLogStats,
  exportAuditLogsToCsv,
} from '../auditLogService';
import { apiClient } from '../apiClient';
import type {
  AuditLogEntry,
  AuditLogFilterParams,
  AuditLogStats,
  PaginatedAuditLogsResponse,
} from '../../types/auditLog';

vi.mock('../apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('auditLogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAuditLogs', () => {
    it('should call GET /audit-logs with query params and return response data', async () => {
      const mockResponse: PaginatedAuditLogsResponse = {
        data: [
          {
            id: 'log-1',
            userId: 'user-1',
            action: 'CREATE',
            entity: 'Product',
            entityId: 'prod-123',
            oldData: null,
            newData: { name: 'iPhone 15' },
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0',
            createdAt: '2026-10-01T10:00:00.000Z',
            user: {
              id: 'user-1',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'User',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const params: AuditLogFilterParams = {
        action: 'CREATE',
        entity: 'Product',
        page: 1,
        limit: 10,
      };

      const result = await auditLogService.getAuditLogs(params);

      expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', { params });
      expect(result).toEqual(mockResponse);
    });

    it('should call GET /audit-logs without params when not provided', async () => {
      const mockResponse: PaginatedAuditLogsResponse = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockResponse });

      const result = await getAuditLogs();

      expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', { params: undefined });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getAuditLogById', () => {
    it('should call GET /audit-logs/:id and return the log entry', async () => {
      const mockLog: AuditLogEntry = {
        id: 'log-123',
        userId: 'user-1',
        action: 'UPDATE',
        entity: 'Order',
        entityId: 'ord-456',
        oldData: { status: 'PENDING' },
        newData: { status: 'PROCESSING' },
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
        createdAt: '2026-10-02T12:00:00.000Z',
        user: {
          id: 'user-1',
          email: 'staff@example.com',
          firstName: 'Staff',
          lastName: 'Member',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockLog });

      const result = await getAuditLogById('log-123');

      expect(apiClient.get).toHaveBeenCalledWith('/audit-logs/log-123');
      expect(result).toEqual(mockLog);
    });
  });

  describe('getAuditLogStats', () => {
    it('should call GET /audit-logs/stats and return stats', async () => {
      const mockStats: AuditLogStats = {
        totalLogs: 1500,
        todayLogs: 42,
        sensitiveOperations: 15,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockStats });

      const result = await getAuditLogStats();

      expect(apiClient.get).toHaveBeenCalledWith('/audit-logs/stats');
      expect(result).toEqual(mockStats);
    });
  });

  describe('exportAuditLogsToCsv', () => {
    it('should fetch up to 1000 logs and trigger CSV download with UTF-8 BOM', async () => {
      const mockLogs: AuditLogEntry[] = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'PAYMENT',
          entity: 'Payment',
          entityId: 'pay-1',
          oldData: null,
          newData: { amount: 500000 },
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla',
          createdAt: '2026-10-03T08:00:00.000Z',
          user: {
            id: 'user-1',
            email: 'buyer@test.com',
            firstName: 'Van A',
            lastName: 'Nguyen',
          },
        },
        {
          id: 'log-2',
          userId: null,
          action: 'DELETE',
          entity: 'Product',
          entityId: 'prod-99',
          oldData: { name: 'Old Phone' },
          newData: null,
          ipAddress: null,
          userAgent: null,
          createdAt: '2026-10-03T09:00:00.000Z',
          user: null,
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          data: mockLogs,
          total: 2,
          page: 1,
          limit: 1000,
          totalPages: 1,
        },
      });

      const clickMock = vi.fn();
      const appendChildMock = vi.fn();
      const removeChildMock = vi.fn();
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');

      const mockAnchor = {
        href: '',
        setAttribute: vi.fn(),
        click: clickMock,
      };

      const originalDocument = (globalThis as any).document;
      const originalURL = (globalThis as any).URL;

      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(mockAnchor),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
      };

      (globalThis as any).URL = {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: vi.fn(),
      };

      try {
        await exportAuditLogsToCsv({ action: 'PAYMENT' });

        expect(apiClient.get).toHaveBeenCalledWith('/audit-logs', {
          params: { action: 'PAYMENT', page: 1, limit: 1000 },
        });
        expect(createObjectURLMock).toHaveBeenCalled();
        expect(appendChildMock).toHaveBeenCalledWith(mockAnchor);
        expect(clickMock).toHaveBeenCalled();
        expect(removeChildMock).toHaveBeenCalledWith(mockAnchor);
        expect(mockAnchor.setAttribute).toHaveBeenCalledWith(
          'download',
          expect.stringMatching(/^audit_logs_\d{4}-\d{2}-\d{2}\.csv$/)
        );
      } finally {
        (globalThis as any).document = originalDocument;
        (globalThis as any).URL = originalURL;
      }
    });
  });
});

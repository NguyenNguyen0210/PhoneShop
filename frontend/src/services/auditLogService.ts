import { apiClient } from './apiClient';
import type {
  AuditLogEntry,
  AuditLogFilterParams,
  AuditLogStats,
  PaginatedAuditLogsResponse,
} from '../types/auditLog';

export const auditLogService = {
  getAuditLogs: async (params?: AuditLogFilterParams): Promise<PaginatedAuditLogsResponse> => {
    const res = await apiClient.get<PaginatedAuditLogsResponse>('/audit-logs', { params });
    return res.data;
  },

  getAuditLogById: async (id: string): Promise<AuditLogEntry> => {
    const res = await apiClient.get<AuditLogEntry>(`/audit-logs/${id}`);
    return res.data;
  },

  getAuditLogStats: async (): Promise<AuditLogStats> => {
    const res = await apiClient.get<AuditLogStats>('/audit-logs/stats');
    return res.data;
  },

  exportAuditLogsToCsv: async (params?: AuditLogFilterParams): Promise<void> => {
    const exportParams = { ...params, page: 1, limit: 1000 };
    const res = await apiClient.get<PaginatedAuditLogsResponse>('/audit-logs', { params: exportParams });
    const logs = res.data?.data || [];

    const headers = ['Thời gian', 'Người thực hiện', 'Email', 'Hành động', 'Thực thể', 'Entity ID', 'Địa chỉ IP'];
    const rows = logs.map((log) => [
      `"${new Date(log.createdAt).toLocaleString('vi-VN')}"`,
      `"${[log.user?.firstName, log.user?.lastName].filter(Boolean).join(' ') || (log.userId ? log.userId : 'Hệ thống')}"`,
      `"${log.user?.email || ''}"`,
      `"${log.action}"`,
      `"${log.entity}"`,
      `"${log.entityId || ''}"`,
      `"${log.ipAddress || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
};

export const getAuditLogs = auditLogService.getAuditLogs;
export const getAuditLogById = auditLogService.getAuditLogById;
export const getAuditLogStats = auditLogService.getAuditLogStats;
export const exportAuditLogsToCsv = auditLogService.exportAuditLogsToCsv;

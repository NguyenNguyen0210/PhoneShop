export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PAYMENT'
  | 'REFUND'
  | 'CANCEL_ORDER'
  | 'UPDATE_STOCK'
  | 'CHANGE_ROLE'
  | 'OTHER';

export interface AuditLogUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  oldData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: AuditLogUser | null;
}

export interface AuditLogFilterParams {
  action?: AuditAction;
  entity?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  todayLogs: number;
  sensitiveOperations: number;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

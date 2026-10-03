export type UserRoleName = 'ADMIN' | 'MANAGER' | 'STAFF' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';

export interface ManagedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  status: UserStatus;
  roles: { role: { id?: string; name: UserRoleName } }[];
  createdAt: string;
  updatedAt?: string;
}

export interface UserFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface UserListResponse {
  data: ManagedUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roles?: UserRoleName[];
  status?: UserStatus;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: UserStatus;
  roles?: UserRoleName[];
  password?: string;
}

export interface UserAuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  oldData?: any;
  newData?: any;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

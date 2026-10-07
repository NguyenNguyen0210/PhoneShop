import type { CustomerSummary } from './customer';

export type TicketCategory =
  | 'ORDER_INQUIRY'
  | 'PRODUCT_INQUIRY'
  | 'WARRANTY_SUPPORT'
  | 'RETURN_REFUND'
  | 'PAYMENT_INSTALLMENT'
  | 'ACCOUNT_GENERAL';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  sender?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    roles?: Array<{ role: { name: string } }>;
  };
  message: string;
  attachments: string[];
  isInternalNote: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  userId: string;
  user?: CustomerSummary;
  orderId?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount?: number;
    status?: string;
  } | null;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
  messages?: TicketMessage[];
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
  lastRepliedAt?: string | null;
  resolvedAt?: string | null;
}

export interface TicketAnalytics {
  open: number;
  inProgress: number;
  resolved: number;
  urgent: number;
  total: number;
}

import { apiClient } from './apiClient';
import type { Ticket, TicketMessage, TicketCategory, TicketPriority, TicketStatus } from '../types/ticket';

export const ticketService = {
  // Storefront endpoints
  createTicket: async (data: {
    title: string;
    category: TicketCategory;
    priority?: TicketPriority;
    orderId?: string;
    message: string;
    attachments?: string[];
  }) => {
    const res = await apiClient.post<Ticket>('/tickets', data);
    return res.data;
  },

  getMyTickets: async (params?: { page?: number; limit?: number; status?: TicketStatus; category?: TicketCategory }) => {
    const res = await apiClient.get<{
      data: Ticket[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/tickets/my', { params });
    return res.data;
  },

  getTicketDetail: async (id: string) => {
    const res = await apiClient.get<Ticket>(`/tickets/${id}`);
    return res.data;
  },

  replyTicket: async (ticketId: string, data: { message: string; attachments?: string[] }) => {
    const res = await apiClient.post<TicketMessage>(`/tickets/${ticketId}/messages`, data);
    return res.data;
  },

  closeTicket: async (ticketId: string) => {
    const res = await apiClient.patch<Ticket>(`/tickets/${ticketId}/close`);
    return res.data;
  },

  // Staff/Admin endpoints
  getAdminTickets: async (params?: {
    page?: number;
    limit?: number;
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    assignedToId?: string;
    search?: string;
  }) => {
    const res = await apiClient.get<{
      data: Ticket[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/admin/tickets', { params });
    return res.data;
  },

  getAdminTicketDetail: async (id: string) => {
    const res = await apiClient.get<Ticket>(`/admin/tickets/${id}`);
    return res.data;
  },

  addAdminReply: async (ticketId: string, data: { message: string; attachments?: string[]; isInternalNote?: boolean }) => {
    const res = await apiClient.post<TicketMessage>(`/admin/tickets/${ticketId}/messages`, data);
    return res.data;
  },

  updateTicketStatus: async (ticketId: string, status: TicketStatus) => {
    const res = await apiClient.patch<Ticket>(`/admin/tickets/${ticketId}/status`, { status });
    return res.data;
  },

  assignTicket: async (ticketId: string, assignedToId: string) => {
    const res = await apiClient.patch<Ticket>(`/admin/tickets/${ticketId}/assign`, { assignedToId });
    return res.data;
  },
};

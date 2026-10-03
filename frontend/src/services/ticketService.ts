import { apiClient } from './apiClient';
import type { TicketCategory, TicketPriority, TicketStatus } from '../types/ticket';

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
    const res = await apiClient.post('/tickets', data);
    return res.data?.data ?? res.data;
  },

  getMyTickets: async (params?: { page?: number; limit?: number; status?: TicketStatus; category?: TicketCategory }) => {
    const res = await apiClient.get('/tickets/my', { params });
    return res.data?.data ?? res.data;
  },

  getTicketDetail: async (id: string) => {
    const res = await apiClient.get(`/tickets/${id}`);
    return res.data?.data ?? res.data;
  },

  replyTicket: async (ticketId: string, data: { message: string; attachments?: string[] }) => {
    const res = await apiClient.post(`/tickets/${ticketId}/messages`, data);
    return res.data?.data ?? res.data;
  },

  closeTicket: async (ticketId: string) => {
    const res = await apiClient.patch(`/tickets/${ticketId}/close`);
    return res.data?.data ?? res.data;
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
    const res = await apiClient.get('/admin/tickets', { params });
    return res.data?.data ?? res.data;
  },

  getAdminTicketDetail: async (id: string) => {
    const res = await apiClient.get(`/admin/tickets/${id}`);
    return res.data?.data ?? res.data;
  },

  addAdminReply: async (ticketId: string, data: { message: string; attachments?: string[]; isInternalNote?: boolean }) => {
    const res = await apiClient.post(`/admin/tickets/${ticketId}/messages`, data);
    return res.data?.data ?? res.data;
  },

  updateTicketStatus: async (ticketId: string, status: TicketStatus) => {
    const res = await apiClient.patch(`/admin/tickets/${ticketId}/status`, { status });
    return res.data?.data ?? res.data;
  },

  assignTicket: async (ticketId: string, assignedToId: string) => {
    const res = await apiClient.patch(`/admin/tickets/${ticketId}/assign`, { assignedToId });
    return res.data?.data ?? res.data;
  },
};

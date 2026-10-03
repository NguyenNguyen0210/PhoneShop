export interface Customer360Metrics {
  totalSpent: number;
  totalOrders: number;
  completedOrders: number;
  processingOrders: number;
  cancelledOrders: number;
  totalTickets: number;
  openTickets: number;
  activeWarranties: number;
  totalInstallments: number;
  approvedInstallments: number;
}

export interface Customer360Response {
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    status: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
  metrics: Customer360Metrics;
  addresses: any[];
  recentOrders: any[];
  warranties: any[];
  installments: any[];
  tickets: any[];
}

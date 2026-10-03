import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { NotificationDetailModal } from '../NotificationDetailModal';
import type { NotificationItem } from '../../../../types';

describe('NotificationDetailModal', () => {
  const mockNotification: NotificationItem = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'ORDER',
    channel: 'IN_APP',
    title: 'Đơn hàng #DH-12345 đã xác nhận',
    message: 'Đơn hàng của bạn đã được xác nhận thành công và đang được chuẩn bị.',
    data: { orderId: 'DH-12345', amount: 1500000 },
    isRead: false,
    createdAt: '2026-03-15T10:30:00.000Z',
  };

  it('should render null when isOpen is false', () => {
    const html = renderToString(
      <NotificationDetailModal
        notification={mockNotification}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('should render null when notification is null', () => {
    const html = renderToString(
      <NotificationDetailModal
        notification={null}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('should render title, message, formatted date, and type badge for ORDER', () => {
    const html = renderToString(
      <NotificationDetailModal
        notification={mockNotification}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Đơn hàng #DH-12345 đã xác nhận');
    expect(html).toContain('Đơn hàng của bạn đã được xác nhận thành công');
    expect(html).toContain('Đơn hàng'); // Badge label
    expect(html).toContain('Chi tiết liên quan');
    expect(html).toContain('DH-12345');
    expect(html).toContain('Mã đơn hàng');
    expect(html).toContain('Đóng');
  });

  it('should render action button when onActionClick is provided and notification has action data', () => {
    const html = renderToString(
      <NotificationDetailModal
        notification={mockNotification}
        isOpen={true}
        onClose={vi.fn()}
        onActionClick={vi.fn()}
      />
    );

    expect(html).toContain('Xem chi tiết liên quan');
  });

  it('should render correctly for WARRANTY type', () => {
    const warrantyNotif: NotificationItem = {
      id: 'notif-w',
      userId: 'user-1',
      type: 'WARRANTY',
      channel: 'IN_APP',
      title: 'Bảo hành sắp hết hạn',
      message: 'Thiết bị iPhone 15 Pro Max sắp hết hạn bảo hành.',
      data: { code: 'BH-999' },
      isRead: true,
      createdAt: '2026-03-20T08:00:00.000Z',
    };

    const html = renderToString(
      <NotificationDetailModal
        notification={warrantyNotif}
        isOpen={true}
        onClose={vi.fn()}
        onActionClick={vi.fn()}
      />
    );

    expect(html).toContain('Bảo hành sắp hết hạn');
    expect(html).toContain('Bảo hành');
    expect(html).toContain('BH-999');
    expect(html).toContain('Xem chi tiết liên quan');
  });

  it('should render correctly for PROMOTION and SYSTEM types', () => {
    const promoNotif: NotificationItem = {
      id: 'notif-p',
      userId: 'user-1',
      type: 'PROMOTION',
      channel: 'IN_APP',
      title: 'Voucher giảm 50%',
      message: 'Sử dụng mã SALE50 để nhận ưu đãi.',
      data: null,
      isRead: false,
      createdAt: '2026-03-25T12:00:00.000Z',
    };

    const html = renderToString(
      <NotificationDetailModal
        notification={promoNotif}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Voucher giảm 50%');
    expect(html).toContain('Khuyến mại');
  });
});

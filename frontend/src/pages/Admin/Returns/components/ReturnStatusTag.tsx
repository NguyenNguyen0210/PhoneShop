import React from 'react';
import { Tag } from 'antd';
import type { ReturnStatus } from '../../../../types';

interface ReturnStatusTagProps {
  status: ReturnStatus;
}

export const ReturnStatusTag: React.FC<ReturnStatusTagProps> = ({ status }) => {
  switch (status) {
    case 'REQUESTED':
      return <Tag color="warning">Chờ tiếp nhận</Tag>;
    case 'APPROVED':
      return <Tag color="processing">Chờ gửi máy</Tag>;
    case 'SHIPPING':
      return <Tag color="cyan">Đang gửi về kho</Tag>;
    case 'RECEIVED':
      return <Tag color="geekblue">Đã nhận tại kho</Tag>;
    case 'INSPECTING':
      return <Tag color="orange">Đang kiểm định</Tag>;
    case 'COMPLETED':
      return <Tag color="success">Đã hoàn tất</Tag>;
    case 'REJECTED':
      return <Tag color="error">Đã từ chối</Tag>;
    case 'CANCELLED':
      return <Tag color="default">Khách đã hủy</Tag>;
    default:
      return <Tag>{status}</Tag>;
  }
};

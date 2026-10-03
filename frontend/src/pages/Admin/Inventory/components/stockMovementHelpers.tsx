import { Tag } from 'antd';
import type { StockMovementType } from '../../../../types';

export const getMovementTypeTag = (type: StockMovementType | string) => {
  switch (type) {
    case 'IMPORT_MANUAL':
      return <Tag color="green">Nhập thủ công</Tag>;
    case 'EXPORT_MANUAL':
      return <Tag color="orange">Xuất thủ công</Tag>;
    case 'EXPORT_ORDER':
      return <Tag color="volcano">Xuất đơn hàng</Tag>;
    case 'IMPORT_RETURN':
      return <Tag color="purple">Nhập đổi trả</Tag>;
    case 'INITIAL_SETUP':
      return <Tag color="default">Khởi tạo ban đầu</Tag>;
    default:
      return <Tag>{type}</Tag>;
  }
};

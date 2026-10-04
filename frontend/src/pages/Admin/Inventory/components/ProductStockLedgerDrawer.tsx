import React, { useState, useEffect, useCallback } from 'react';
import {
  Drawer,
  Table,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Empty,
  Tooltip,
  Button,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryService } from '../../../../services/inventoryService';
import type {
  InventoryRecord,
  StockMovement,
  StockMovementType,
} from '../../../../types';
import { getMovementTypeTag } from './stockMovementHelpers';

const { Text } = Typography;

export interface ProductStockLedgerDrawerProps {
  open: boolean;
  item: InventoryRecord | null;
  onClose: () => void;
}

export const ProductStockLedgerDrawer: React.FC<ProductStockLedgerDrawerProps> = ({
  open,
  item,
  onClose,
}) => {
  const [items, setItems] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const variantId = item?.variantId || item?.variant?.id;

  const fetchLedger = useCallback(
    async (currentPage: number = page, currentLimit: number = limit) => {
      if (!variantId) return;
      setLoading(true);
      try {
        const res = await inventoryService.getVariantLedger(variantId, {
          page: currentPage,
          limit: currentLimit,
        });
        setItems(res?.items || []);
        setTotal(res?.pagination?.total || 0);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể tải lịch sử thẻ kho của biến thể';
        message.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [variantId, page, limit]
  );

  useEffect(() => {
    if (open && variantId) {
      setPage(1);
      void fetchLedger(1, limit);
    } else {
      setItems([]);
      setTotal(0);
    }
  }, [open, variantId, limit, fetchLedger]);

  const handleRefresh = () => {
    void fetchLedger(page, limit);
  };

  const columns: ColumnsType<StockMovement> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 135,
      render: (date: string) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
          {dayjs(date).format('DD/MM/YYYY HH:mm')}
        </span>
      ),
    },
    {
      title: 'Loại biến động',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: StockMovementType) => getMovementTypeTag(type),
    },
    {
      title: 'Mã chứng từ',
      dataIndex: 'referenceId',
      key: 'referenceId',
      width: 120,
      render: (refId: string) =>
        refId ? (
          <Text code style={{ fontSize: 11 }}>
            {refId}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Biến động',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 95,
      render: (qty: number) => {
        const isPositive = qty > 0;
        return (
          <Text
            strong
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontSize: 13,
              color: isPositive ? '#389e0d' : '#cf1322',
            }}
          >
            {isPositive ? `+${qty}` : qty}
          </Text>
        );
      },
    },
    {
      title: 'Tồn trước',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      align: 'right',
      width: 85,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{val ?? 0}</span>
      ),
    },
    {
      title: 'Tồn sau',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      align: 'right',
      width: 85,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {val ?? 0}
        </span>
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      width: 115,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Number(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 125,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {Number(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Người thực hiện',
      key: 'performer',
      width: 130,
      render: (_, record) => (
        <Text style={{ fontSize: 12 }}>
          {record.performer?.fullName ||
            record.performer?.email ||
            record.performedBy ||
            'Hệ thống'}
        </Text>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      width: 140,
      render: (note: string) =>
        note ? (
          <Tooltip title={note}>
            <Text style={{ fontSize: 12 }}>{note}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  if (!item) return null;

  const costPrice =
    (item.variant as any)?.costPrice ?? item.variant?.price ?? 0;

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined style={{ color: '#1677ff' }} />
          <span>Thẻ kho sản phẩm: {item.variant.product.name}</span>
          <Tag color="geekblue">{item.variant.sku}</Tag>
        </Space>
      }
      placement="right"
      size={800}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
          Làm mới
        </Button>
      }
    >
      {/* Header Summary Section */}
      <div
        style={{
          marginBottom: 20,
          padding: '14px 18px',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
        }}
      >
        <Row gutter={[16, 12]}>
          <Col span={6}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Tồn vật lý</Text>}
              value={item.quantity}
              styles={{ content: { fontSize: 18, fontWeight: 600 } }}
              suffix={<span style={{ fontSize: 12 }}>máy</span>}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Tồn khả dụng</Text>}
              value={item.availableQty}
              styles={{ content: { fontSize: 18, fontWeight: 600, color: '#389e0d' } }}
              suffix={<span style={{ fontSize: 12 }}>máy</span>}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Tạm giữ</Text>}
              value={item.reservedQty}
              styles={{
                content: {
                  fontSize: 18,
                  fontWeight: 600,
                  color: item.reservedQty > 0 ? '#722ed1' : '#8c8c8c',
                },
              }}
              suffix={<span style={{ fontSize: 12 }}>máy</span>}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>Đơn giá vốn</Text>}
              value={costPrice}
              formatter={(val) => `${Number(val).toLocaleString('vi-VN')} ₫`}
              styles={{ content: { fontSize: 17, fontWeight: 600 } }}
            />
          </Col>
        </Row>
        <div style={{ marginTop: 10, fontSize: 12, color: '#595959' }}>
          Phân loại: <Text strong>{item.variant.color}</Text> | <Text strong>{item.variant.storage}</Text>
          {item.variant.price && (
            <span style={{ marginLeft: 16 }}>
              Giá bán niêm yết: <Text strong>{Number(item.variant.price).toLocaleString('vi-VN')} ₫</Text>
            </span>
          )}
        </div>
      </div>

      {/* Movement Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        scroll={{ x: 950 }}
        style={{ fontVariantNumeric: 'tabular-nums' }}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (totalCount) => `Tổng ${totalCount} lượt biến động`,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
            void fetchLedger(p, l);
          },
        }}
        locale={{
          emptyText: (
            <Empty description="Chưa có bản ghi biến động kho nào cho biến thể này" />
          ),
        }}
      />
    </Drawer>
  );
};

export default ProductStockLedgerDrawer;

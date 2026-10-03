import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Typography,
  Button,
  Space,
  Table,
  Input,
  Select,
  DatePicker,
  Empty,
  Alert,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  SwapOutlined,
  HistoryOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { inventoryService } from '../../../../services/inventoryService';
import type {
  StockMovement,
  StockLedgerSummary,
  StockMovementType,
} from '../../../../types';
import { getMovementTypeTag } from './stockMovementHelpers';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const rangePresets: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: 'Hôm nay', value: [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: '7 ngày qua', value: [dayjs().subtract(6, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: '30 ngày qua', value: [dayjs().subtract(29, 'day').startOf('day'), dayjs().endOf('day')] },
  { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
];

const movementTypeOptions = [
  { value: '', label: 'Tất cả loại biến động' },
  { value: 'IMPORT_MANUAL', label: 'Nhập thủ công' },
  { value: 'EXPORT_ORDER', label: 'Xuất đơn hàng' },
  { value: 'EXPORT_MANUAL', label: 'Xuất thủ công' },
  { value: 'IMPORT_RETURN', label: 'Nhập đổi trả' },
  { value: 'INITIAL_SETUP', label: 'Khởi tạo tồn' },
];

export const InventoryLedgerTab: React.FC = () => {
  const [items, setItems] = useState<StockMovement[]>([]);
  const [summary, setSummary] = useState<StockLedgerSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  // Filters
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [movementType, setMovementType] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');

  const fetchLedger = useCallback(
    async (
      currentPage: number = page,
      currentLimit: number = limit,
      currentRange: [Dayjs, Dayjs] | null = dateRange,
      currentType: string = movementType,
      currentSearch: string = search
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await inventoryService.getLedger({
          page: currentPage,
          limit: currentLimit,
          startDate: currentRange?.[0]?.format('YYYY-MM-DD'),
          endDate: currentRange?.[1]?.format('YYYY-MM-DD'),
          type: currentType || undefined,
          search: currentSearch.trim() || undefined,
        });
        setItems(res?.items || []);
        setSummary(res?.summary || null);
        setTotal(res?.pagination?.total || 0);
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Không thể tải dữ liệu sổ kho từ máy chủ';
        setError(msg);
        message.error(msg);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, dateRange, movementType, search]
  );

  useEffect(() => {
    void fetchLedger(page, limit, dateRange, movementType, search);
  }, [fetchLedger, page, limit, dateRange, movementType, search]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const handleTypeChange = (value: string) => {
    setPage(1);
    setMovementType(value);
  };

  const handleDateRangeChange = (dates: any) => {
    setPage(1);
    setDateRange(dates as [Dayjs, Dayjs] | null);
  };

  const handleRefresh = () => {
    void fetchLedger(page, limit, dateRange, movementType, search);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await inventoryService.exportLedgerCsv({
        startDate: dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: dateRange?.[1]?.format('YYYY-MM-DD'),
        type: movementType || undefined,
        search: search.trim() || undefined,
      });

      if (typeof window !== 'undefined' && typeof window.URL?.createObjectURL === 'function') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `so-kho-${dayjs().format('YYYYMMDD-HHmmss')}.csv`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      message.success('Xuất file CSV sổ kho thành công!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi xuất file CSV';
      message.error(msg);
    } finally {
      setExporting(false);
    }
  };

  const columns: ColumnsType<StockMovement> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (date: string) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>
          {dayjs(date).format('DD/MM/YYYY HH:mm')}
        </span>
      ),
    },
    {
      title: 'Loại biến động',
      dataIndex: 'type',
      key: 'type',
      width: 135,
      render: (type: StockMovementType) => getMovementTypeTag(type),
    },
    {
      title: 'Mã chứng từ',
      dataIndex: 'referenceId',
      key: 'referenceId',
      width: 130,
      render: (refId: string) =>
        refId ? (
          <Text code style={{ fontSize: 12 }}>
            {refId}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Sản phẩm & SKU',
      key: 'product',
      minWidth: 220,
      render: (_, record) => (
        <Space align="start" size="small">
          {record.variant?.product?.thumbnail ? (
            <img
              src={record.variant.product.thumbnail}
              alt={record.variant.product.name}
              style={{
                width: 40,
                height: 40,
                objectFit: 'cover',
                borderRadius: 4,
                border: '1px solid #f0f0f0',
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                background: '#f5f5f5',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              📦
            </div>
          )}
          <div>
            <Text strong style={{ fontSize: 13, display: 'block' }}>
              {record.variant?.product?.name || 'Sản phẩm không xác định'}
            </Text>
            <Space size={4} wrap>
              {record.variant?.sku && (
                <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
                  {record.variant.sku}
                </Tag>
              )}
              {record.variant?.color && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.variant.color}
                </Text>
              )}
              {record.variant?.storage && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {record.variant.storage}
                </Text>
              )}
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: 'Biến động',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right',
      width: 105,
      render: (qty: number) => {
        const isPositive = qty > 0;
        return (
          <Text
            strong
            style={{
              fontVariantNumeric: 'tabular-nums',
              fontSize: 14,
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
      width: 90,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{val ?? 0}</span>
      ),
    },
    {
      title: 'Tồn sau',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      align: 'right',
      width: 90,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {val ?? 0}
        </span>
      ),
    },
    {
      title: 'Đơn giá (VNĐ)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right',
      width: 125,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Number(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Thành tiền (VNĐ)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right',
      width: 135,
      render: (val: number) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {Number(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Người thực hiện',
      key: 'performer',
      width: 140,
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
      width: 160,
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

  return (
    <div>
      {/* 4 Summary Cards (KPI metrics) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Metric 1: Inflow */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={loading}
            style={{
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderLeft: '4px solid #52c41a',
            }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Tổng tiền hàng Nhập</Text>}
              value={summary?.totalInAmount ?? 0}
              formatter={(val) => `${Number(val).toLocaleString('vi-VN')} ₫`}
              styles={{ content: { color: '#389e0d', fontWeight: 600, fontSize: 19 } }}
              prefix={<ArrowDownOutlined style={{ fontSize: 16 }} />}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tổng số lượng:</Text>
              <Tag color="green" style={{ fontWeight: 600 }}>
                +{summary?.totalInQuantity ?? 0} máy
              </Tag>
            </div>
          </Card>
        </Col>

        {/* Metric 2: Outflow */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={loading}
            style={{
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderLeft: '4px solid #ff4d4f',
            }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Tổng tiền hàng Xuất</Text>}
              value={summary?.totalOutAmount ?? 0}
              formatter={(val) => `${Number(val).toLocaleString('vi-VN')} ₫`}
              styles={{ content: { color: '#cf1322', fontWeight: 600, fontSize: 19 } }}
              prefix={<ArrowUpOutlined style={{ fontSize: 16 }} />}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tổng số lượng:</Text>
              <Tag color="volcano" style={{ fontWeight: 600 }}>
                -{summary?.totalOutQuantity ?? 0} máy
              </Tag>
            </div>
          </Card>
        </Col>

        {/* Metric 3: Net Cash Movement */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={loading}
            style={{
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderLeft: '4px solid #1677ff',
            }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Dòng tiền Ròng</Text>}
              value={summary?.netAmount ?? 0}
              formatter={(val) => {
                const num = Number(val);
                return `${num > 0 ? '+' : ''}${num.toLocaleString('vi-VN')} ₫`;
              }}
              styles={{ content: { color: '#1677ff', fontWeight: 600, fontSize: 19 } }}
              prefix={<SwapOutlined style={{ fontSize: 16 }} />}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Chênh lệch:</Text>
              <Tag color="blue" style={{ fontWeight: 600 }}>
                {(summary?.netAmount ?? 0) >= 0 ? 'Thặng dư (+)' : 'Thâm hụt (-)'}
              </Tag>
            </div>
          </Card>
        </Col>

        {/* Metric 4: Total Transactions */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            loading={loading}
            style={{
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              borderLeft: '4px solid #722ed1',
            }}
          >
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 13 }}>Tổng số lượt biến động</Text>}
              value={summary?.totalTransactions ?? 0}
              formatter={(val) => Number(val).toLocaleString('vi-VN')}
              styles={{ content: { color: '#722ed1', fontWeight: 600, fontSize: 19 } }}
              prefix={<HistoryOutlined style={{ fontSize: 16 }} />}
            />
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Tổng lượt ghi sổ:</Text>
              <Tag color="purple" style={{ fontWeight: 600 }}>
                {summary?.totalTransactions ?? 0} giao dịch
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Error Alert with Retry button */}
      {error && (
        <Alert
          type="error"
          showIcon
          title="Lỗi tải dữ liệu sổ kho"
          description={error}
          action={
            <Button size="small" danger onClick={handleRefresh}>
              Thử lại
            </Button>
          }
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <Space wrap size="middle">
          {/* DateRangePicker with dayjs presets */}
          <RangePicker
            presets={rangePresets}
            format="DD/MM/YYYY"
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder={['Từ ngày', 'Đến ngày']}
            style={{ width: 260 }}
            allowClear
          />

          {/* Select dropdown for movement type */}
          <Select
            aria-label="movement-type-select"
            value={movementType}
            onChange={handleTypeChange}
            options={movementTypeOptions}
            style={{ width: 180 }}
            placeholder="Loại biến động"
          />

          {/* Search input for SKU or product name */}
          <Input.Search
            placeholder="Tìm theo SKU hoặc tên..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onSearch={handleSearch}
            onClear={() => handleSearch('')}
            allowClear
            style={{ width: 240 }}
          />
        </Space>

        <Space wrap size="small">
          {/* CSV Export Button */}
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportCsv}
            loading={exporting}
          >
            Xuất file CSV
          </Button>

          {/* Refresh Button */}
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {/* Ledger Table */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        scroll={{ x: 1200 }}
        style={{ fontVariantNumeric: 'tabular-nums' }}
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (totalCount) => `Tổng ${totalCount} bản ghi`,
          onChange: (p, l) => {
            setPage(p);
            setLimit(l);
          },
        }}
        locale={{
          emptyText: (
            <Empty
              description="Không tìm thấy bản ghi biến động kho nào trong khoảng thời gian này"
            />
          ),
        }}
      />
    </div>
  );
};

export default InventoryLedgerTab;

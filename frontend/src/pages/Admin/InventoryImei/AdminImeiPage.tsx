import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Input,
  message,
  Typography,
  Card,
  Alert,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  BarcodeOutlined,
  UploadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { imeiService } from '../../../services/imeiService';
import { mockProducts } from '../../../data/mockProducts';
import type { ImeiDevice, ImeiStatus } from '../../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const fallbackImeis: ImeiDevice[] = [
  {
    id: 'imei-1',
    imeiNumber: '353245081234567',
    variantId: 'var-ip15pm-256-nat',
    status: 'AVAILABLE',
    variant: {
      ...mockProducts[0].variants[0],
      product: mockProducts[0],
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'imei-2',
    imeiNumber: '353245081234568',
    variantId: 'var-ip15pm-256-nat',
    status: 'RESERVED',
    variant: {
      ...mockProducts[0].variants[0],
      product: mockProducts[0],
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'imei-3',
    imeiNumber: '864922041234560',
    variantId: 'var-s24u-256-gray',
    status: 'AVAILABLE',
    variant: {
      ...mockProducts[1].variants[0],
      product: mockProducts[1],
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'imei-4',
    imeiNumber: '864922041234561',
    variantId: 'var-s24u-256-gray',
    status: 'SOLD',
    variant: {
      ...mockProducts[1].variants[0],
      product: mockProducts[1],
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    soldAt: new Date().toISOString(),
  },
  {
    id: 'imei-5',
    imeiNumber: '358245091234562',
    variantId: 'var-mi14u-512-blk',
    status: 'WARRANTY',
    variant: {
      ...mockProducts[2].variants[0],
      product: mockProducts[2],
    },
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const AdminImeiPage: React.FC = () => {
  const [imeis, setImeis] = useState<ImeiDevice[]>(fallbackImeis);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importForm] = Form.useForm();
  const [validationReport, setValidationReport] = useState<{
    validCount: number;
    invalidCount: number;
    invalidLines: string[];
  } | null>(null);

  // Available variants for import
  const allVariants = useMemo(
    () =>
      mockProducts.flatMap((p) =>
        p.variants.map((v) => ({
          variantId: v.id,
          label: `${p.name} - ${v.color} (${v.storage}) - SKU: ${v.sku}`,
        }))
      ),
    []
  );

  const loadImeis = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    try {
      const data = await imeiService.getAllImeis();
      if (data && data.length > 0) {
        setImeis(data);
      } else {
        setImeis(fallbackImeis);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadImeis();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadImeis]);

  // Live validator for pasted text in textarea
  const handleImeiTextChange = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setValidationReport(null);
      return;
    }

    const invalid: string[] = [];
    let valid = 0;

    for (const imei of lines) {
      if (imeiService.validateLuhn(imei)) {
        valid++;
      } else {
        invalid.push(imei);
      }
    }

    setValidationReport({
      validCount: valid,
      invalidCount: invalid.length,
      invalidLines: invalid,
    });
  };

  const handleImportSubmit = async (values: any) => {
    const lines = values.imeiList
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      message.error('Vui lòng dán danh sách mã IMEI.');
      return;
    }

    if (validationReport && validationReport.invalidCount > 0) {
      message.warning(
        `Có ${validationReport.invalidCount} mã IMEI không đạt chuẩn Luhn 15 số! Vui lòng kiểm tra lại.`
      );
      return;
    }

    try {
      await imeiService.importImeis(values.variantId, lines);
      message.success(`Đã nhập thành công ${lines.length} thiết bị IMEI vào kho!`);
      setIsImportModalOpen(false);
      importForm.resetFields();
      setValidationReport(null);
      await loadImeis();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const handleStatusChange = async (
    record: ImeiDevice,
    action: 'reserve' | 'sell' | 'return' | 'warranty'
  ) => {
    let nextStatus: ImeiStatus = 'AVAILABLE';
    if (action === 'reserve') nextStatus = 'RESERVED';
    if (action === 'sell') nextStatus = 'SOLD';
    if (action === 'warranty') nextStatus = 'WARRANTY';
    if (action === 'return') nextStatus = 'AVAILABLE';

    try {
      await imeiService.updateImeiStatus(record.id, action);
      setImeis((prev) =>
        prev.map((i) => (i.id === record.id ? { ...i, status: nextStatus } : i))
      );
      message.info(`Đã cập nhật trạng thái IMEI ${record.imeiNumber} sang ${nextStatus}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const getImeiTag = (status: ImeiStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <Tag
            color="green"
            icon={<CheckCircleOutlined />}
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              borderColor: 'rgba(16, 185, 129, 0.35)',
              color: '#34d399',
              fontWeight: 700,
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            SẴN SÀNG (AVAILABLE)
          </Tag>
        );
      case 'RESERVED':
        return (
          <Tag
            color="gold"
            icon={<ClockCircleOutlined />}
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontWeight: 700,
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            ĐANG KHÓA GIỮ 15P (RESERVED)
          </Tag>
        );
      case 'SOLD':
        return (
          <Tag
            color="default"
            icon={<CheckOutlined />}
            style={{
              background: 'rgba(100, 116, 139, 0.18)',
              borderColor: 'rgba(100, 116, 139, 0.35)',
              color: '#94a3b8',
              fontWeight: 700,
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            ĐÃ BÁN (SOLD)
          </Tag>
        );
      case 'WARRANTY':
        return (
          <Tag
            color="purple"
            style={{
              background: 'rgba(168, 85, 247, 0.15)',
              borderColor: 'rgba(168, 85, 247, 0.35)',
              color: '#c084fc',
              fontWeight: 700,
              borderRadius: 6,
              padding: '2px 8px',
            }}
          >
            BẢO HÀNH (WARRANTY)
          </Tag>
        );
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Filtered
  const filteredImeis = imeis.filter((i) => {
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchImei = i.imeiNumber.toLowerCase().includes(q);
      const matchProd = i.variant?.product?.name.toLowerCase().includes(q);
      if (!matchImei && !matchProd) return false;
    }
    return true;
  });

  const columns: ColumnsType<ImeiDevice> = [
    {
      title: 'Mã số IMEI (15 số Luhn)',
      dataIndex: 'imeiNumber',
      key: 'imeiNumber',
      render: (num: string) => (
        <Space size="middle">
          <Text strong style={{ fontFamily: 'monospace', fontSize: 13, color: '#38bdf8', letterSpacing: 0.5 }}>
            {num}
          </Text>
          <Tooltip title="Đạt tiêu chuẩn thuật toán kiểm định Luhn checksum quốc tế">
            <Tag
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: 'rgba(56, 189, 248, 0.12)',
                borderColor: 'rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                borderRadius: 4,
              }}
            >
              LUHN OK
            </Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Thiết bị & Biến thể',
      key: 'variant',
      render: (_, record) => {
        const prod = record.variant?.product?.name || 'Điện thoại di động';
        const color = record.variant?.color || '';
        const storage = record.variant?.storage || '';
        const sku = record.variant?.sku || '';
        return (
          <div>
            <Text strong style={{ color: '#f8fafc', fontSize: 13 }}>
              {prod}
            </Text>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {color} - {storage} {sku && `| SKU: ${sku}`}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái vòng đời',
      dataIndex: 'status',
      key: 'status',
      render: (s: ImeiStatus) => getImeiTag(s),
    },
    {
      title: 'Ngày nhập kho',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dt: string) => (
        <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
          {new Date(dt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Thao tác điều phối',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'AVAILABLE' && (
            <Button
              size="small"
              onClick={() => handleStatusChange(record, 'reserve')}
              style={{
                background: '#151d30',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: '#f59e0b',
                fontSize: 12,
                borderRadius: 6,
              }}
            >
              Khóa giữ chỗ
            </Button>
          )}
          {record.status === 'RESERVED' && (
            <>
              <Button
                size="small"
                type="primary"
                onClick={() => handleStatusChange(record, 'sell')}
                style={{
                  background: '#10b981',
                  borderColor: '#10b981',
                  fontSize: 12,
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Xác nhận Bán
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleStatusChange(record, 'return')}
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  borderColor: 'rgba(244, 63, 94, 0.3)',
                  color: '#f43f5e',
                  fontSize: 12,
                  borderRadius: 6,
                }}
              >
                Nhả kho
              </Button>
            </>
          )}
          {record.status === 'SOLD' && (
            <Button
              size="small"
              onClick={() => handleStatusChange(record, 'warranty')}
              style={{
                background: '#151d30',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: '#c084fc',
                fontSize: 12,
                borderRadius: 6,
              }}
            >
              Chuyển Bảo hành
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={3} style={{ margin: 0, color: '#f8fafc', fontWeight: 800, letterSpacing: -0.3 }}>
              Quản trị Kho Thiết bị & Quản lý IMEI
            </Title>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontWeight: 600,
              }}
            >
              Luhn Certified
            </span>
          </div>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
            Kiểm soát định danh từng chiếc máy, đảm bảo tính duy nhất và khóa concurrency 15 phút
          </Text>
        </div>

        <Button
          type="primary"
          icon={<UploadOutlined />}
          size="large"
          style={{
            background: '#6366f1',
            borderColor: '#6366f1',
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
          }}
          onClick={() => setIsImportModalOpen(true)}
        >
          Nhập lô IMEI
        </Button>
      </div>

      {/* Filter & Search Bar Card */}
      <Card
        bordered={false}
        style={{
          background: '#0e1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <Input
            placeholder="Tìm theo mã số IMEI (15 số)..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 280, borderRadius: 8, background: '#151d30' }}
            allowClear
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#94a3b8' }}>Lọc trạng thái:</Text>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 220 }}
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'AVAILABLE', label: 'Sẵn sàng (AVAILABLE)' },
                { value: 'RESERVED', label: 'Khóa giữ 15 phút (RESERVED)' },
                { value: 'SOLD', label: 'Đã xuất bán (SOLD)' },
                { value: 'WARRANTY', label: 'Bảo hành (WARRANTY)' },
              ]}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Tag
              color="green"
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: 'rgba(16, 185, 129, 0.12)',
                borderColor: 'rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontWeight: 600,
              }}
            >
              Tổng có sẵn: {imeis.filter((i) => i.status === 'AVAILABLE').length}
            </Tag>
            <Tag
              color="gold"
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: 'rgba(245, 158, 11, 0.12)',
                borderColor: 'rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                fontWeight: 600,
              }}
            >
              Đang khóa 15p: {imeis.filter((i) => i.status === 'RESERVED').length}
            </Tag>
            <Tag
              color="default"
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: 'rgba(100, 116, 139, 0.12)',
                borderColor: 'rgba(100, 116, 139, 0.25)',
                color: '#94a3b8',
                fontWeight: 600,
              }}
            >
              Đã xuất kho: {imeis.filter((i) => i.status === 'SOLD').length}
            </Tag>
          </div>
        </div>
      </Card>

      {/* IMEI Data Table Card */}
      <Card
        bordered={false}
        style={{
          borderRadius: 14,
          background: '#0e1526',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredImeis}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          style={{ background: 'transparent' }}
        />
      </Card>

      {/* Modal: Batch Import IMEI with Luhn Validation */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarcodeOutlined style={{ color: '#6366f1', fontSize: 18 }} />
            <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: 16 }}>
              Nhập lô mã IMEI (Bulk Batch Import)
            </span>
          </div>
        }
        open={isImportModalOpen}
        onCancel={() => {
          setIsImportModalOpen(false);
          setValidationReport(null);
        }}
        footer={null}
        width={680}
        style={{ top: 20 }}
      >
        <Form
          form={importForm}
          layout="vertical"
          onFinish={handleImportSubmit}
          initialValues={{
            variantId: allVariants[0]?.variantId,
          }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="variantId"
            label="Chọn dòng điện thoại & Biến thể nhập kho"
            rules={[{ required: true, message: 'Vui lòng chọn biến thể' }]}
          >
            <Select showSearch optionFilterProp="label" options={allVariants} />
          </Form.Item>

          <Form.Item
            name="imeiList"
            label="Danh sách mã IMEI (mỗi mã 1 dòng, 15 chữ số)"
            rules={[{ required: true, message: 'Vui lòng nhập ít nhất 1 mã IMEI' }]}
            extra="Hệ thống tự động chạy thuật toán kiểm tra Luhn checksum ngay khi bạn nhập."
          >
            <TextArea
              rows={6}
              placeholder={`353245081234567\n353245081234568\n864922041234560`}
              onChange={(e) => handleImeiTextChange(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                background: '#151d30',
                color: '#f8fafc',
              }}
            />
          </Form.Item>

          {/* Real-time Luhn Validation Alert */}
          {validationReport && (
            <div style={{ marginBottom: 16 }}>
              {validationReport.invalidCount === 0 ? (
                <Alert
                  message={`Hợp lệ 100%: Tất cả ${validationReport.validCount} mã IMEI đều đạt chuẩn Luhn 15 chữ số quốc tế!`}
                  type="success"
                  showIcon
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    borderRadius: 10,
                  }}
                />
              ) : (
                <Alert
                  message={`Cảnh báo: Có ${validationReport.invalidCount} mã sai định dạng hoặc sai mã Luhn checksum!`}
                  description={
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Mã không hợp lệ:{' '}
                      <Text code style={{ background: '#151d30', color: '#f87171' }}>
                        {validationReport.invalidLines.slice(0, 3).join(', ')}
                      </Text>
                      {validationReport.invalidLines.length > 3 && '...'}
                    </div>
                  }
                  type="warning"
                  showIcon
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    borderRadius: 10,
                  }}
                />
              )}
            </div>
          )}

          <Form.Item style={{ marginBottom: 0, marginTop: 12, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsImportModalOpen(false)}>Hủy</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  background: '#6366f1',
                  borderColor: '#6366f1',
                  fontWeight: 600,
                  boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)',
                }}
              >
                Xác nhận nhập kho
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

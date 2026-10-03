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
import { productService } from '../../../services/productService';
import type { ImeiDevice, ImeiStatus, Product } from '../../../types';

const { Title, Text } = Typography;
const { TextArea } = Input;

export const AdminImeiPage: React.FC = () => {
  const [imeis, setImeis] = useState<ImeiDevice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  // Available variants for import from database
  const allVariants = useMemo(
    () =>
      products.flatMap((p) =>
        p.variants.map((v) => ({
          variantId: v.id,
          label: `${p.name} - ${v.color} (${v.storage}) - SKU: ${v.sku}`,
        }))
      ),
    [products]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [imeiData, prodData] = await Promise.all([
        imeiService.getAllImeis(),
        productService.getAllProductsAdmin(),
      ]);
      if (Array.isArray(imeiData)) {
        setImeis(imeiData);
      }
      if (prodData.items) {
        setProducts(prodData.items);
      }
    } catch (err) {
      console.error('Failed to load IMEIs or products from database API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
        `Có ${validationReport.invalidCount} mã IMEI không đúng định dạng 15 số! Vui lòng kiểm tra lại.`
      );
      return;
    }

    try {
      await imeiService.importImeis(values.variantId, lines);
      message.success(`Đã nhập thành công ${lines.length} thiết bị IMEI vào kho!`);
      setIsImportModalOpen(false);
      importForm.resetFields();
      setValidationReport(null);
      await loadData();
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
              background: '#ecfdf5',
              borderColor: '#a7f3d0',
              color: '#059669',
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
              background: '#fffbeb',
              borderColor: '#fde68a',
              color: '#d97706',
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
              background: '#f1f5f9',
              borderColor: '#cbd5e1',
              color: '#475569',
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
              background: '#faf5ff',
              borderColor: '#e9d5ff',
              color: '#9333ea',
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
      title: 'Mã số IMEI (15 số)',
      dataIndex: 'imeiNumber',
      key: 'imeiNumber',
      render: (num: string) => (
        <Space size="middle">
          <Text strong style={{ fontFamily: 'monospace', fontSize: 13, color: '#0f172a', letterSpacing: 0.5 }}>
            {num}
          </Text>
          <Tooltip title="Đạt tiêu chuẩn định dạng quốc tế GSMA">
            <Tag
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#eff6ff',
                borderColor: '#bfdbfe',
                color: '#2563eb',
                borderRadius: 4,
              }}
            >
              GSMA OK
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
            <Text strong style={{ color: '#0f172a', fontSize: 13 }}>
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
                background: '#fffbeb',
                borderColor: '#fde68a',
                color: '#d97706',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: 500,
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
                  background: '#059669',
                  borderColor: '#059669',
                  fontSize: 12,
                  borderRadius: 6,
                  fontWeight: 600,
                  color: '#ffffff',
                }}
              >
                Xác nhận Bán
              </Button>
              <Button
                size="small"
                danger
                onClick={() => handleStatusChange(record, 'return')}
                style={{
                  background: '#fff1f2',
                  borderColor: '#fecdd3',
                  color: '#e11d48',
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
                background: '#faf5ff',
                borderColor: '#e9d5ff',
                color: '#9333ea',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: 500,
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
            <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: -0.3 }}>
              Quản trị Kho Thiết bị & Quản lý IMEI
            </Title>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 20,
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0',
                fontWeight: 600,
              }}
            >
              GSMA Standard
            </span>
          </div>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'block' }}>
            Kiểm soát định danh từng chiếc máy, đảm bảo tính duy nhất và nguồn gốc chính hãng
          </Text>
        </div>

        <Button
          type="primary"
          icon={<UploadOutlined />}
          size="large"
          style={{
            background: '#2563eb',
            borderColor: '#2563eb',
            fontWeight: 600,
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
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
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          <Input
            placeholder="Tìm theo mã số IMEI (15 số)..."
            prefix={<SearchOutlined style={{ color: '#64748b' }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 280, borderRadius: 8, background: '#ffffff', borderColor: '#e2e8f0' }}
            allowClear
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#475569' }}>Lọc trạng thái:</Text>
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
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: '#ecfdf5',
                borderColor: '#a7f3d0',
                color: '#059669',
                fontWeight: 600,
              }}
            >
              Tổng có sẵn: {imeis.filter((i) => i.status === 'AVAILABLE').length}
            </Tag>
            <Tag
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: '#fffbeb',
                borderColor: '#fde68a',
                color: '#d97706',
                fontWeight: 600,
              }}
            >
              Đang khóa 15p: {imeis.filter((i) => i.status === 'RESERVED').length}
            </Tag>
            <Tag
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                background: '#f1f5f9',
                borderColor: '#cbd5e1',
                color: '#475569',
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
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
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
            <BarcodeOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 16 }}>
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
            extra="Hệ thống tự động kiểm tra định dạng và cấu trúc mã IMEI ngay khi bạn nhập."
          >
            <TextArea
              rows={6}
              placeholder={`353245081234567\n353245081234568\n864922041234560`}
              onChange={(e) => handleImeiTextChange(e.target.value)}
              style={{
                fontFamily: 'monospace',
                fontSize: 13,
                background: '#ffffff',
                color: '#0f172a',
                borderColor: '#e2e8f0',
              }}
            />
          </Form.Item>

          {/* Real-time Validation Alert */}
          {validationReport && (
            <div style={{ marginBottom: 16 }}>
              {validationReport.invalidCount === 0 ? (
                <Alert
                  message={`Hợp lệ 100%: Tất cả ${validationReport.validCount} mã IMEI đều đúng định dạng 15 chữ số!`}
                  type="success"
                  showIcon
                  style={{
                    background: '#ecfdf5',
                    borderColor: '#a7f3d0',
                    color: '#065f46',
                    borderRadius: 10,
                  }}
                />
              ) : (
                <Alert
                  message={`Cảnh báo: Có ${validationReport.invalidCount} mã sai định dạng hoặc kiểm tra không hợp lệ!`}
                  description={
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Mã không hợp lệ:{' '}
                      <Text code style={{ background: '#fef2f2', color: '#dc2626' }}>
                        {validationReport.invalidLines.slice(0, 3).join(', ')}
                      </Text>
                      {validationReport.invalidLines.length > 3 && '...'}
                    </div>
                  }
                  type="warning"
                  showIcon
                  style={{
                    background: '#fffbeb',
                    borderColor: '#fde68a',
                    color: '#92400e',
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
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
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

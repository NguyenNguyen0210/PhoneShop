import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Select,
  Table,
  Card,
  Row,
  Col,
  Space,
  Tag,
  Typography,
  message,
  Divider,
} from 'antd';
import { PlusOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { productService } from '../../../../services/productService';
import { flashSaleService } from '../../../../services/flashSaleService';
import type { Product, ProductVariant, CreateFlashSaleInput } from '../../../../types';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Text } = Typography;

export interface FlashSaleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SelectedVariantItem {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  variantLabel: string;
  originalPrice: number;
  availableStock: number;
  flashPrice: number;
  stockLimit: number;
  discountPercent: number;
}

export const FlashSaleFormModal: React.FC<FlashSaleFormModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Products catalog search & selection
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Selected variant for adding
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  // Flash pricing inputs for current item
  const [itemFlashPrice, setItemFlashPrice] = useState<number | null>(null);
  const [itemStockLimit, setItemStockLimit] = useState<number | null>(null);

  // List of items added to this campaign
  const [campaignItems, setCampaignItems] = useState<SelectedVariantItem[]>([]);

  // Fetch initial products on modal open
  const loadProducts = useCallback(async (searchQuery = '') => {
    setSearchingProducts(true);
    try {
      const res = await productService.getProducts({
        search: searchQuery.trim() || undefined,
        limit: 30,
      });
      setProducts(res.items || []);
    } catch {
      setProducts([]);
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        dateRange: [dayjs().add(1, 'hour'), dayjs().add(1, 'hour').add(3, 'hour')],
      });
      setCampaignItems([]);
      setSelectedProductId(null);
      setSelectedProduct(null);
      setSelectedVariantId(null);
      setSelectedVariant(null);
      setItemFlashPrice(null);
      setItemStockLimit(null);
      loadProducts();
    }
  }, [open, form, loadProducts]);

  // When a product is selected
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId) || null;
    setSelectedProduct(prod);
    setSelectedVariantId(null);
    setSelectedVariant(null);
    setItemFlashPrice(null);
    setItemStockLimit(null);
  };

  // When a variant is selected
  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
    const variant = selectedProduct?.variants?.find((v) => v.id === variantId) || null;
    setSelectedVariant(variant);

    if (variant) {
      // Suggest default flash price (e.g. 10% off)
      const suggestedPrice = Math.round(variant.price * 0.9);
      setItemFlashPrice(suggestedPrice);

      const available =
        variant.inventory?.quantity ??
        variant.inventory?.availableQty ??
        variant.inventoryQty ??
        10;
      setItemStockLimit(Math.min(available, 10));
    } else {
      setItemFlashPrice(null);
      setItemStockLimit(null);
    }
  };

  const getVariantAvailableStock = (variant: ProductVariant | null): number => {
    if (!variant) return 0;
    return (
      variant.inventory?.quantity ??
      variant.inventory?.availableQty ??
      variant.inventoryQty ??
      0
    );
  };

  // Calculate discount percentage
  const currentDiscountPercent =
    selectedVariant && itemFlashPrice && selectedVariant.price > itemFlashPrice
      ? Math.round(((selectedVariant.price - itemFlashPrice) / selectedVariant.price) * 100)
      : 0;

  // Add item to campaign list
  const handleAddItem = () => {
    if (!selectedProduct || !selectedVariant) {
      message.warning('Vui lòng chọn sản phẩm và biến thể');
      return;
    }

    if (!itemFlashPrice || itemFlashPrice <= 0) {
      message.warning('Vui lòng nhập giá Flash Sale hợp lệ');
      return;
    }

    if (itemFlashPrice >= selectedVariant.price) {
      message.warning('Giá Flash Sale phải nhỏ hơn giá gốc của biến thể');
      return;
    }

    const availableStock = getVariantAvailableStock(selectedVariant);
    if (!itemStockLimit || itemStockLimit <= 0) {
      message.warning('Vui lòng nhập số lượng suất bán hợp lệ');
      return;
    }

    if (itemStockLimit > availableStock) {
      message.warning(`Số lượng suất bán không được vượt quá tồn kho khả dụng (${availableStock})`);
      return;
    }

    // Check if variant already added
    if (campaignItems.some((it) => it.variantId === selectedVariant.id)) {
      message.warning('Biến thể này đã có trong danh sách Flash Sale');
      return;
    }

    const variantLabel = [selectedVariant.color, selectedVariant.storage, selectedVariant.name]
      .filter(Boolean)
      .join(' - ');

    const newItem: SelectedVariantItem = {
      variantId: selectedVariant.id,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedVariant.sku,
      variantLabel: variantLabel || selectedVariant.sku,
      originalPrice: selectedVariant.price,
      availableStock,
      flashPrice: itemFlashPrice,
      stockLimit: itemStockLimit,
      discountPercent: currentDiscountPercent,
    };

    setCampaignItems([...campaignItems, newItem]);
    // Reset selection fields
    setSelectedVariantId(null);
    setSelectedVariant(null);
    setItemFlashPrice(null);
    setItemStockLimit(null);
    message.success('Đã thêm sản phẩm vào danh sách sale');
  };

  const handleRemoveItem = (variantId: string) => {
    setCampaignItems(campaignItems.filter((it) => it.variantId !== variantId));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (campaignItems.length === 0) {
        message.warning('Vui lòng thêm ít nhất một sản phẩm vào chiến dịch Flash Sale');
        return;
      }

      setSubmitting(true);
      const [startAt, endAt] = values.dateRange;

      const payload: CreateFlashSaleInput = {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        items: campaignItems.map((it) => ({
          variantId: it.variantId,
          flashPrice: it.flashPrice,
          stockLimit: it.stockLimit,
        })),
      };

      await flashSaleService.createCampaign(payload);
      message.success('Tạo chiến dịch Flash Sale thành công!');
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error?.errorFields) return;
      const msg = error?.response?.data?.message || 'Có lỗi xảy ra khi tạo chiến dịch Flash Sale';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const itemColumns: ColumnsType<SelectedVariantItem> = [
    {
      title: 'Sản phẩm & Biến thể',
      key: 'product',
      render: (_, record) => (
        <div>
          <Text strong>{record.productName}</Text>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {record.variantLabel} (SKU: {record.sku})
          </div>
        </div>
      ),
    },
    {
      title: 'Giá gốc',
      dataIndex: 'originalPrice',
      key: 'originalPrice',
      render: (price) => <Text delete>{Number(price).toLocaleString('vi-VN')} ₫</Text>,
    },
    {
      title: 'Giá Flash Sale',
      key: 'flashPrice',
      render: (_, record) => (
        <Space>
          <Text strong style={{ color: '#dc2626' }}>
            {Number(record.flashPrice).toLocaleString('vi-VN')} ₫
          </Text>
          <Tag color="red">-{record.discountPercent}%</Tag>
        </Space>
      ),
    },
    {
      title: 'Suất bán / Tồn kho',
      key: 'stock',
      render: (_, record) => (
        <Text>
          <Text strong style={{ color: '#2563eb' }}>
            {record.stockLimit}
          </Text>{' '}
          / {record.availableStock}
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'right',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(record.variantId)}
        >
          Xóa
        </Button>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title="Tạo chiến dịch Flash Sale mới"
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText="Tạo chiến dịch"
      cancelText="Hủy bỏ"
      width={800}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Tên chiến dịch Flash Sale"
          rules={[{ required: true, message: 'Vui lòng nhập tên chiến dịch' }]}
        >
          <Input placeholder="VD: Flash Sale Giờ Vàng - Giảm Sốc Đến 50%" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả chiến dịch">
          <TextArea rows={2} placeholder="Nội dung tóm tắt sự kiện khuyến mãi Flash Sale..." />
        </Form.Item>

        <Form.Item
          name="dateRange"
          label="Khung giờ áp dụng"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc' }]}
        >
          <RangePicker
            showTime={{ format: 'HH:mm:ss' }}
            format="YYYY-MM-DD HH:mm:ss"
            style={{ width: '100%' }}
            placeholder={['Bắt đầu lúc', 'Kết thúc lúc']}
          />
        </Form.Item>

        <Divider style={{ margin: '16px 0' }}>
          <Space>
            <ShoppingCartOutlined style={{ color: '#e11d48' }} />
            <span>Thêm sản phẩm tham gia Flash Sale</span>
          </Space>
        </Divider>

        {/* Product & Variant Picker */}
        <Card size="small" style={{ background: '#f8fafc', marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="1. Chọn sản phẩm" style={{ marginBottom: 12 }}>
                <Select
                  showSearch
                  placeholder="Tìm theo tên sản phẩm..."
                  loading={searchingProducts}
                  value={selectedProductId}
                  onChange={handleProductSelect}
                  onSearch={(q) => loadProducts(q)}
                  filterOption={false}
                  options={products.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="2. Chọn biến thể (SKU)" style={{ marginBottom: 12 }}>
                <Select
                  placeholder={
                    selectedProduct ? 'Chọn biến thể...' : 'Vui lòng chọn sản phẩm trước'
                  }
                  disabled={!selectedProduct || !selectedProduct.variants?.length}
                  value={selectedVariantId}
                  onChange={handleVariantSelect}
                  options={(selectedProduct?.variants || []).map((v) => {
                    const labelParts = [v.sku, v.color, v.storage].filter(Boolean).join(' - ');
                    const stock =
                      v.inventory?.quantity ?? v.inventory?.availableQty ?? v.inventoryQty ?? 0;
                    return {
                      value: v.id,
                      label: `${labelParts} (${Number(v.price).toLocaleString('vi-VN')} ₫ | Kho: ${stock})`,
                    };
                  })}
                />
              </Form.Item>
            </Col>
          </Row>

          {selectedVariant && (
            <>
              <Row gutter={16} align="middle">
                <Col span={6}>
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      Giá gốc niêm yết:
                    </Text>
                    <Text strong style={{ fontSize: 15 }}>
                      {Number(selectedVariant.price).toLocaleString('vi-VN')} ₫
                    </Text>
                  </div>
                </Col>

                <Col span={6}>
                  <div style={{ marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      Tồn kho khả dụng:
                    </Text>
                    <Tag color="cyan">
                      {getVariantAvailableStock(selectedVariant)} sản phẩm
                    </Tag>
                  </div>
                </Col>

                <Col span={6}>
                  <Form.Item label="3. Giá Flash Sale (₫)" style={{ marginBottom: 12 }}>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1000}
                      max={selectedVariant.price - 1}
                      value={itemFlashPrice}
                      onChange={(val) => setItemFlashPrice(val)}
                      formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                      parser={(val) => Number((val ?? '').replace(/\$\s?|(,*)/g, ''))}
                    />
                  </Form.Item>
                </Col>

                <Col span={6}>
                  <Form.Item label="4. Số suất bán (Stock Limit)" style={{ marginBottom: 12 }}>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={1}
                      max={getVariantAvailableStock(selectedVariant)}
                      value={itemStockLimit}
                      onChange={(val) => setItemStockLimit(val)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: 8,
                }}
              >
                <div>
                  {currentDiscountPercent > 0 && (
                    <Tag color="red" style={{ fontSize: 13, padding: '2px 8px' }}>
                      ⚡ Giảm {currentDiscountPercent}% so với giá gốc
                    </Tag>
                  )}
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddItem}
                  disabled={!itemFlashPrice || !itemStockLimit}
                >
                  Thêm vào danh sách sale
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Selected Items Table */}
        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <Text strong>Danh sách sản phẩm trong Flash Sale ({campaignItems.length}):</Text>
        </div>

        <Table
          dataSource={campaignItems}
          columns={itemColumns}
          rowKey="variantId"
          pagination={false}
          size="small"
          locale={{ emptyText: 'Chưa có sản phẩm nào được chọn vào Flash Sale' }}
        />
      </Form>
    </Modal>
  );
};

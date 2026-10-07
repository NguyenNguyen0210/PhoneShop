import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Typography,
  Image,
  Divider,
  Card,
  Tooltip,
  Popconfirm,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  EyeOutlined,
  DownOutlined,
  ReloadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { productService } from '../../../services/productService';
import { inventoryService } from '../../../services/inventoryService';
import { ImageUploadDragger } from '../../../components/admin/ImageUploadDragger';
import { ProductEditModal } from './components/ProductEditModal';
import { FALLBACK_PRODUCT_IMAGE } from '../../../utils/imageFallback';
import type { Product, Brand, Category, ProductVariant } from '../../../types';

const { Title, Text } = Typography;

type QuickFilterTab = 'ALL' | 'ACTIVE' | 'DRAFT' | 'OUT_OF_STOCK';

export const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Modals & Selection
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editModalInitialTab, setEditModalInitialTab] = useState('general');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);

  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [activeQuickTab, setActiveQuickTab] = useState<QuickFilterTab>('ALL');

  useEffect(() => {
    const brandParam = searchParams.get('brand') || searchParams.get('brandId');
    if (brandParam && brands.length > 0) {
      const match = brands.find(
        (b) =>
          b.slug?.toLowerCase() === brandParam.toLowerCase() ||
          b.id === brandParam ||
          b.name?.toLowerCase() === brandParam.toLowerCase(),
      );
      if (match) {
        setSelectedBrand(match.id);
      }
    }
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams, brands]);

  // Pagination
  const [pageSize, setPageSize] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);

  const [form] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, brandsRes, catRes, invRes] = await Promise.allSettled([
        productService.getAllProductsAdmin(),
        productService.getBrands(),
        productService.getCategories(),
        inventoryService.getInventoryList(),
      ]);

      if (prodRes.status === 'fulfilled' && prodRes.value?.items) {
        setProducts(prodRes.value.items);
      }
      if (brandsRes.status === 'fulfilled' && Array.isArray(brandsRes.value)) {
        setBrands(brandsRes.value);
      }
      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value)) {
        setCategories(catRes.value);
      }
      if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
        const map: Record<string, number> = {};
        for (const item of invRes.value) {
          if (item.variantId) {
            map[item.variantId] = item.availableQty ?? item.quantity ?? 0;
          }
        }
        setInventoryMap(map);
      }
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateProduct = async (values: any) => {
    try {
      const created = await productService.createProduct({
        name: values.name,
        description: values.description,
        brandId: values.brandId,
        categoryId: values.categoryId,
        thumbnailUrl: values.thumbnailUrl ?? values.thumbnail,
      });

      if (created?.id && values.sku) {
        try {
          const variant = await productService.addVariant(created.id, {
            sku: values.sku,
            color: values.variantColor || 'Đen Titan',
            storage: values.variantStorage || '256GB',
            ram: values.variantRam || '8GB',
            price: values.variantPrice || 25000000,
            compareAtPrice: values.variantComparePrice || undefined,
          });
          const initialQty = values.inventoryQty || 10;
          if (variant?.id && initialQty > 0) {
            await inventoryService.adjustStock(variant.id, {
              quantity: initialQty,
              note: 'Tồn kho ban đầu khi tạo sản phẩm',
            });
          }
        } catch (vErr) {
          console.warn('Initial variant creation failed:', vErr);
        }
      }

      message.success('Thêm sản phẩm thành công!');
      setIsModalOpen(false);
      form.resetFields();
      await loadData();
      if (created?.id) {
        setEditingProductId(created.id);
        setEditModalInitialTab('general');
        setIsEditModalOpen(true);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const handleToggleStatus = async (record: Product, checked: boolean) => {
    const nextStatus = checked ? 'ACTIVE' : 'DRAFT';
    try {
      await productService.updateProduct(record.id, { status: nextStatus as any });
      const updated = products.map((p) =>
        p.id === record.id ? { ...p, status: nextStatus as any } : p
      );
      setProducts(updated);
      message.success(`Đã chuyển trạng thái "${record.name}" sang ${checked ? 'ĐANG BÁN' : 'TẠM ẨN'}`);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setSelectedRowKeys((prev) => prev.filter((k) => k !== id));
      message.success('Đã xóa sản phẩm thành công!');
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Thao tác thất bại');
    }
  };

  // Bulk Actions
  const handleBulkActivate = async () => {
    const ids = selectedRowKeys as string[];
    if (ids.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(ids.map((id) => productService.updateProduct(id, { status: 'ACTIVE' as any })));
      setProducts((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, status: 'ACTIVE' as any } : p))
      );
      message.success(`Đã chuyển ${ids.length} sản phẩm sang trạng thái ĐANG BÁN`);
      setSelectedRowKeys([]);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Cập nhật hàng loạt thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = selectedRowKeys as string[];
    if (ids.length === 0) return;
    try {
      setLoading(true);
      await Promise.all(ids.map((id) => productService.updateProduct(id, { status: 'DRAFT' as any })));
      setProducts((prev) =>
        prev.map((p) => (ids.includes(p.id) ? { ...p, status: 'DRAFT' as any } : p))
      );
      message.info(`Đã chuyển ${ids.length} sản phẩm sang trạng thái TẠM ẨN`);
      setSelectedRowKeys([]);
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Cập nhật hàng loạt thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = () => {
    const ids = selectedRowKeys as string[];
    if (ids.length === 0) return;
    Modal.confirm({
      title: 'Xác nhận xóa hàng loạt',
      icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
      content: `Bạn có chắc chắn muốn xóa ${ids.length} sản phẩm đã chọn? Toàn bộ biến thể và thông tin đi kèm sẽ bị xóa vĩnh viễn.`,
      okText: `Xóa ${ids.length} sản phẩm`,
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await Promise.all(ids.map((id) => productService.deleteProduct(id)));
          setProducts((prev) => prev.filter((p) => !ids.includes(p.id)));
          setSelectedRowKeys([]);
          message.success(`Đã xóa thành công ${ids.length} sản phẩm`);
        } catch (err: any) {
          message.error(err.response?.data?.message || err.message || 'Xóa hàng loạt thất bại');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // Stock & Code Calculation Helpers
  const getVariantStock = useCallback(
    (v: ProductVariant): number => {
      if (v.inventory?.availableQty !== undefined) return Number(v.inventory.availableQty) || 0;
      if (v.inventory?.quantity !== undefined) return Number(v.inventory.quantity) || 0;
      if (inventoryMap[v.id] !== undefined) return Number(inventoryMap[v.id]) || 0;
      if ((v as any).stock !== undefined) return Number((v as any).stock) || 0;
      return 0;
    },
    [inventoryMap]
  );

  const getProductTotalStock = useCallback(
    (p: Product): number => {
      if (!p.variants || p.variants.length === 0) return 0;
      return p.variants.reduce((sum, v) => sum + getVariantStock(v), 0);
    },
    [getVariantStock]
  );

  const getDisplayCode = (product: Product): string => {
    const firstSku = product.variants?.find((v) => v.sku)?.sku;
    if (firstSku) return firstSku;
    if (product.id) {
      return `SP-${product.id.slice(0, 8).toUpperCase()}`;
    }
    return 'SP-DEVICE';
  };

  const handleCopyCode = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        throw new Error('Clipboard fallback');
      }
      message.success(`Đã sao chép mã: ${code}`);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success(`Đã sao chép mã: ${code}`);
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const toggleRowExpand = (productId: string) => {
    setExpandedRowKeys((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Filter & Metric Counts
  const activeCount = useMemo(() => products.filter((p) => p.status === 'ACTIVE').length, [products]);
  const draftCount = useMemo(() => products.filter((p) => p.status !== 'ACTIVE').length, [products]);
  const outOfStockCount = useMemo(
    () => products.filter((p) => getProductTotalStock(p) === 0).length,
    [products, getProductTotalStock]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Quick tabs
      if (activeQuickTab === 'ACTIVE' && p.status !== 'ACTIVE') return false;
      if (activeQuickTab === 'DRAFT' && p.status === 'ACTIVE') return false;
      if (activeQuickTab === 'OUT_OF_STOCK' && getProductTotalStock(p) > 0) return false;

      // Brand filter
      if (selectedBrand !== 'ALL' && p.brandId !== selectedBrand) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchBrand = p.brand?.name?.toLowerCase().includes(q);
        const matchCode = getDisplayCode(p).toLowerCase().includes(q);
        const matchVariantSku = p.variants?.some((v) => v.sku?.toLowerCase().includes(q));
        if (!matchName && !matchBrand && !matchCode && !matchVariantSku) return false;
      }
      return true;
    });
  }, [products, activeQuickTab, selectedBrand, searchQuery, getProductTotalStock]);

  const quickFilterTabs: { key: QuickFilterTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: products.length },
    { key: 'ACTIVE', label: 'Đang kinh doanh', count: activeCount },
    { key: 'DRAFT', label: 'Đang tạm ẩn', count: draftCount },
    { key: 'OUT_OF_STOCK', label: 'Hết hàng', count: outOfStockCount },
  ];

  // Table Columns Definition
  const columns: ColumnsType<Product> = [
    {
      title: 'Hình ảnh',
      dataIndex: 'thumbnail',
      key: 'thumbnail',
      width: 72,
      align: 'center',
      render: (src: string, record) => (
        <div
          className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200/70 p-1 flex items-center justify-center mx-auto overflow-hidden shadow-2xs"
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
          }}
        >
          <Image
            src={src || FALLBACK_PRODUCT_IMAGE}
            alt={record.name}
            width="100%"
            height="100%"
            style={{ objectFit: 'contain', maxHeight: '100%', maxWidth: '100%' }}
            fallback={FALLBACK_PRODUCT_IMAGE}
            preview={{ mask: null }}
          />
        </div>
      ),
    },
    {
      title: 'Tên sản phẩm & Mã',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => {
        const displayCode = getDisplayCode(record);
        return (
          <div>
            <div
              className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer text-sm leading-snug transition-colors"
              style={{ fontWeight: 600, color: '#0f172a', fontSize: 13, cursor: 'pointer' }}
              onClick={() => {
                setEditingProductId(record.id);
                setEditModalInitialTab('general');
                setIsEditModalOpen(true);
              }}
            >
              {name}
            </div>
            <div
              className="flex items-center gap-1.5 text-xs text-gray-400 font-mono mt-0.5"
              style={{
                fontSize: 11,
                color: '#64748b',
                fontFamily: 'monospace',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>
                Mã: <strong style={{ color: '#334155' }}>{displayCode}</strong>
              </span>
              <Tooltip title={`Sao chép mã (${record.id})`}>
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, displayCode)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 2,
                    color: '#94a3b8',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  className="hover:text-blue-600 transition-colors"
                  aria-label="Sao chép mã sản phẩm"
                >
                  <CopyOutlined style={{ fontSize: 11 }} />
                </button>
              </Tooltip>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Thương hiệu',
      dataIndex: 'brand',
      key: 'brand',
      width: 130,
      render: (brand, record) => (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            background: '#eff6ff',
            color: '#1d4ed8',
            borderRadius: 6,
            border: '1px solid #dbeafe',
            textTransform: 'uppercase',
            letterSpacing: '0.025em',
          }}
        >
          {brand?.name || record.brandId || 'Chính hãng'}
        </span>
      ),
    },
    {
      title: 'Biến thể SKU',
      dataIndex: 'variants',
      key: 'variants',
      width: 140,
      render: (variants: any[], record) => {
        const vCount = variants?.length || 0;
        const isExpanded = expandedRowKeys.includes(record.id);

        if (vCount === 0) {
          return (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 6,
                background: '#f1f5f9',
                color: '#94a3b8',
                border: '1px solid #e2e8f0',
                fontWeight: 500,
              }}
            >
              0 biến thể
            </span>
          );
        }

        return (
          <button
            type="button"
            onClick={() => toggleRowExpand(record.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: '#334155',
              background: isExpanded ? '#eff6ff' : '#f8fafc',
              border: isExpanded ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
              padding: '3px 10px',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
            title="Bấm để xem danh sách biến thể"
          >
            <span>{vCount} biến thể</span>
            <DownOutlined
              style={{
                fontSize: 9,
                transition: 'transform 0.2s',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                color: isExpanded ? '#2563eb' : '#64748b',
              }}
            />
          </button>
        );
      },
    },
    {
      title: 'Tồn kho',
      key: 'stock',
      width: 130,
      sorter: (a, b) => getProductTotalStock(a) - getProductTotalStock(b),
      render: (_, record) => {
        const totalStock = getProductTotalStock(record);
        if (!record.variants || record.variants.length === 0) {
          return (
            <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
              Chưa có biến thể
            </span>
          );
        }

        if (totalStock === 0) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                background: '#fff1f2',
                color: '#e11d48',
                border: '1px solid #fecdd3',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e' }} />
              Hết hàng
            </span>
          );
        }

        if (totalStock < 5) {
          return (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                background: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
              Sắp hết ({totalStock})
            </span>
          );
        }

        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 8px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 600,
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
            Kho: {totalStock} máy
          </span>
        );
      },
    },
    {
      title: 'Khoảng giá niêm yết',
      key: 'priceRange',
      render: (_, record) => {
        const validPrices = (record.variants || [])
          .map((v) => Number(v.price))
          .filter((p) => !isNaN(p) && p > 0);

        if (validPrices.length === 0) {
          return (
            <span
              style={{
                color: '#d97706',
                fontStyle: 'italic',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              Chưa thiết lập giá
            </span>
          );
        }

        const min = Math.min(...validPrices);
        const max = Math.max(...validPrices);

        return (
          <span
            style={{
              fontWeight: 700,
              color: '#0f172a',
              fontFamily: 'monospace',
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`}
          </span>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string, record) => {
        const isActive = status === 'ACTIVE';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                background: isActive ? '#ecfdf5' : '#f1f5f9',
                color: isActive ? '#059669' : '#64748b',
                border: isActive ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isActive ? '#10b981' : '#94a3b8',
                }}
              />
              {isActive ? 'Đang bán' : 'Tạm dừng'}
            </span>
            <Switch
              size="small"
              checked={isActive}
              onChange={(checked) => handleToggleStatus(record, checked)}
              style={{
                backgroundColor: isActive ? '#10b981' : undefined,
              }}
              aria-label={`Chuyển trạng thái sản phẩm ${record.name}`}
            />
          </div>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          <Tooltip title="Xem ngoài web">
            <Button
              size="small"
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                const url = `/products/${record.slug || record.id}`;
                window.open(url, '_blank');
              }}
              style={{ color: '#64748b', borderRadius: 6 }}
              aria-label="Xem sản phẩm ngoài storefront"
              title="Xem ngoài web"
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa sản phẩm">
            <Button
              size="small"
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingProductId(record.id);
                setEditModalInitialTab('general');
                setIsEditModalOpen(true);
              }}
              style={{ color: '#2563eb', borderRadius: 6 }}
              aria-label="Sửa"
              title="Sửa"
            />
          </Tooltip>
          <Popconfirm
            title="Xác nhận xóa sản phẩm"
            description={
              <div style={{ maxWidth: 260 }}>
                Bạn có chắc chắn muốn xóa sản phẩm <strong>{record.name}</strong>?
                <div style={{ fontSize: 11, color: '#f43f5e', marginTop: 4 }}>
                  Hành động này không thể hoàn tác!
                </div>
              </div>
            }
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="Xóa vĩnh viễn"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                size="small"
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{ color: '#e11d48', borderRadius: 6 }}
                aria-label="Xóa"
                title="Xóa"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  // Expandable Nested Variant View
  const expandedRowRender = (record: Product) => {
    if (!record.variants || record.variants.length === 0) {
      return (
        <div
          style={{
            padding: '16px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px dashed #cbd5e1',
            textAlign: 'center',
            fontSize: 12,
            color: '#64748b',
          }}
        >
          Sản phẩm này chưa có biến thể SKU nào.
        </div>
      );
    }

    return (
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
            Chi tiết các phiên bản ({record.variants.length} biến thể)
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingProductId(record.id);
              setEditModalInitialTab('variants');
              setIsEditModalOpen(true);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#2563eb',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <PlusOutlined style={{ fontSize: 11 }} /> Quản lý danh sách biến thể
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                <th style={{ padding: '6px 8px', width: 44 }}>Ảnh</th>
                <th style={{ padding: '6px 8px' }}>Mã SKU</th>
                <th style={{ padding: '6px 8px' }}>Màu sắc & Thông số</th>
                <th style={{ padding: '6px 8px' }}>Giá bán</th>
                <th style={{ padding: '6px 8px' }}>Tồn kho</th>
                <th style={{ padding: '6px 8px' }}>Trạng thái</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {record.variants.map((v) => {
                const vStock = getVariantStock(v);
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          padding: 2,
                        }}
                      >
                        <img
                          src={v.imageUrl || record.thumbnail || FALLBACK_PRODUCT_IMAGE}
                          alt={v.sku}
                          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                      {v.sku}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <Space size={4}>
                        {v.color && (
                          <Tag color="cyan" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                            {v.color}
                          </Tag>
                        )}
                        {v.storage && (
                          <Tag color="blue" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                            {v.storage}
                          </Tag>
                        )}
                        {v.ram && (
                          <Tag color="purple" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                            RAM {v.ram}
                          </Tag>
                        )}
                      </Space>
                    </td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                      <div>{formatPrice(v.price || 0)}</div>
                      {v.compareAtPrice && v.compareAtPrice > v.price && (
                        <div style={{ fontSize: 10, color: '#94a3b8', textDecoration: 'line-through' }}>
                          {formatPrice(v.compareAtPrice)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {vStock === 0 ? (
                        <Tag color="error" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                          Hết hàng (0)
                        </Tag>
                      ) : vStock < 5 ? (
                        <Tag color="warning" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                          Sắp hết ({vStock})
                        </Tag>
                      ) : (
                        <Tag color="success" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                          {vStock} máy
                        </Tag>
                      )}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <Tag
                        color={v.isActive !== false ? 'green' : 'default'}
                        style={{ borderRadius: 4, margin: 0, fontSize: 11 }}
                      >
                        {v.isActive !== false ? 'Kinh doanh' : 'Tạm dừng'}
                      </Tag>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProductId(record.id);
                          setEditModalInitialTab('variants');
                          setIsEditModalOpen(true);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#2563eb',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Page Header */}
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
          <Title level={3} style={{ margin: 0, color: '#0f172a', fontWeight: 800, letterSpacing: -0.3 }}>
            Quản lý Sản phẩm & Biến thể
          </Title>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'block' }}>
            Danh mục các thiết bị di động, quản lý biến thể dung lượng/màu sắc và kiểm soát tồn kho
          </Text>
        </div>

        <Space size="middle">
          <Button
            icon={<ReloadOutlined />}
            size="large"
            onClick={loadData}
            loading={loading}
            style={{ borderRadius: 8 }}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            style={{
              background: '#2563eb',
              borderColor: '#2563eb',
              fontWeight: 600,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
            }}
            onClick={() => setIsModalOpen(true)}
          >
            Thêm sản phẩm mới
          </Button>
        </Space>
      </div>

      {/* Quick Filter Tabs & Search Bar Card */}
      <Card
        bordered={false}
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Filter Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              paddingBottom: 14,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {quickFilterTabs.map((tab) => {
              const isSelected = activeQuickTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveQuickTab(tab.key);
                    setCurrentPage(1);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#f8fafc',
                    color: isSelected ? '#1d4ed8' : '#475569',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 9999,
                      background: isSelected ? '#2563eb' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#64748b',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Brand Filter Controls */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            <Input
              placeholder="Tìm theo tên sản phẩm, mã SKU hoặc thương hiệu..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: 340, borderRadius: 8, background: '#ffffff', borderColor: '#e2e8f0' }}
              allowClear
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Thương hiệu:</Text>
              <Select
                value={selectedBrand}
                onChange={(val) => {
                  setSelectedBrand(val);
                  setCurrentPage(1);
                }}
                style={{ width: 180 }}
                options={[
                  { value: 'ALL', label: 'Tất cả thương hiệu' },
                  ...brands.map((b) => ({ value: b.id, label: b.name })),
                ]}
              />
            </div>

            {(searchQuery.trim() || selectedBrand !== 'ALL' || activeQuickTab !== 'ALL') && (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedBrand('ALL');
                  setActiveQuickTab('ALL');
                  setCurrentPage(1);
                }}
                style={{ fontSize: 12, color: '#64748b' }}
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Products Table Card */}
      <Card
        bordered={false}
        style={{
          borderRadius: 16,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Bulk Action Toolbar */}
        {selectedRowKeys.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
              padding: '10px 16px',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>
                Đã chọn <strong style={{ color: '#2563eb' }}>{selectedRowKeys.length}</strong> sản phẩm
              </span>
              <Button
                size="small"
                type="link"
                onClick={() => setSelectedRowKeys([])}
                style={{ padding: 0, fontSize: 12 }}
              >
                Bỏ chọn
              </Button>
            </div>

            <Space size="small">
              <Button
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={handleBulkActivate}
                style={{
                  color: '#059669',
                  borderColor: '#a7f3d0',
                  background: '#ecfdf5',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 6,
                }}
              >
                Đổi sang Đang bán ({selectedRowKeys.length})
              </Button>
              <Button
                size="small"
                icon={<EyeInvisibleOutlined />}
                onClick={handleBulkDeactivate}
                style={{
                  color: '#475569',
                  borderColor: '#cbd5e1',
                  background: '#f8fafc',
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 6,
                }}
              >
                Đổi sang Tạm ẩn ({selectedRowKeys.length})
              </Button>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={handleBulkDelete}
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  borderRadius: 6,
                }}
              >
                Xóa đã chọn ({selectedRowKeys.length})
              </Button>
            </Space>
          </div>
        )}

        <Table
          columns={columns}
          dataSource={filteredProducts}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as string[]),
            expandedRowRender,
            rowExpandable: (record) => Boolean(record.variants && record.variants.length > 0),
          }}
          pagination={{
            current: currentPage,
            pageSize,
            total: filteredProducts.length,
            onChange: (page, size) => {
              setCurrentPage(page);
              if (size) setPageSize(size);
            },
            showSizeChanger: true,
            pageSizeOptions: ['8', '10', '20', '50'],
            locale: { items_per_page: 'dòng / trang' },
            showTotal: (total, range) => (
              <span style={{ fontSize: 12, color: '#64748b' }}>
                Hiển thị <strong>{range[0]} – {range[1]}</strong> trong tổng số <strong>{total}</strong> sản phẩm
              </span>
            ),
          }}
          locale={{
            emptyText: (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                <InboxOutlined style={{ fontSize: 36, marginBottom: 8, display: 'block' }} />
                <span>Không có sản phẩm nào phù hợp với bộ lọc</span>
              </div>
            ),
          }}
          style={{ background: 'transparent' }}
        />
      </Card>

      {/* Modal: Add Product with ImageUploadDragger */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#2563eb',
                boxShadow: '0 0 6px rgba(37, 99, 235, 0.4)',
              }}
            />
            <span style={{ color: '#0f172a', fontWeight: 700, fontSize: 16 }}>
              Thêm thiết bị mới vào danh mục
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={720}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          initialValues={{
            brandId: brands[0]?.id,
            categoryId: categories[0]?.id,
            variantColor: 'Titan Tự Nhiên',
            variantStorage: '256GB',
            variantRam: '8GB',
            variantPrice: 28990000,
            inventoryQty: 10,
          }}
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="name"
              label="Tên sản phẩm"
              rules={[{ required: true, message: 'Vui lòng nhập tên điện thoại' }]}
            >
              <Input placeholder="Ví dụ: iPhone 16 Pro Max" />
            </Form.Item>

            <Form.Item name="brandId" label="Thương hiệu" rules={[{ required: true }]}>
              <Select placeholder="Chọn thương hiệu">
                {brands.map((b) => (
                  <Select.Option key={b.id} value={b.id}>
                    {b.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="categoryId" label="Danh mục sản phẩm" rules={[{ required: true }]}>
              <Select placeholder="Chọn danh mục">
                {categories.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="description" label="Mô tả tóm tắt">
              <Input placeholder="Thông tin nổi bật, chip vi xử lý, camera..." />
            </Form.Item>
          </div>

          <Form.Item
            name="thumbnail"
            label="Ảnh đại diện thiết bị (Tự động nén WebP & lưu Cloudflare R2)"
          >
            <ImageUploadDragger folder="products" />
          </Form.Item>

          <Divider
            titlePlacement="start"
            plain
            style={{
              borderColor: '#e2e8f0',
              color: '#475569',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Khởi tạo Biến thể mặc định đầu tiên
          </Divider>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="variantColor" label="Màu sắc" rules={[{ required: true }]}>
              <Input placeholder="Titan Xanh, Đen..." />
            </Form.Item>

            <Form.Item name="variantStorage" label="Bộ nhớ (ROM)" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="128GB">128GB</Select.Option>
                <Select.Option value="256GB">256GB</Select.Option>
                <Select.Option value="512GB">512GB</Select.Option>
                <Select.Option value="1TB">1TB</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="variantRam" label="RAM">
              <Select>
                <Select.Option value="8GB">8GB</Select.Option>
                <Select.Option value="12GB">12GB</Select.Option>
                <Select.Option value="16GB">16GB</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Form.Item name="variantPrice" label="Giá bán (VND)" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item name="variantComparePrice" label="Giá gốc niêm yết (VND)">
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              />
            </Form.Item>

            <Form.Item name="inventoryQty" label="Tồn kho ban đầu">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item style={{ marginBottom: 0, marginTop: 12, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
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
                Lưu sản phẩm
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal: Edit Product with 3 tabs */}
      <ProductEditModal
        open={isEditModalOpen}
        productId={editingProductId}
        initialTab={editModalInitialTab}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProductId(null);
          setEditModalInitialTab('general');
        }}
        onSuccess={loadData}
      />
    </div>
  );
};

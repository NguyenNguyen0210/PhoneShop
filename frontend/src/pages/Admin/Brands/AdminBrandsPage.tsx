import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Table,
  Button,
  Input,
  Select,
  Switch,
  message,
  Typography,
  Card,
  Popconfirm,
  Tooltip,
  Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { brandService } from '../../../services/brandService';
import { BrandStatsCards } from './components/BrandStatsCards';
import { BrandFormModal } from './components/BrandFormModal';
import type { Brand, CreateBrandInput, UpdateBrandInput } from '../../../types';

const { Title, Text } = Typography;

interface BrandMetadata {
  tier: string;
  origin: string;
  flag: string;
  badgeStyle: { bg: string; text: string; border: string };
  defaultOrder: number;
  featured: boolean;
}

const BRAND_METADATA: Record<string, BrandMetadata> = {
  apple: {
    tier: 'AAR (Đại lý ủy quyền)',
    origin: 'Mỹ',
    flag: '🇺🇸',
    badgeStyle: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    defaultOrder: 1,
    featured: true,
  },
  samsung: {
    tier: 'Flagship Partner',
    origin: 'Hàn Quốc',
    flag: '🇰🇷',
    badgeStyle: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
    defaultOrder: 2,
    featured: true,
  },
  xiaomi: {
    tier: 'Đối tác chiến lược',
    origin: 'Trung Quốc',
    flag: '🇨🇳',
    badgeStyle: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    defaultOrder: 3,
    featured: true,
  },
  oppo: {
    tier: 'Phân phối chính hãng',
    origin: 'Trung Quốc',
    flag: '🇨🇳',
    badgeStyle: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    defaultOrder: 4,
    featured: true,
  },
  vivo: {
    tier: 'Phân phối chính hãng',
    origin: 'Trung Quốc',
    flag: '🇨🇳',
    badgeStyle: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    defaultOrder: 5,
    featured: true,
  },
  realme: {
    tier: 'Phân phối chính hãng',
    origin: 'Trung Quốc',
    flag: '🇨🇳',
    badgeStyle: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
    defaultOrder: 6,
    featured: true,
  },
  honor: {
    tier: 'Phân phối chính hãng',
    origin: 'Trung Quốc',
    flag: '🇨🇳',
    badgeStyle: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    defaultOrder: 7,
    featured: true,
  },
  oneplus: {
    tier: 'Nhập khẩu chính hãng',
    origin: 'Trung Quốc',
    flag: '🇨🇳',
    badgeStyle: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    defaultOrder: 8,
    featured: true,
  },
  asus: {
    tier: 'Đối tác chiến lược (ROG)',
    origin: 'Đài Loan',
    flag: '🇹🇼',
    badgeStyle: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    defaultOrder: 9,
    featured: false,
  },
  google: {
    tier: 'Nhập khẩu chính hãng',
    origin: 'Mỹ',
    flag: '🇺🇸',
    badgeStyle: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    defaultOrder: 10,
    featured: false,
  },
  sony: {
    tier: 'Phân phối chính hãng',
    origin: 'Nhật Bản',
    flag: '🇯🇵',
    badgeStyle: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
    defaultOrder: 11,
    featured: false,
  },
  nothing: {
    tier: 'Độc quyền phân phối',
    origin: 'Anh Quốc',
    flag: '🇬🇧',
    badgeStyle: { bg: 'bg-neutral-100', text: 'text-neutral-800', border: 'border-neutral-300' },
    defaultOrder: 12,
    featured: false,
  },
  motorola: {
    tier: 'Phân phối chính hãng',
    origin: 'Mỹ',
    flag: '🇺🇸',
    badgeStyle: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    defaultOrder: 13,
    featured: false,
  },
};

const KNOWN_LOCAL_SVG = new Set([
  'apple',
  'asus',
  'google',
  'honor',
  'motorola',
  'nothing',
  'oneplus',
  'oppo',
  'realme',
  'samsung',
  'sony',
  'vivo',
  'xiaomi',
]);

const getBrandMeta = (slug?: string, name?: string): BrandMetadata => {
  const key = (slug || name || '').toLowerCase();
  if (BRAND_METADATA[key]) return BRAND_METADATA[key];
  for (const [k, v] of Object.entries(BRAND_METADATA)) {
    if (key.includes(k)) return v;
  }
  return {
    tier: 'Đại lý phân phối',
    origin: 'Chính hãng',
    flag: '🌐',
    badgeStyle: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    defaultOrder: 99,
    featured: false,
  };
};

export const AdminBrandsPage: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null);

  // Featured toggle map (synced with localStorage)
  const [featuredMap, setFeaturedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('admin_featured_brands');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      apple: true,
      samsung: true,
      xiaomi: true,
      oppo: true,
      vivo: true,
      realme: true,
      honor: true,
      oneplus: true,
    };
  });

  const toggleFeatured = (brand: Brand) => {
    const slug = (brand.slug || brand.name).toLowerCase();
    setFeaturedMap((prev) => {
      const next = { ...prev, [slug]: !prev[slug] };
      try {
        localStorage.setItem('admin_featured_brands', JSON.stringify(next));
      } catch (_) {}
      message.info(
        `Đã ${next[slug] ? 'đưa' : 'bỏ'} "${brand.name}" ${next[slug] ? 'vào' : 'khỏi'} danh sách nổi bật Trang chủ`,
      );
      return next;
    });
  };

  // Filters & search
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await brandService.getAllAdmin();
      setBrands(data);
    } catch (err: any) {
      console.error('Failed to load brands:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể tải danh sách thương hiệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute statistics
  const stats = useMemo(() => {
    let total = brands.length;
    let active = 0;
    let inactive = 0;
    let totalProducts = 0;

    for (const b of brands) {
      if (b.isActive) active++;
      else inactive++;
      totalProducts += b._count?.products || 0;
    }

    return { total, active, inactive, totalProducts };
  }, [brands]);

  // Filtered list
  const filteredBrands = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return brands.filter((brand) => {
      const matchesSearch =
        !keyword ||
        brand.name.toLowerCase().includes(keyword) ||
        brand.slug.toLowerCase().includes(keyword) ||
        (brand.description && brand.description.toLowerCase().includes(keyword));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && brand.isActive) ||
        (statusFilter === 'INACTIVE' && !brand.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [brands, searchKeyword, statusFilter]);

  // Handlers
  const handleOpenCreateModal = () => {
    setEditingBrand(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (brand: Brand) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (values: CreateBrandInput | UpdateBrandInput) => {
    setActionLoading(true);
    try {
      if (editingBrand) {
        await brandService.update(editingBrand.id, values);
        message.success(`Cập nhật thương hiệu "${values.name}" thành công!`);
      } else {
        await brandService.create(values as CreateBrandInput);
        message.success(`Thêm mới thương hiệu "${values.name}" thành công!`);
      }
      setIsModalOpen(false);
      setEditingBrand(null);
      await loadData();
    } catch (err: any) {
      console.error('Save brand error:', err);
      message.error(err.response?.data?.message || err.message || 'Không thể lưu thương hiệu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (brand: Brand) => {
    setToggleLoadingId(brand.id);
    try {
      if (brand.isActive) {
        await brandService.deactivate(brand.id);
        message.success(`Đã tạm ẩn thương hiệu "${brand.name}"`);
      } else {
        await brandService.activate(brand.id);
        message.success(`Đã kích hoạt thương hiệu "${brand.name}"`);
      }
      await loadData();
    } catch (err: any) {
      console.error('Toggle status error:', err);
      message.error(err.response?.data?.message || 'Không thể thay đổi trạng thái');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleDelete = async (brand: Brand) => {
    setActionLoading(true);
    try {
      await brandService.delete(brand.id);
      message.success(`Đã xóa thương hiệu "${brand.name}" thành công!`);
      await loadData();
    } catch (err: any) {
      console.error('Delete brand error:', err);
      message.error(err.response?.data?.message || 'Xóa thương hiệu thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: ColumnsType<Brand> = [
    {
      title: 'Thứ tự',
      key: 'order',
      width: 70,
      align: 'center',
      render: (_, record: Brand, index: number) => {
        const meta = getBrandMeta(record.slug, record.name);
        const orderNum = meta.defaultOrder !== 99 ? meta.defaultOrder : index + 1;
        return <span className="font-mono text-xs font-bold text-slate-400">#{orderNum}</span>;
      },
    },
    {
      title: 'Logo',
      dataIndex: 'logoUrl',
      key: 'logoUrl',
      width: 80,
      align: 'center',
      render: (logoUrl: string | undefined, record: Brand) => {
        const slug = (record.slug || record.name).toLowerCase();
        const hasLocal = KNOWN_LOCAL_SVG.has(slug);
        const primarySrc = hasLocal
          ? `/brands/${slug}.svg`
          : logoUrl || record.logo || `/brands/${slug}.svg`;

        return (
          <div className="w-12 h-9 bg-slate-50 border border-slate-200/70 rounded-lg p-1.5 flex items-center justify-center shrink-0 mx-auto">
            <img
              src={primarySrc}
              alt={record.name}
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (logoUrl && target.src !== logoUrl) {
                  target.src = logoUrl;
                } else if (!target.src.endsWith(`/brands/${slug}.svg`)) {
                  target.src = `/brands/${slug}.svg`;
                } else {
                  target.onerror = null;
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML = `<span class="text-xs font-bold text-slate-400">${record.name.slice(0, 2).toUpperCase()}</span>`;
                  }
                }
              }}
            />
          </div>
        );
      },
    },
    {
      title: 'Tên thương hiệu',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Brand) => (
        <div>
          <div className="font-bold text-slate-900 leading-tight">{name}</div>
          <span className="text-xs font-mono text-slate-400">/{record.slug}</span>
        </div>
      ),
    },
    {
      title: 'Cấp độ đối tác & Xuất xứ',
      key: 'partnership',
      width: 220,
      render: (_, record: Brand) => {
        const meta = getBrandMeta(record.slug, record.name);
        return (
          <div className="flex flex-col gap-1 items-start">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${meta.badgeStyle.bg} ${meta.badgeStyle.text} ${meta.badgeStyle.border}`}
            >
              <span>{meta.tier}</span>
              <span>{meta.flag}</span>
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>
                Xuất xứ: <strong className="font-medium text-slate-600">{meta.origin}</strong>
              </span>
              {record.websiteUrl && (
                <a
                  href={record.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-medium"
                  title={`Mở website chính thức: ${record.websiteUrl}`}
                >
                  Web ↗
                </a>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Sản phẩm',
      dataIndex: '_count',
      key: 'productsCount',
      width: 140,
      align: 'center',
      render: (count?: { products: number }, record?: Brand) => {
        const num = count?.products || 0;
        const brandTarget = record?.slug || record?.id;
        if (num === 0) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400">
              0 sản phẩm
            </span>
          );
        }
        return (
          <Link
            to={`/admin/products?brand=${brandTarget}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 transition"
            title={`Lọc tất cả sản phẩm của ${record?.name || ''}`}
          >
            <span>{num} sản phẩm</span>
            <span className="text-[11px]">↗</span>
          </Link>
        );
      },
    },
    {
      title: 'Trang chủ',
      key: 'featured',
      width: 110,
      align: 'center',
      render: (_, record: Brand) => {
        const slug = (record.slug || record.name).toLowerCase();
        const isFeatured = featuredMap[slug] ?? getBrandMeta(slug, record.name).featured;
        return (
          <Tooltip
            title={
              isFeatured
                ? 'Đang hiển thị tại thanh thương hiệu trang chủ (Click để gỡ)'
                : 'Chưa ghim trang chủ (Click để ghim)'
            }
          >
            <button
              type="button"
              onClick={() => toggleFeatured(record)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition ${
                isFeatured
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                  : 'text-slate-400 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 border border-dashed border-slate-200'
              }`}
            >
              <span>{isFeatured ? '★ Nổi bật' : '☆ Thường'}</span>
            </button>
          </Tooltip>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      align: 'center',
      render: (isActive: boolean, record: Brand) => (
        <Tooltip title={isActive ? 'Đang hoạt động' : 'Ngừng kinh doanh'}>
          <Switch
            checked={isActive}
            loading={toggleLoadingId === record.id}
            onChange={() => void handleToggleStatus(record)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'right',
      render: (_, record: Brand) => {
        const hasProducts = (record._count?.products || 0) > 0;
        return (
          <div className="inline-flex items-center gap-1 justify-end">
            <Tooltip title="Chỉnh sửa thông tin">
              <Button
                type="text"
                icon={<EditOutlined className="text-blue-600" />}
                onClick={() => handleOpenEditModal(record)}
                size="small"
                aria-label="Chỉnh sửa"
                className="hover:bg-blue-50 text-blue-600 rounded-lg p-1.5 transition"
              />
            </Tooltip>

            {hasProducts ? (
              <Tooltip title={`Không thể xóa: Có ${record._count?.products} sản phẩm liên kết`}>
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled
                  size="small"
                  aria-label="Xóa thương hiệu"
                  className="rounded-lg p-1.5 opacity-40 cursor-not-allowed"
                />
              </Tooltip>
            ) : (
              <Popconfirm
                title="Xóa thương hiệu"
                description={`Bạn có chắc chắn muốn xóa vĩnh viễn "${record.name}"?`}
                onConfirm={() => void handleDelete(record)}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true, loading: actionLoading }}
              >
                <Tooltip title="Xóa thương hiệu">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    aria-label="Xóa thương hiệu"
                    className="hover:bg-red-50 text-red-500 rounded-lg p-1.5 transition"
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            <TagsOutlined className="mr-2 text-blue-600" />
            Quản lý Thương hiệu
          </Title>
          <Text className="text-slate-500 text-sm">
            Quản trị các hãng sản xuất điện thoại thông minh, nhận diện thương hiệu và phân phối
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          size="large"
          className="bg-blue-600 hover:bg-blue-500 font-medium rounded-lg"
        >
          Thêm Thương hiệu
        </Button>
      </div>

      {/* KPI Stats */}
      <BrandStatsCards
        total={stats.total}
        active={stats.active}
        inactive={stats.inactive}
        totalProducts={stats.totalProducts}
        loading={loading}
      />

      {/* Main Table Card */}
      <Card className="rounded-xl border border-slate-200 shadow-xs">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Input
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Tìm theo tên hoặc slug..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              className="w-full sm:w-64"
            />

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-full sm:w-44"
              options={[
                { value: 'ALL', label: 'Tất cả trạng thái' },
                { value: 'ACTIVE', label: 'Đang hoạt động' },
                { value: 'INACTIVE', label: 'Ngừng kinh doanh' },
              ]}
            />
          </div>

          <Button icon={<ReloadOutlined />} onClick={() => void loadData()} loading={loading}>
            Làm mới
          </Button>
        </div>

        {/* Ant Design Table */}
        <Table<Brand>
          columns={columns}
          dataSource={filteredBrands}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} thương hiệu`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchKeyword || statusFilter !== 'ALL'
                    ? 'Không tìm thấy thương hiệu phù hợp với bộ lọc'
                    : 'Chưa có thương hiệu nào trong hệ thống'
                }
              >
                {!searchKeyword && statusFilter === 'ALL' && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
                    Tạo thương hiệu đầu tiên
                  </Button>
                )}
              </Empty>
            ),
          }}
        />
      </Card>

      {/* Form Modal */}
      <BrandFormModal
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingBrand(null);
        }}
        onSubmit={handleModalSubmit}
        loading={actionLoading}
        editingBrand={editingBrand}
      />
    </div>
  );
};

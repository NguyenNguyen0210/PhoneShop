import React, { useState } from 'react';
import {
  Row,
  Col,
  Input,
  Button,
  Divider,
  Typography,
  Tag,
  Tooltip,
  message,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { productService } from '../../../../services/productService';

const { Title, Text } = Typography;

export interface ProductSpecsTabProps {
  productId: string;
  initialSpecs?: Record<string, string>;
  onSaveSuccess?: () => void;
}

const HARDWARE_PRESETS = [
  {
    key: 'Màn hình',
    label: 'Màn hình',
    placeholder: 'VD: 6.9 inch, Super Retina XDR OLED, 120Hz',
  },
  {
    key: 'Chipset / CPU',
    label: 'Chipset / CPU',
    placeholder: 'VD: Apple A18 Pro 6 nhân / Snapdragon 8 Gen 3',
  },
  {
    key: 'Camera sau',
    label: 'Camera sau',
    placeholder: 'VD: Chính 48 MP & Phụ 48 MP, 12 MP',
  },
  {
    key: 'Camera trước',
    label: 'Camera trước',
    placeholder: 'VD: 12 MP, ƒ/1.9',
  },
  {
    key: 'Pin & Công nghệ sạc',
    label: 'Pin & Công nghệ sạc',
    placeholder: 'VD: Li-Ion 4685 mAh, Sạc nhanh 33W, MagSafe 25W',
  },
  {
    key: 'Hệ điều hành',
    label: 'Hệ điều hành',
    placeholder: 'VD: iOS 18 / Android 15',
  },
  {
    key: 'Cổng kết nối',
    label: 'Cổng kết nối',
    placeholder: 'VD: USB Type-C (USB 3.0)',
  },
];

interface CustomSpecItem {
  id: string;
  key: string;
  value: string;
}

const parseInitialState = (specs?: Record<string, string>) => {
  const presetMap: Record<string, string> = {
    'Màn hình': '',
    'Chipset / CPU': '',
    'Camera sau': '',
    'Camera trước': '',
    'Pin & Công nghệ sạc': '',
    'Hệ điều hành': '',
    'Cổng kết nối': '',
  };

  const customList: CustomSpecItem[] = [];

  if (specs) {
    for (const [k, v] of Object.entries(specs)) {
      if (k === 'Chipset / CPU' || (k === 'Chipset' && !specs['Chipset / CPU'])) {
        presetMap['Chipset / CPU'] = v || '';
      } else if (Object.prototype.hasOwnProperty.call(presetMap, k)) {
        presetMap[k] = v || '';
      } else if (k !== 'Chipset') {
        customList.push({
          id: `spec-${Math.random().toString(36).substring(2, 9)}`,
          key: k,
          value: v || '',
        });
      }
    }
  }

  return { presetMap, customList };
};

export const ProductSpecsTab: React.FC<ProductSpecsTabProps> = ({
  productId,
  initialSpecs,
  onSaveSuccess,
}) => {
  const [prevInitialSpecs, setPrevInitialSpecs] = useState(initialSpecs);
  const [presets, setPresets] = useState<Record<string, string>>(
    () => parseInitialState(initialSpecs).presetMap
  );
  const [customSpecs, setCustomSpecs] = useState<CustomSpecItem[]>(
    () => parseInitialState(initialSpecs).customList
  );
  const [saving, setSaving] = useState(false);

  // Sync state if initialSpecs changes
  if (initialSpecs !== prevInitialSpecs) {
    setPrevInitialSpecs(initialSpecs);
    const next = parseInitialState(initialSpecs);
    setPresets(next.presetMap);
    setCustomSpecs(next.customList);
  }

  const handlePresetChange = (key: string, value: string) => {
    setPresets((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddCustomSpec = () => {
    setCustomSpecs((prev) => [
      ...prev,
      {
        id: `spec-new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        key: '',
        value: '',
      },
    ]);
  };

  const handleCustomChange = (id: string, field: 'key' | 'value', value: string) => {
    setCustomSpecs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveCustomSpec = (id: string) => {
    setCustomSpecs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const specs: Record<string, string> = {};

      // 1. Presets with non-empty values
      for (const [key, value] of Object.entries(presets)) {
        if (value && typeof value === 'string' && value.trim()) {
          specs[key] = value.trim();
        }
      }

      // 2. Custom specs with valid key
      for (const item of customSpecs) {
        const trimmedKey = item.key.trim();
        const trimmedValue = item.value.trim();
        if (trimmedKey) {
          specs[trimmedKey] = trimmedValue;
        }
      }

      await productService.updateProduct(productId, { specs });
      message.success('Đã lưu thông số kỹ thuật thành công');
      onSaveSuccess?.();
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        'Có lỗi xảy ra khi lưu thông số kỹ thuật';
      message.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="product-specs-tab space-y-6">
      {/* 1. Hardware Presets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Title level={5} className="!mb-0">
              Thông số phần cứng chuẩn
            </Title>
            <Tag color="blue">Presets</Tag>
          </div>
          <Text type="secondary" className="text-xs">
            Các thông số phần cứng cơ bản của thiết bị
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          {HARDWARE_PRESETS.map((preset) => (
            <Col xs={24} sm={12} key={preset.key}>
              <div className="space-y-1">
                <label
                  htmlFor={`spec-preset-${preset.key}`}
                  className="text-xs font-semibold text-gray-700 block"
                >
                  {preset.label}
                </label>
                <Input
                  id={`spec-preset-${preset.key}`}
                  aria-label={preset.label}
                  placeholder={preset.placeholder}
                  value={presets[preset.key] || ''}
                  onChange={(e) => handlePresetChange(preset.key, e.target.value)}
                  allowClear
                />
              </div>
            </Col>
          ))}
        </Row>
      </div>

      <Divider className="my-4" />

      {/* 2. Custom Key-Values */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Title level={5} className="!mb-0">
              Thông số mở rộng (Tùy chỉnh)
            </Title>
            <Tag color="purple">Dynamic Key-Values</Tag>
          </div>
          <Text type="secondary" className="text-xs">
            Bổ sung các thông số chi tiết khác như Kháng nước, SIM, Trọng lượng...
          </Text>
        </div>

        {customSpecs.length > 0 && (
          <div className="space-y-3 mb-4">
            {customSpecs.map((item) => (
              <Row gutter={12} key={item.id} align="middle">
                <Col xs={10} sm={8}>
                  <Input
                    placeholder="Tên thông số (VD: SIM, Kháng nước)"
                    aria-label="Tên thông số"
                    value={item.key}
                    onChange={(e) => handleCustomChange(item.id, 'key', e.target.value)}
                    allowClear
                  />
                </Col>
                <Col xs={12} sm={14}>
                  <Input
                    placeholder="Giá trị chi tiết (VD: 2 eSIM, IP68)"
                    aria-label="Giá trị thông số"
                    value={item.value}
                    onChange={(e) => handleCustomChange(item.id, 'value', e.target.value)}
                    allowClear
                  />
                </Col>
                <Col xs={2} sm={2} className="text-center">
                  <Tooltip title="Xóa dòng thông số này">
                    <Button
                      danger
                      type="text"
                      icon={<DeleteOutlined />}
                      aria-label="Delete"
                      onClick={() => handleRemoveCustomSpec(item.id)}
                    />
                  </Tooltip>
                </Col>
              </Row>
            ))}
          </div>
        )}

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddCustomSpec}
          className="w-full"
        >
          + Thêm thông số khác
        </Button>
      </div>

      <Divider className="my-4" />

      {/* 3. Actions */}
      <div className="flex justify-end items-center pt-2">
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          size="large"
          className="px-6"
        >
          Lưu thông số kỹ thuật
        </Button>
      </div>
    </div>
  );
};

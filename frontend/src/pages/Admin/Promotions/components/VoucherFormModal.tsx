import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Radio,
  DatePicker,
  Button,
  Row,
  Col,
  message,
} from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { promotionService } from '../../../../services/promotionService';
import { VoucherType, type Voucher, type CreateVoucherInput } from '../../../../types';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

export interface VoucherFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  voucher?: Voucher | null;
}

export const VoucherFormModal: React.FC<VoucherFormModalProps> = ({
  open,
  onClose,
  onSuccess,
  voucher,
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(voucher);

  // Watch voucher type to show/hide maxDiscountAmount and adjust value input
  const selectedType = Form.useWatch('type', form);

  useEffect(() => {
    if (open) {
      if (voucher) {
        form.setFieldsValue({
          code: voucher.code,
          name: voucher.name,
          description: voucher.description || '',
          type: voucher.type,
          value: voucher.value,
          minOrderValue: voucher.minOrderValue,
          maxDiscountAmount: voucher.maxDiscountAmount,
          usageLimit: voucher.usageLimit,
          perUserLimit: voucher.perUserLimit ?? 1,
          dateRange: [dayjs(voucher.startAt), dayjs(voucher.endAt)],
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          type: VoucherType.PERCENTAGE,
          perUserLimit: 1,
          dateRange: [dayjs(), dayjs().add(7, 'day')],
        });
      }
    }
  }, [open, voucher, form]);

  const handleGenerateRandomCode = () => {
    const prefixes = ['FLASH', 'PANDA', 'TECH', 'SALE', 'SUPER', 'VIP', 'WELCOME'];
    const suffixes = ['10', '20', '30', '50K', '80K', '100K', '500K'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    form.setFieldsValue({ code: `${prefix}${suffix}` });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const [startAt, endAt] = values.dateRange;

      const payload: CreateVoucherInput = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        type: values.type,
        value: Number(values.value),
        minOrderValue: values.minOrderValue != null ? Number(values.minOrderValue) : undefined,
        maxDiscountAmount:
          values.type === VoucherType.PERCENTAGE && values.maxDiscountAmount != null
            ? Number(values.maxDiscountAmount)
            : undefined,
        usageLimit: values.usageLimit != null ? Number(values.usageLimit) : undefined,
        perUserLimit: values.perUserLimit != null ? Number(values.perUserLimit) : undefined,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      };

      if (voucher) {
        await promotionService.updateVoucher(voucher.id, payload);
        message.success('Cập nhật mã giảm giá thành công!');
      } else {
        await promotionService.createVoucher(payload);
        message.success('Tạo mã giảm giá mới thành công!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      const msg = error?.response?.data?.message || 'Có lỗi xảy ra khi lưu mã giảm giá';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo mã'}
      cancelText="Hủy bỏ"
      width={680}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" initialValues={{ type: VoucherType.PERCENTAGE }}>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="code"
              label="Mã giảm giá (Code)"
              rules={[
                { required: true, message: 'Vui lòng nhập mã voucher' },
                { pattern: /^[A-Za-z0-9_-]+$/, message: 'Mã chỉ gồm chữ cái, số và dấu gạch' },
              ]}
            >
              <Input
                placeholder="VD: PANDA50K"
                style={{ textTransform: 'uppercase' }}
                disabled={isEdit}
              />
            </Form.Item>
          </Col>
          <Col span={8} style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 24 }}>
            {!isEdit && (
              <Button
                type="dashed"
                icon={<ThunderboltOutlined />}
                onClick={handleGenerateRandomCode}
                style={{ width: '100%' }}
              >
                ⚡ Tạo mã ngẫu nhiên
              </Button>
            )}
          </Col>
        </Row>

        <Form.Item
          name="name"
          label="Tên chương trình / Tên voucher"
          rules={[{ required: true, message: 'Vui lòng nhập tên voucher' }]}
        >
          <Input placeholder="VD: Giảm 50K cho đơn từ 500K mừng Panda Day" />
        </Form.Item>

        <Form.Item name="description" label="Mô tả">
          <TextArea rows={2} placeholder="Chi tiết điều kiện áp dụng voucher..." />
        </Form.Item>

        <Form.Item
          name="type"
          label="Loại giảm giá"
          rules={[{ required: true, message: 'Vui lòng chọn loại voucher' }]}
        >
          <Radio.Group buttonStyle="solid">
            <Radio.Button value={VoucherType.PERCENTAGE}>Phần trăm (%)</Radio.Button>
            <Radio.Button value={VoucherType.FIXED_AMOUNT}>Số tiền cố định (₫)</Radio.Button>
            <Radio.Button value={VoucherType.FREE_SHIPPING}>Miễn phí vận chuyển</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="value"
              label={
                selectedType === VoucherType.PERCENTAGE
                  ? 'Mức giảm (%)'
                  : selectedType === VoucherType.FREE_SHIPPING
                    ? 'Mức hỗ trợ ship (₫, nhập 0 nếu freeship 100%)'
                    : 'Số tiền giảm (₫)'
              }
              rules={[
                { required: true, message: 'Vui lòng nhập mức giảm' },
                selectedType === VoucherType.PERCENTAGE
                  ? {
                      type: 'number',
                      min: 1,
                      max: 100,
                      message: 'Phần trăm phải từ 1 đến 100',
                    }
                  : { type: 'number', min: 0, message: 'Giá trị phải >= 0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={selectedType === VoucherType.PERCENTAGE ? 1 : 0}
                max={selectedType === VoucherType.PERCENTAGE ? 100 : undefined}
                addonAfter={selectedType === VoucherType.PERCENTAGE ? '%' : '₫'}
                formatter={
                  selectedType === VoucherType.PERCENTAGE
                    ? undefined
                    : (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
                parser={
                  selectedType === VoucherType.PERCENTAGE
                    ? undefined
                    : ((val: string | undefined) => Number((val ?? '').replace(/\$\s?|(,*)/g, ''))) as any
                }
              />
            </Form.Item>
          </Col>

          {selectedType === VoucherType.PERCENTAGE && (
            <Col span={12}>
              <Form.Item
                name="maxDiscountAmount"
                label="Giảm tối đa (₫)"
                tooltip="Bỏ trống nếu không giới hạn số tiền giảm tối đa"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  addonAfter="₫"
                  placeholder="Không giới hạn"
                  formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                  parser={((val: string | undefined) => Number((val ?? '').replace(/\$\s?|(,*)/g, ''))) as any}
                />
              </Form.Item>
            </Col>
          )}

          <Col span={selectedType === VoucherType.PERCENTAGE ? 24 : 12}>
            <Form.Item name="minOrderValue" label="Đơn hàng tối thiểu (₫)">
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                addonAfter="₫"
                placeholder="VD: 200,000"
                formatter={(val) => (val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                parser={((val: string | undefined) => Number((val ?? '').replace(/\$\s?|(,*)/g, ''))) as any}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="usageLimit"
              label="Tổng lượt sử dụng toàn sàn"
              tooltip="Bỏ trống nếu không giới hạn"
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="Không giới hạn" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="perUserLimit"
              label="Giới hạn mỗi khách hàng"
              tooltip="Số lần tối đa một người dùng có thể áp dụng mã"
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="VD: 1" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="dateRange"
          label="Thời gian áp dụng"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc' }]}
        >
          <RangePicker
            showTime={{ format: 'HH:mm:ss' }}
            format="YYYY-MM-DD HH:mm:ss"
            style={{ width: '100%' }}
            placeholder={['Bắt đầu lúc', 'Kết thúc lúc']}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

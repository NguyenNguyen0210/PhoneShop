import React, { useState } from 'react';
import { Upload, message, Image, Button, Progress, Space } from 'antd';
import { InboxOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { storageService } from '../../services/storageService';

const { Dragger } = Upload;

interface ImageUploadDraggerProps {
  folder?: 'products' | 'brands' | 'categories';
  value?: string;
  onChange?: (url: string) => void;
  maxSizeMB?: number;
}

export const ImageUploadDragger: React.FC<ImageUploadDraggerProps> = ({
  folder = 'products',
  value,
  onChange,
  maxSizeMB = 5,
}) => {
  const [loading, setLoading] = useState(false);
  const [percent, setPercent] = useState<number>(0);
  const [previewVisible, setPreviewVisible] = useState(false);

  const customUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    const rawFile = file as File;

    if (!rawFile.type.startsWith('image/')) {
      message.error('Chỉ được phép tải lên file hình ảnh (PNG, JPG, WEBP)!');
      onError?.(new Error('Invalid file type'));
      return;
    }

    if (rawFile.size / 1024 / 1024 > maxSizeMB) {
      message.error(`Kích thước ảnh không được vượt quá ${maxSizeMB}MB!`);
      onError?.(new Error('File too large'));
      return;
    }

    setLoading(true);
    setPercent(0);

    try {
      const result = await storageService.uploadSingle(rawFile, folder, (p) => {
        setPercent(p);
      });
      message.success('Tải ảnh và tối ưu WebP thành công!');
      onChange?.(result.url);
      onSuccess?.(result);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Tải ảnh thất bại. Vui lòng thử lại!');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div className="w-full">
      {value ? (
        <div className="relative group border border-slate-200 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={value}
              alt="Thumbnail"
              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
              preview={{ visible: previewVisible, onVisibleChange: setPreviewVisible }}
            />
            <div className="max-w-xs truncate">
              <p className="text-xs text-slate-500 font-medium truncate">{value}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded font-semibold">
                Supabase CDN (WebP)
              </span>
            </div>
          </div>
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setPreviewVisible(true)}
            >
              Xem
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
            >
              Đổi ảnh
            </Button>
          </Space>
        </div>
      ) : (
        <Dragger
          name="file"
          multiple={false}
          showUploadList={false}
          customRequest={customUpload}
          className="rounded-xl border-dashed border-2 border-slate-300 hover:border-blue-500 bg-slate-50 transition-colors"
        >
          <p className="ant-upload-drag-icon text-blue-500 text-4xl mb-2">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text font-semibold text-slate-800 text-sm">
            Kéo thả hoặc nhấp để tải ảnh lên
          </p>
          <p className="ant-upload-hint text-xs text-slate-400">
            Hỗ trợ PNG, JPG, WEBP (Tối đa {maxSizeMB}MB). Tự động nén sang định dạng WebP siêu nhẹ.
          </p>
          {loading && (
            <div className="mt-3 px-6">
              <Progress percent={percent} size="small" status="active" />
              <p className="text-xs text-blue-600 mt-1">Đang tối ưu & đẩy lên Supabase Storage...</p>
            </div>
          )}
        </Dragger>
      )}
    </div>
  );
};

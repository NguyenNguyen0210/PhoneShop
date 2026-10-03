import React from 'react';
import { Modal } from 'antd';

export interface ProductSpecsModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  specs?: Record<string, string>;
}

export const ProductSpecsModal: React.FC<ProductSpecsModalProps> = ({
  open,
  onClose,
  productName,
  specs,
}) => {
  const specEntries = specs ? Object.entries(specs) : [];
  const hasSpecs = specEntries.length > 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={650}
      centered
      title={
        <span className="text-base font-bold text-slate-900">
          Thông số kỹ thuật chi tiết: {productName}
        </span>
      }
      footer={
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="py-2">
        {hasSpecs ? (
          <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm border-collapse">
              <tbody>
                {specEntries.map(([key, value]) => (
                  <tr
                    key={key}
                    className="border-b border-slate-100 last:border-b-0 even:bg-slate-50"
                  >
                    <td className="w-[40%] py-3 px-4 text-slate-500 font-medium align-top">
                      {key}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-semibold font-mono align-top break-words">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">
            <p className="text-sm">Chưa có thông số kỹ thuật chi tiết cho sản phẩm này.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductSpecsModal;

import React from 'react';
import { Modal } from 'antd';
import { Cpu, X } from 'lucide-react';

interface ProductSpecsModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  specs?: Record<string, string>;
}

export const ProductSpecsModal: React.FC<ProductSpecsModalProps> = ({
  open,
  onClose,
  productName,
  specs = {},
}) => {
  const entries = Object.entries(specs || {});

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={680}
      centered
      title={null}
      closeIcon={null}
    >
      <div className="space-y-4 pt-1">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Bảng thông số kỹ thuật chi tiết
              </h3>
              <p className="text-xs text-slate-500 font-mono">{productName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Specifications Table */}
        {entries.length > 0 ? (
          <div className="border border-slate-200/80 rounded-xl overflow-hidden max-h-[60vh] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <tbody>
                {entries.map(([key, val], idx) => (
                  <tr
                    key={key}
                    className={`border-b border-slate-100 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-600 w-2/5 border-r border-slate-100">
                      {key}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500 text-xs">
            Chưa có thông số kỹ thuật chi tiết cho sản phẩm này.
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Đóng bảng thông số
          </button>
        </div>
      </div>
    </Modal>
  );
};

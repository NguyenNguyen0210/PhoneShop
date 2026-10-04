import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Star, Trash2, Home, Building2, Loader2 } from 'lucide-react';
import { addressService } from '../../../../services/addressService';
import { notifyError, notifySuccess } from '../../../../utils/notify';
import { AddressCreateModal } from './AddressCreateModal';
import type { Address } from '../../../../types';

export interface AddressesTabProps {
  onAddressesLoaded?: (count: number) => void;
}

export const AddressesTab: React.FC<AddressesTabProps> = ({ onAddressesLoaded }) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAddresses = async () => {
    setLoading(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      onAddressesLoaded?.(data.length);
    } catch (err: any) {
      notifyError(err, 'Không thể tải danh sách địa chỉ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSetDefault = async (id: string) => {
    setActionLoadingId(id);
    try {
      await addressService.setDefaultAddress(id);
      await fetchAddresses();
      notifySuccess('Đã đặt địa chỉ mặc định.');
    } catch (err: any) {
      notifyError(err, 'Không thể đặt địa chỉ mặc định.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    setActionLoadingId(id);
    try {
      await addressService.deleteAddress(id);
      await fetchAddresses();
      notifySuccess('Đã xóa địa chỉ.');
    } catch (err: any) {
      notifyError(err, 'Không thể xóa địa chỉ.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span>Sổ địa chỉ nhận hàng</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quản lý danh sách địa chỉ nhận hàng giúp đặt hàng nhanh chóng và thuận tiện
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Đang tải sổ địa chỉ...</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="py-16 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold">
            📍
          </div>
          <h3 className="text-base font-bold text-slate-800">Chưa có địa chỉ giao hàng nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Thêm địa chỉ nhận hàng đầu tiên để tiết kiệm thời gian khi thanh toán các đơn hàng sắp tới.
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer mt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm địa chỉ nhận hàng</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {addresses.map((addr) => {
            const isProcessing = actionLoadingId === addr.id;
            const fullAddress = [addr.addressLine1, addr.ward, addr.district, addr.city]
              .filter(Boolean)
              .join(', ');

            return (
              <div
                key={addr.id}
                className={`p-5 rounded-3xl border transition ${
                  addr.isDefault
                    ? 'border-blue-300 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm sm:text-base">
                        {addr.recipientName}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600 font-mono text-xs sm:text-sm font-semibold">
                        {addr.phone}
                      </span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-md shadow-2xs">
                          <Star className="w-3 h-3 fill-current" />
                          <span>Mặc định</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                        {addr.type === 'OFFICE' || (addr.type as string) === 'WORK' ? (
                          <>
                            <Building2 className="w-3 h-3 text-slate-500" />
                            <span>Văn phòng</span>
                          </>
                        ) : (
                          <>
                            <Home className="w-3 h-3 text-slate-500" />
                            <span>Nhà riêng</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                      {fullAddress}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    {!addr.isDefault && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleSetDefault(addr.id)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                      >
                        Đặt làm mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDelete(addr.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                      title="Xóa địa chỉ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AddressCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => fetchAddresses()}
      />
    </div>
  );
};

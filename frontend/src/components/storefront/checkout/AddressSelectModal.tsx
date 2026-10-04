import React, { useEffect, useState, useCallback } from 'react';
import {
  MapPin,
  Plus,
  Check,
  X,
  Loader2,
  Home,
  Building2,
} from 'lucide-react';
import type { Address, CreateAddressPayload } from '../../../types';
import { addressService } from '../../../services/addressService';
import { notifyError } from '../../../utils/notify';

export interface AddressSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAddressId?: string;
  onSelectAddress: (address: Address) => void;
}

export const AddressSelectModal: React.FC<AddressSelectModalProps> = ({
  isOpen,
  onClose,
  selectedAddressId,
  onSelectAddress,
}) => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(selectedAddressId);

  // Toggle inline create form
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form field state
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Hồ Chí Minh');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressType, setAddressType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [isDefault, setIsDefault] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setRecipientName('');
    setPhone('');
    setCity('Hồ Chí Minh');
    setDistrict('');
    setWard('');
    setAddressLine1('');
    setAddressType('HOME');
    setIsDefault(false);
    setFieldErrors({});
  }, []);

  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      // Auto-select match or default
      if (selectedAddressId && data.some((a) => a.id === selectedAddressId)) {
        setActiveId(selectedAddressId);
      } else {
        const defaultAddr = data.find((a) => a.isDefault) || data[0];
        if (defaultAddr) {
          setActiveId(defaultAddr.id);
        }
      }
    } catch (err) {
      notifyError(err, 'Không thể tải danh sách địa chỉ. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAddressId]);

  useEffect(() => {
    if (isOpen) {
      loadAddresses();
      setIsAddingNew(false);
      resetForm();
    }
  }, [isOpen, loadAddresses, resetForm]);

  useEffect(() => {
    if (selectedAddressId) {
      setActiveId(selectedAddressId);
    }
  }, [selectedAddressId]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!recipientName.trim()) {
      errors.recipientName = 'Họ và tên người nhận không được để trống';
    }
    if (!phone.trim()) {
      errors.phone = 'Số điện thoại không được để trống';
    } else if (!/^0[3|5|7|8|9][0-9]{8}$/.test(phone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';
    }
    if (!city.trim()) {
      errors.city = 'Tỉnh / Thành phố không được để trống';
    }
    if (!addressLine1.trim()) {
      errors.addressLine1 = 'Địa chỉ cụ thể không được để trống';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const payload: CreateAddressPayload = {
      recipientName: recipientName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      district: district.trim() || undefined,
      ward: ward.trim() || undefined,
      addressLine1: addressLine1.trim(),
      type: addressType,
      isDefault: isDefault || addresses.length === 0,
    };

    try {
      const created = await addressService.createAddress(payload);
      setAddresses((prev) => {
        if (created.isDefault) {
          return [created, ...prev.map((a) => ({ ...a, isDefault: false }))];
        }
        return [created, ...prev];
      });
      setActiveId(created.id);
      onSelectAddress(created);
      setIsAddingNew(false);
      resetForm();
      onClose();
    } catch (err: any) {
      notifyError(err, 'Có lỗi xảy ra khi tạo địa chỉ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSelection = () => {
    const selected = addresses.find((a) => a.id === activeId);
    if (selected) {
      onSelectAddress(selected);
      onClose();
    }
  };

  const formatAddressText = (addr: Address) => {
    const parts = [
      addr.addressLine1,
      addr.addressLine2,
      addr.ward,
      addr.district,
      addr.city,
    ].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 id="address-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                {isAddingNew ? 'Thêm địa chỉ giao hàng mới' : 'Địa chỉ nhận hàng'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAddingNew
                  ? 'Nhập thông tin giao nhận để hoàn tất đơn hàng'
                  : 'Chọn địa chỉ giao hàng phù hợp hoặc tạo địa chỉ mới'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm text-slate-500 font-medium">Đang tải danh sách địa chỉ...</p>
            </div>
          ) : isAddingNew ? (
            /* Inline Create Address Form */
            <form onSubmit={handleCreateAddress} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên người nhận <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.recipientName
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.recipientName && (
                    <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.recipientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.phone
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.phone}</p>
                  )}
                </div>
              </div>

              {/* Address Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Loại địa chỉ
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAddressType('HOME')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      addressType === 'HOME'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Nhà riêng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddressType('WORK')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      addressType === 'WORK'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Văn phòng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddressType('OTHER')}
                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      addressType === 'OTHER'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Khác</span>
                  </button>
                </div>
              </div>

              {/* City, District, Ward */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tỉnh / TP <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="VD: Hồ Chí Minh"
                    className={`w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition ${
                      fieldErrors.city
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
                    }`}
                  />
                  {fieldErrors.city && (
                    <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quận / Huyện
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="VD: Quận 1"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phường / Xã
                  </label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="VD: P. Bến Nghé"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Detailed Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ cụ thể (Số nhà, tên đường...) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="VD: 123 Nguyễn Huệ, Tòa nhà Bitexco"
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:bg-white transition ${
                    fieldErrors.addressLine1
                      ? 'border-rose-400 focus:ring-rose-200'
                      : 'border-slate-200 focus:ring-blue-200 focus:border-blue-500'
                  }`}
                />
                {fieldErrors.addressLine1 && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.addressLine1}</p>
                )}
              </div>

              {/* Default Address Checkbox */}
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-xs font-medium text-slate-700">
                  Đặt làm địa chỉ giao hàng mặc định
                </span>
              </label>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Lưu và chọn địa chỉ này</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Address List */
            <div className="space-y-3">
              {addresses.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Chưa có địa chỉ giao hàng nào</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vui lòng thêm địa chỉ nhận hàng để tiếp tục thanh toán.
                    </p>
                  </div>
                </div>
              ) : (
                addresses.map((addr) => {
                  const isSelected = activeId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setActiveId(addr.id)}
                      className={`relative p-4 rounded-2xl border transition cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {/* Radio indicator */}
                      <div className="pt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center transition ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {addr.recipientName}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">|</span>
                          <span className="text-xs text-slate-600 font-medium">{addr.phone}</span>

                          {/* Address Type Badge */}
                          {addr.type === 'HOME' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Home className="w-3 h-3 text-slate-500" />
                              Nhà riêng
                            </span>
                          )}
                          {addr.type === 'WORK' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              Văn phòng
                            </span>
                          )}

                          {/* Default Badge */}
                          {addr.isDefault && (
                            <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-md">
                              Mặc định
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {formatAddressText(addr)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add New Address Button */}
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAddingNew(true);
                }}
                className="w-full py-3 px-4 border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/40 text-slate-700 hover:text-blue-600 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm địa chỉ mới</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer (only visible when not in create mode) */}
        {!isAddingNew && (
          <div className="shrink-0 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={!activeId || addresses.length === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Xác nhận địa chỉ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddressSelectModal;

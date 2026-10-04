import React, { useState, useEffect } from 'react';
import { X, MapPin, Loader2, Save, Home, Building2 } from 'lucide-react';
import { addressService } from '../../../../services/addressService';
import { notifyError } from '../../../../utils/notify';
import type { Address } from '../../../../types';

export interface AddressCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newAddress: Address) => void;
}

export const AddressCreateModal: React.FC<AddressCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [type, setType] = useState<'HOME' | 'OFFICE'>('HOME');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRecipientName('');
      setPhone('');
      setCity('');
      setDistrict('');
      setWard('');
      setAddressLine1('');
      setType('HOME');
      setIsDefault(false);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = recipientName.trim();
    const trimmedPhone = phone.trim();
    const trimmedCity = city.trim();
    const trimmedAddress = addressLine1.trim();

    if (!trimmedName) {
      notifyError('Vui lòng nhập họ và tên người nhận.');
      return;
    }

    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      notifyError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam 10 chữ số.');
      return;
    }

    if (!trimmedCity) {
      notifyError('Vui lòng nhập Tỉnh / Thành phố.');
      return;
    }

    if (!trimmedAddress) {
      notifyError('Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường).');
      return;
    }

    setLoading(true);
    try {
      const created = await addressService.createAddress({
        recipientName: trimmedName,
        phone: trimmedPhone,
        city: trimmedCity,
        district: district.trim() || undefined,
        ward: ward.trim() || undefined,
        addressLine1: trimmedAddress,
        type,
        isDefault,
      });

      onSuccess(created);
      onClose();
    } catch (err: any) {
      notifyError(err, 'Thêm địa chỉ thất bại. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thêm địa chỉ nhận hàng</h3>
              <p className="text-xs text-slate-500">Lưu thông tin giao hàng cho các đơn hàng kế tiếp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="addr-name" className="block text-xs font-semibold text-slate-700">
                Họ và tên người nhận *
              </label>
              <input
                id="addr-name"
                type="text"
                disabled={loading}
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="addr-phone" className="block text-xs font-semibold text-slate-700">
                Số điện thoại *
              </label>
              <input
                id="addr-phone"
                type="tel"
                disabled={loading}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-city" className="block text-xs font-semibold text-slate-700">
              Tỉnh / Thành phố *
            </label>
            <input
              id="addr-city"
              type="text"
              disabled={loading}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="TP. Hồ Chí Minh / Hà Nội..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="addr-district" className="block text-xs font-semibold text-slate-700">
                Quận / Huyện
              </label>
              <input
                id="addr-district"
                type="text"
                disabled={loading}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Quận 1, Cầu Giấy..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="addr-ward" className="block text-xs font-semibold text-slate-700">
                Phường / Xã
              </label>
              <input
                id="addr-ward"
                type="text"
                disabled={loading}
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="Phường Bến Nghé..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="addr-street" className="block text-xs font-semibold text-slate-700">
              Địa chỉ chi tiết (Số nhà, tên đường, tòa nhà) *
            </label>
            <input
              id="addr-street"
              type="text"
              disabled={loading}
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Số 123 Đường Nguyễn Huệ..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <span className="text-xs font-semibold text-slate-700">Loại địa chỉ:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setType('HOME')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  type === 'HOME'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Nhà riêng</span>
              </button>
              <button
                type="button"
                onClick={() => setType('OFFICE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  type === 'OFFICE'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Văn phòng</span>
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-700">Đặt làm địa chỉ giao hàng mặc định</span>
          </label>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu địa chỉ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

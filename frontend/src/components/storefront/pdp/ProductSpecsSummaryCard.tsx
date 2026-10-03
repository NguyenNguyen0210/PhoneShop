import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export interface ProductSpecsSummaryCardProps {
  specs?: Record<string, string>;
  onOpenFullSpecs: () => void;
  className?: string;
}

function findSpec(
  specs: Record<string, string> | undefined,
  keys: string[],
  fallbackKeyPhrases: string[]
): string | undefined {
  if (!specs) return undefined;
  for (const k of keys) {
    if (specs[k]) return specs[k];
    const match = Object.keys(specs).find(
      (specKey) => specKey.trim().toLowerCase() === k.toLowerCase()
    );
    if (match && specs[match]) return specs[match];
  }
  for (const phrase of fallbackKeyPhrases) {
    const match = Object.keys(specs).find((specKey) =>
      specKey.toLowerCase().includes(phrase.toLowerCase())
    );
    if (match && specs[match]) return specs[match];
  }
  return undefined;
}

export const ProductSpecsSummaryCard: React.FC<ProductSpecsSummaryCardProps> = ({
  specs,
  onOpenFullSpecs,
  className = '',
}) => {
  const screenValue =
    findSpec(
      specs,
      ['Màn hình', 'Công nghệ màn hình', 'Màn hình rộng', 'Kích thước màn hình'],
      ['màn hình', 'screen', 'display']
    ) || 'OLED / AMOLED sắc nét';

  const cpuValue =
    findSpec(
      specs,
      ['Vi xử lý', 'Chipset', 'CPU', 'Chip xử lý', 'Chip'],
      ['chipset', 'cpu', 'vi xử lý', 'chip']
    ) || 'Vi xử lý hiệu năng cao';

  const ramValue = findSpec(specs, ['RAM', 'Dung lượng RAM'], ['ram']);
  const romValue = findSpec(specs, ['ROM', 'Bộ nhớ trong', 'Bộ nhớ'], ['rom', 'bộ nhớ']);
  const ramRomCombined = findSpec(
    specs,
    ['Dung lượng RAM / Bộ nhớ', 'RAM / Bộ nhớ', 'Bộ nhớ & Lưu trữ'],
    ['ram /', 'bộ nhớ']
  );
  const memoryValue =
    ramRomCombined ||
    (ramValue && romValue ? `${ramValue} / ${romValue}` : ramValue || romValue) ||
    'Đa nhiệm mượt mà, lưu trữ lớn';

  const cameraRear = findSpec(
    specs,
    ['Camera sau', 'Camera chính', 'Hệ thống camera sau'],
    ['camera sau', 'sau']
  );
  const cameraFront = findSpec(
    specs,
    ['Camera trước', 'Camera selfie'],
    ['camera trước', 'selfie', 'trước']
  );
  const cameraGeneral = findSpec(
    specs,
    ['Camera sau / trước', 'Camera', 'Hệ thống camera'],
    ['camera']
  );
  const cameraValue =
    cameraGeneral ||
    (cameraRear && cameraFront ? `${cameraRear} / Selfie: ${cameraFront}` : cameraRear || cameraFront) ||
    'Quay chụp sắc nét, chống rung OIS';

  const battery = findSpec(specs, ['Pin', 'Dung lượng pin'], ['pin', 'dung lượng pin', 'battery']);
  const charging = findSpec(specs, ['Sạc', 'Công nghệ sạc', 'Cổng sạc'], ['sạc', 'charging']);
  const batteryAndCharge = findSpec(
    specs,
    ['Pin & Công nghệ sạc', 'Pin & Sạc', 'Pin, Sạc'],
    ['pin &', 'pin và']
  );
  const powerValue =
    batteryAndCharge ||
    (battery && charging ? `${battery}, ${charging}` : battery || charging) ||
    'Pin dung lượng cao, sạc nhanh';

  const coreSpecs = [
    { label: 'Màn hình', value: screenValue },
    { label: 'Vi xử lý', value: cpuValue },
    { label: 'Dung lượng RAM / Bộ nhớ', value: memoryValue },
    { label: 'Camera sau / trước', value: cameraValue },
    { label: 'Pin & Công nghệ sạc', value: powerValue },
  ];

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5 ${className}`.trim()}
      style={{ boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)' }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-base font-bold text-slate-900">Thông số kỹ thuật tóm tắt</h3>
        <span className="text-[11px] font-mono text-slate-400">Tiêu chuẩn hãng</span>
      </div>

      {/* Summary table with 5 core specifications */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80">
        <table className="w-full text-xs text-left border-collapse">
          <tbody>
            {coreSpecs.map((item) => (
              <tr
                key={item.label}
                className="border-b border-slate-100 last:border-b-0 even:bg-slate-50 transition-colors"
              >
                <td className="w-2/5 py-2.5 px-3.5 text-slate-500 font-medium align-middle">
                  {item.label}
                </td>
                <td className="w-3/5 py-2.5 px-3.5 text-slate-900 font-semibold align-middle">
                  {item.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View full specs button */}
      <button
        type="button"
        onClick={onOpenFullSpecs}
        className="w-full py-2.5 px-4 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs rounded-xl transition cursor-pointer text-center"
      >
        Xem cấu hình chi tiết ➔
      </button>

      {/* Bottom trust block */}
      <div className="pt-4 border-t border-slate-100 space-y-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
          <span>🛡️ An tâm mua sắm tại PhoneShop</span>
        </div>
        <ul className="space-y-2 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Hàng mới 100% nguyên seal hộp, kiểm tra máy trước khi thanh toán</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Giữ máy 15 phút tại bước thanh toán – Yên tâm không lo mất suất</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>Kích hoạt bảo hành điện tử chính hãng 12 tháng theo số IMEI</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            <span>1 đổi 1 trong 30 ngày nếu phát sinh lỗi từ nhà sản xuất</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ProductSpecsSummaryCard;

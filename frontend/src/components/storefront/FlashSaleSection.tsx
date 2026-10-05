import React, { useState, useEffect } from 'react';
import { Zap, Clock } from 'lucide-react';
import type { FlashSaleCampaign } from '../../types';
import { FlashSaleProductCard } from './FlashSaleProductCard';

interface FlashSaleSectionProps {
  campaign: FlashSaleCampaign | null;
}

export const FlashSaleSection: React.FC<FlashSaleSectionProps> = ({ campaign }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });

  useEffect(() => {
    if (!campaign || !campaign.endAt) return;

    const calculateTimeLeft = () => {
      const difference = new Date(campaign.endAt).getTime() - Date.now();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds, totalMs: difference };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [campaign?.endAt]);

  if (!campaign || !campaign.items || campaign.items.length === 0) {
    return null;
  }

  // If campaign has expired and totalMs is 0 after checking
  const endTime = new Date(campaign.endAt).getTime();
  if (endTime <= Date.now()) {
    return null;
  }

  const padZero = (num: number) => num.toString().padStart(2, '0');

  // Fallback thân thiện nếu DB còn sót mô tả kỹ thuật cũ chứa từ "variant"
  const friendlyDescription = (() => {
    const raw = (campaign.description || '').trim();
    if (!raw) return 'Săn deal công nghệ chớp nhoáng — 8 dòng điện thoại giảm sâu nhất tuần';
    if (/variant/i.test(raw)) return 'Săn deal công nghệ chớp nhoáng — 8 dòng điện thoại giảm sâu nhất tuần';
    return raw;
  })();

  // Lưới 4 cột x 2 hàng: luôn lấp đầy, không hẫng góc phải
  const visibleItems = (campaign.items || []).slice(0, 8);

  const TimeBox: React.FC<{ value: string; label?: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center gap-0.5">
      <div className="min-w-8 px-1.5 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 tabular-nums">
        {value}
      </div>
      {label && (
        <span className="text-[9px] font-semibold uppercase tracking-wider text-rose-100/80 leading-none">
          {label}
        </span>
      )}
    </div>
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl overflow-hidden bg-white border border-red-100 shadow-xl relative">
        {/* Header giữ dải màu rực rỡ để gây chú ý */}
        <div className="relative bg-gradient-to-r from-red-600 to-rose-700 p-4 sm:p-6 overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-rose-900/30 rounded-full blur-3xl pointer-events-none" />

          {/* Header Bar: Title, Badge & Countdown Timer */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md text-amber-300 shadow-inner">
                  <Zap className="w-5 h-5 fill-amber-300" />
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                  <span>⚡ {campaign.name || 'FLASH SALE GIÁ SỐC'}</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-rose-100 font-medium pl-8">
                {friendlyDescription}
              </p>
            </div>

            {/* Countdown Clock — hiển thị NGÀY khi >24h, tránh số giờ phi logic kiểu 107 */}
            <div
              className="flex items-center gap-3 bg-black/25 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 w-fit"
              role="timer"
              aria-live="off"
              aria-label={
                timeLeft.days > 0
                  ? `Kết thúc sau ${timeLeft.days} ngày ${timeLeft.hours} giờ ${timeLeft.minutes} phút`
                  : `Kết thúc sau ${timeLeft.hours} giờ ${timeLeft.minutes} phút ${timeLeft.seconds} giây`
              }
            >
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>KẾT THÚC TRONG</span>
              </div>

              <div className="flex items-start gap-1 text-white font-mono font-black text-sm sm:text-base">
                {timeLeft.days > 0 && (
                  <>
                    <TimeBox value={padZero(timeLeft.days)} label="Ngày" />
                    <span className="text-amber-300 font-bold pt-1.5">:</span>
                  </>
                )}
                <TimeBox value={padZero(timeLeft.hours)} label={timeLeft.days > 0 ? 'Giờ' : undefined} />
                <span className="text-amber-300 font-bold pt-1.5">:</span>
                <TimeBox value={padZero(timeLeft.minutes)} />
                <span className="text-amber-300 font-bold pt-1.5">:</span>
                <div className="min-w-8 px-1.5 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 tabular-nums text-rose-300">
                  {padZero(timeLeft.seconds)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thân dịu mắt: nền đỏ nhạt chuyển sang trắng để card trắng nổi bật */}
        <div className="relative z-10 p-4 sm:p-6 bg-gradient-to-b from-red-50/80 via-red-50/40 to-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            {visibleItems.map((item) => (
              <FlashSaleProductCard key={item.id} item={item} />
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] sm:text-xs font-medium text-red-800/60">
            🔥 {visibleItems.length} deal hot nhất tuần — hết giờ là về giá gốc
          </p>
        </div>
      </div>
    </section>
  );
};

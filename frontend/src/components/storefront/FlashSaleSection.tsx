import React, { useState, useEffect } from 'react';
import { Zap, Clock } from 'lucide-react';
import type { FlashSaleCampaign } from '../../types';
import { FlashSaleProductCard } from './FlashSaleProductCard';

interface FlashSaleSectionProps {
  campaign: FlashSaleCampaign | null;
}

export const FlashSaleSection: React.FC<FlashSaleSectionProps> = ({ campaign }) => {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  }>({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });

  useEffect(() => {
    if (!campaign || !campaign.endAt) return;

    const calculateTimeLeft = () => {
      const difference = new Date(campaign.endAt).getTime() - Date.now();
      if (difference <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      return { hours, minutes, seconds, totalMs: difference };
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

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 sm:p-6 lg:p-8 shadow-xl relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-rose-900/30 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar: Title, Badge & Countdown Timer */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/20">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-white/20 backdrop-blur-md text-amber-300 shadow-inner">
                <Zap className="w-5 h-5 fill-amber-300" />
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                <span>⚡ {campaign.name || 'FLASH SALE GIÁ SỐC'}</span>
              </h2>
            </div>
            {campaign.description && (
              <p className="text-xs sm:text-sm text-rose-100 font-medium pl-8">
                {campaign.description}
              </p>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-3 bg-black/25 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 w-fit">
            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>KẾT THÚC TRONG</span>
            </div>

            <div className="flex items-center gap-1 text-white font-mono font-black text-sm sm:text-base">
              <div className="w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 shadow-xs">
                {padZero(timeLeft.hours)}
              </div>
              <span className="text-amber-300 font-bold">:</span>
              <div className="w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 shadow-xs">
                {padZero(timeLeft.minutes)}
              </div>
              <span className="text-amber-300 font-bold">:</span>
              <div className="w-8 h-8 rounded-lg bg-black/60 flex items-center justify-center border border-white/10 shadow-xs text-rose-400">
                {padZero(timeLeft.seconds)}
              </div>
            </div>
          </div>
        </div>

        {/* Product Cards Container (Responsive Grid / Scroll) */}
        <div className="relative z-10 pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
            {campaign.items.map((item) => (
              <FlashSaleProductCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

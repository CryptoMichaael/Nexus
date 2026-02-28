import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';

interface LiveCounterProps {
  initialValue: bigint;
  dailyRate: number; // 0.003 for 0.3%
  label?: string;
  prefix?: string;
}

export const LiveCounter: React.FC<LiveCounterProps> = ({
  initialValue,
  dailyRate,
  label = 'Live Earnings',
  prefix = '$',
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const perSecondRate = dailyRate / 86400; // 86400 seconds in a day
    const interval = setInterval(() => {
      setValue(prev => {
        const increment = BigInt(Math.floor(perSecondRate * Number(prev) * 100)) / 100n;
        return prev + increment;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [dailyRate]);

  const formatValue = (val: bigint): string => {
    const num = Number(val) / 1e18;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  return (
    <GlassCard variant="glow" className="animate-pulse-slow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-sm mb-1">{label}</p>
          <p className="font-mono font-bold text-3xl text-growth-500">
            {prefix}{formatValue(value)}
          </p>
          <span className="text-success text-xs mt-1 inline-block">⬆ Live</span>
        </div>
        <div className="text-4xl">📈</div>
      </div>
    </GlassCard>
  );
};

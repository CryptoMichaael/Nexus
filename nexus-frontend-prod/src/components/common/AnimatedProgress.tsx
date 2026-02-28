import React from 'react';

interface AnimatedProgressProps {
  current: bigint;
  max: bigint;
  label?: string;
  showPercentage?: boolean;
  color?: 'trust' | 'growth' | 'achievement';
  animated?: boolean;
  className?: string;
}

export const AnimatedProgress: React.FC<AnimatedProgressProps> = ({
  current,
  max,
  label,
  showPercentage = true,
  color = 'trust',
  animated = true,
  className = '',
}) => {
  const percentage = max > 0n ? Number((current * 10000n) / max) / 100 : 0;
  const cappedPercentage = Math.min(percentage, 100);

  const colorClasses = {
    trust: 'from-trust-500 to-trust-600',
    growth: 'from-growth-500 to-growth-600',
    achievement: 'from-achievement-500 to-achievement-600',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-slate-400 font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-white font-mono font-bold">
              {cappedPercentage.toFixed(2)}%
            </span>
          )}
        </div>
      )}
      
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} rounded-full transition-all ${animated ? 'duration-1000 ease-out' : 'duration-0'}`}
          style={{ width: `${cappedPercentage}%` }}
        />
      </div>
    </div>
  );
};

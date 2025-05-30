'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';

interface RevenueDisplayProps {
  amount: number;
  currency?: string;
  className?: string;
  animated?: boolean;
  showIcon?: boolean;
  showTrend?: boolean;
  previousAmount?: number;
}

export function RevenueDisplay({
  amount,
  currency = '$',
  className = '',
  animated = true,
  showIcon = true,
  showTrend = false,
  previousAmount,
}: RevenueDisplayProps) {
  const [displayAmount, setDisplayAmount] = useState(animated ? 0 : amount);

  useEffect(() => {
    if (!animated) {
      setDisplayAmount(amount);
      return;
    }

    const startValue = displayAmount;
    const endValue = amount;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const updateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
      const easedProgress = easeOutCubic(progress);

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayAmount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateValue);
      }
    };

    requestAnimationFrame(updateValue);
  }, [amount, animated]);

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value));
  };

  const getTrendDirection = () => {
    if (!showTrend || previousAmount === undefined) return null;

    if (amount > previousAmount) {
      return { direction: 'up', color: 'text-green-500' };
    } else if (amount < previousAmount) {
      return { direction: 'down', color: 'text-red-500' };
    }
    return { direction: 'neutral', color: 'text-gray-500' };
  };

  const trend = getTrendDirection();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <DollarSign className="h-5 w-5 text-green-600" />}
      <span className="font-bold text-lg">
        {currency}
        {formatAmount(displayAmount)}
      </span>
      {trend && showTrend && (
        <TrendingUp
          className={`h-4 w-4 ${trend.color} ${
            trend.direction === 'down' ? 'rotate-180' : ''
          } ${trend.direction === 'neutral' ? 'opacity-50' : ''}`}
        />
      )}
    </div>
  );
}

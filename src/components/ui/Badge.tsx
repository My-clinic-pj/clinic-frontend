import React from 'react';
import type { PaymentMethod } from '../../types';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'solid' | 'outline' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const variantStyles = {
    solid: 'bg-black text-white border border-black',
    outline: 'bg-white text-black border border-black',
    neutral: 'bg-neutral-100 text-neutral-800 border border-neutral-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const PaymentBadge: React.FC<{ method: PaymentMethod }> = ({ method }) => {
  if (method === 'KPay') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-black text-white border border-black">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
        KPay
      </span>
    );
  }

  if (method === 'WavePay') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-neutral-100 text-black border border-black">
        <span className="w-1.5 h-1.5 rounded-full bg-black" />
        WavePay
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-white text-black border border-neutral-400">
      Cash
    </span>
  );
};

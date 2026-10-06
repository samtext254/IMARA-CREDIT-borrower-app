'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/50',
  secondary: 'bg-white text-ink-950 border border-ink-700/10 hover:bg-page',
  ghost:     'bg-transparent text-brand-600 hover:bg-brand-50',
  danger:    'bg-red-500 text-white hover:bg-red-600',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9  px-3 text-[13px] rounded-lg',
  md: 'h-11 px-4 text-[14px] rounded-xl',
  lg: 'h-12 px-5 text-[15px] rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
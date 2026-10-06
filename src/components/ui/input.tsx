'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-11 px-3.5 rounded-xl bg-white border border-ink-700/10',
        'text-[14px] text-ink-950 placeholder:text-[13px] placeholder:text-ink-400',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600',
        'transition-colors',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
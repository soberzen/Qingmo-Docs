import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

type LumaSpinProps = Omit<ComponentProps<'div'>, 'children'> & {
  label?: string;
};

export function LumaSpin({
  className,
  label = '加载中',
  ...props
}: LumaSpinProps) {
  return (
    <div
      role='status'
      aria-label={label}
      className={cn('relative w-[65px] shrink-0 aspect-square', className)}
      {...props}
    >
      <span className='absolute animate-luma-spin rounded-full shadow-[inset_0_0_0_3px] shadow-foreground' />
      <span className='absolute animate-luma-spin rounded-full shadow-[inset_0_0_0_3px] shadow-foreground [animation-delay:-1.25s]' />
    </div>
  );
}

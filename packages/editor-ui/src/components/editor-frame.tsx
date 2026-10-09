import { cn } from '@qingmo/shadcn/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

export type EditorFrameProps = ComponentProps<'div'> & {
  toolbar?: ReactNode;
};

export function EditorFrame({
  toolbar,
  children,
  className,
  ...props
}: EditorFrameProps) {
  return (
    <div
      data-slot='editor-frame'
      className={cn(
        'flex min-h-64 flex-col overflow-hidden rounded-lg border bg-background text-foreground',
        className,
      )}
      {...props}
    >
      {toolbar != null && (
        <div
          data-slot='editor-toolbar'
          className='flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3'
        >
          {toolbar}
        </div>
      )}
      <div
        data-slot='editor-body'
        className='min-h-0 flex-1 p-4'
      >
        {children}
      </div>
    </div>
  );
}

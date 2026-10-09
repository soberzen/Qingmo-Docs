import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@qingmo/shadcn/components/tooltip';
import { cn } from '@qingmo/shadcn/lib/utils';
import { Check, CodeXml, Copy, Loader2 } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useCallback, useState, useEffect } from 'react';

export type CodeBlockFrameProps = ComponentProps<'pre'> & {
  language: ReactNode; // 语言
  onCopy?: () => Promise<void> | void; // 复制回调
};

type CopyState = 'idle' | 'loading' | 'copied';

export function CodeBlockFrame({
  className,
  children, // 代码内容
  language,
  onCopy,
  ...props
}: CodeBlockFrameProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');

  const handleCopy = useCallback(async () => {
    if (copyState !== 'idle') return;
    setCopyState('loading');
    try {
      await onCopy?.();
    } finally {
      setCopyState('copied');
    }
  }, [copyState, onCopy]);

  useEffect(() => {
    if (copyState === 'copied') {
      const timer = setTimeout(() => setCopyState('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyState]);

  const icon =
    copyState === 'loading' ? (
      <Loader2
        size={16}
        className='animate-spin text-gray-500'
      />
    ) : copyState === 'copied' ? (
      <Check
        size={16}
        className='text-gray-500'
      />
    ) : (
      <Copy
        size={16}
        className='text-gray-500'
      />
    );

  const tooltipText = copyState === 'copied' ? '已复制' : '复制代码';

  return (
    <pre
      data-slot='code-block'
      className={cn(
        'flex min-h-30 max-h-100 flex-col overflow-x-auto rounded-lg border bg-background text-foreground',
        className,
      )}
      {...props}
    >
      <div
        data-slot='code-toolbar'
        className='flex flex-wrap justify-between items-center gap-2 border-b bg-muted/30 px-4 py-3'
      >
        <div className='flex items-center gap-2'>
          <CodeXml
            size={16}
            className='text-gray-500'
          />
          {language}
        </div>
        <div className='flex items-center gap-2'>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCopy}
                className='inline-flex items-center justify-center rounded p-1 transition-colors hover:bg-gray-200/60 hover:text-gray-800 dark:hover:bg-gray-700/60'
                aria-label={tooltipText}
              >
                {icon}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <span>{tooltipText}</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div
        data-slot='code-body'
        className='min-h-0 flex-1 p-4'
      >
        {children}
      </div>
    </pre>
  );
}

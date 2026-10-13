import type { SupportedLanguageConfig } from '@qingmo/core';
import { Button } from '@qingmo/shadcn/components/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@qingmo/shadcn/components/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@qingmo/shadcn/components/popover';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@qingmo/shadcn/components/tooltip';
import { cn } from '@qingmo/shadcn/lib/utils';
import { Check, ChevronDown, CodeXml, Copy, Loader2 } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback, useState, useEffect } from 'react';

export type CodeBlockFrameProps = ComponentProps<'pre'> & {
  language: string; // 选择的语言
  supportedLanguages: SupportedLanguageConfig[];
  onCopy?: () => Promise<void> | void; // 复制回调
  onLanguageChange?: (language: string) => void; // 语言改变回调
};

type CopyState = 'idle' | 'loading' | 'copied';

export function CodeBlockFrame({
  className,
  children, // 代码内容
  language,
  supportedLanguages,
  onCopy,
  onLanguageChange,
  ...props
}: CodeBlockFrameProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const normalizedLanguage = language.trim().toLowerCase();
  const selectedLanguage = supportedLanguages.find(
    ({ id, match }) =>
      id.toLowerCase() === normalizedLanguage ||
      match.some((alias) => alias.toLowerCase() === normalizedLanguage),
  );
  const languageLabel = selectedLanguage?.name || language || '选择语言';

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
        contentEditable={false}
        className='flex flex-wrap justify-between items-center gap-2 border-b bg-muted/30 px-4 py-3'
      >
        <Popover
          open={languageMenuOpen}
          onOpenChange={setLanguageMenuOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              aria-label={`选择代码语言，当前为 ${languageLabel}`}
              disabled={!onLanguageChange || supportedLanguages.length === 0}
              className='gap-2 font-normal'
            >
              <CodeXml
                aria-hidden='true'
                className='text-muted-foreground'
              />
              <span>{languageLabel}</span>
              <ChevronDown
                aria-hidden='true'
                className='text-muted-foreground'
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align='start'
            className='w-64 p-0'
            contentEditable={false}
            aria-label='选择代码语言'
          >
            <Command defaultValue={selectedLanguage?.id ?? ''}>
              <CommandInput
                placeholder='搜索语言…'
                aria-label='搜索代码语言'
              />
              <CommandList>
                <CommandEmpty>未找到匹配的语言</CommandEmpty>
                <CommandGroup>
                  {supportedLanguages.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      keywords={[item.name, ...item.match]}
                      onSelect={() => {
                        onLanguageChange?.(item.id);
                        setLanguageMenuOpen(false);
                      }}
                    >
                      <Check
                        aria-hidden='true'
                        className={cn(
                          'size-4',
                          selectedLanguage?.id === item.id
                            ? 'opacity-100'
                            : 'opacity-0',
                        )}
                      />
                      <span>{item.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
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

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
      setCopyState('copied');
    } catch {
      setCopyState('idle');
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
        aria-hidden='true'
        className='size-3.5 animate-spin'
      />
    ) : copyState === 'copied' ? (
      <Check
        aria-hidden='true'
        className='size-3.5'
      />
    ) : (
      <Copy
        aria-hidden='true'
        className='size-3.5'
      />
    );

  const tooltipText = copyState === 'copied' ? '已复制' : '复制代码';

  return (
    <pre
      data-slot='code-block'
      className={cn(
        'group/code-block flex max-h-100 min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-border/70 bg-muted/50 text-foreground shadow-xs data-[selected=true]:border-ring data-[selected=true]:ring-2 data-[selected=true]:ring-ring/30 dark:bg-muted/20',
        className,
      )}
      {...props}
    >
      <div
        data-slot='code-toolbar'
        contentEditable={false}
        className='flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-3 py-2 font-sans whitespace-normal'
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
              className='h-7 min-w-0 shrink gap-1.5 rounded-md border-border/60 bg-background/80 px-2 text-xs font-medium text-muted-foreground hover:border-border hover:bg-background hover:text-foreground aria-expanded:border-border aria-expanded:bg-background aria-expanded:text-foreground'
            >
              <CodeXml
                aria-hidden='true'
                className='size-3.5'
              />
              <span className='truncate'>{languageLabel}</span>
              <ChevronDown
                aria-hidden='true'
                className='size-3 opacity-60 transition-transform duration-150 group-aria-expanded/button:rotate-180'
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align='start'
            className='w-64 overflow-hidden rounded-xl p-0 font-sans shadow-lg shadow-black/5'
            sideOffset={8}
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
        <div className='shrink-0'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={handleCopy}
                disabled={copyState === 'loading'}
                className={cn(
                  'h-7 gap-1.5 rounded-md border-border/60 bg-background/80 px-2 text-xs font-medium text-muted-foreground hover:border-border hover:bg-background hover:text-foreground',
                  copyState === 'copied' &&
                    'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-400',
                )}
                aria-label={tooltipText}
              >
                {icon}
                <span className='hidden sm:inline'>
                  {copyState === 'copied' ? '已复制' : '复制'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>{tooltipText}</span>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div
        data-slot='code-body'
        className='min-h-0 min-w-0 flex-1 overflow-auto px-5 py-4 font-mono text-sm leading-6 whitespace-pre [tab-size:2]'
      >
        {children}
      </div>
    </pre>
  );
}

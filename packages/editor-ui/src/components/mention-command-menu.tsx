import type { MentionItem } from '@qingmo/core';
import { Button } from '@qingmo/shadcn/components/button';
import { Input } from '@qingmo/shadcn/components/input';
import { cn } from '@qingmo/shadcn/lib/utils';
import { FileText, Loader2, Search, UserRound, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type RefAttributes,
} from 'react';

export type MentionCommandItem = MentionItem & {
  description?: string;
  kind?: 'user' | 'article';
  icon?: ReactNode;
};

export type MentionCommandSearch = (
  searchText: string,
  options: { signal: AbortSignal },
) => MentionCommandItem[] | Promise<MentionCommandItem[]>;

export type MentionCommandMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type MentionCommandMenuProps = {
  searchItems: MentionCommandSearch;
  onSelect: (item: MentionCommandItem) => void;
  onClose: () => void;
  title?: string;
  searchPlaceholder?: string;
  debounceMs?: number;
  className?: string;
} & RefAttributes<MentionCommandMenuHandle>;

type SearchState = {
  searchText: string;
  searchItems: MentionCommandSearch;
  debounceMs: number;
  sequence: number;
} & (
  | { status: 'loading' | 'error'; items: [] }
  | { status: 'ready'; items: MentionCommandItem[] }
);

const EMPTY_ITEMS: MentionCommandItem[] = [];

export function MentionCommandMenu({
  searchItems,
  onSelect,
  onClose,
  title = '提及用户或文章',
  searchPlaceholder = '搜索用户或文章…',
  debounceMs = 200,
  className,
  ref,
}: MentionCommandMenuProps) {
  const menuId = useId();
  const headingId = `${menuId}-heading`;
  const listId = `${menuId}-list`;
  const statusId = `${menuId}-status`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const retryImmediately = useRef(false);
  const [searchText, setSearchText] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchState, setSearchState] = useState<SearchState>({
    status: 'loading',
    searchText: '',
    searchItems,
    debounceMs,
    sequence: 0,
    items: [],
  });
  const currentResult =
    searchState.searchText === searchText &&
    searchState.searchItems === searchItems &&
    searchState.debounceMs === debounceMs;
  const status = currentResult ? searchState.status : 'loading';
  const items = status === 'ready' ? searchState.items : EMPTY_ITEMS;
  const activeIndex = Math.min(selectedIndex, Math.max(0, items.length - 1));
  const activeItem = items[activeIndex];

  useEffect(() => {
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const sequence = ++requestSequence.current;
    requestRef.current?.abort();
    requestRef.current = controller;

    const delay =
      searchText === '' || retryImmediately.current
        ? 0
        : Math.max(0, debounceMs);
    retryImmediately.current = false;

    async function search() {
      try {
        const nextItems = await searchItems(searchText, {
          signal: controller.signal,
        });
        if (controller.signal.aborted || sequence !== requestSequence.current) {
          return;
        }
        setSearchState({
          status: 'ready',
          searchText,
          searchItems,
          debounceMs,
          sequence,
          items: nextItems,
        });
        setSelectedIndex(0);
      } catch {
        if (controller.signal.aborted || sequence !== requestSequence.current) {
          return;
        }
        setSearchState({
          status: 'error',
          searchText,
          searchItems,
          debounceMs,
          sequence,
          items: [],
        });
      }
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    if (delay === 0) {
      void search();
    } else {
      timer = setTimeout(() => void search(), delay);
    }

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, searchItems, debounceMs, retryCount]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return false;

      if (event.key === 'Escape') {
        onClose();
        return true;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (items.length > 0) {
          const direction = event.key === 'ArrowUp' ? -1 : 1;
          setSelectedIndex(
            (activeIndex + direction + items.length) % items.length,
          );
        }
        return true;
      }

      if (event.key === 'Enter') {
        if (
          activeItem &&
          searchState.sequence === requestSequence.current &&
          !requestRef.current?.signal.aborted
        ) {
          onSelect(activeItem);
        }
        return true;
      }

      return false;
    },
    [
      activeIndex,
      activeItem,
      items.length,
      searchState.sequence,
      onClose,
      onSelect,
    ],
  );

  useImperativeHandle(ref, () => ({ onKeyDown: handleKeyDown }), [
    handleKeyDown,
  ]);

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, items]);

  function changeSearch(nextSearchText: string) {
    if (nextSearchText === searchText) return;
    requestRef.current?.abort();
    setSearchText(nextSearchText);
    setSelectedIndex(0);
    setSearchState({
      status: 'loading',
      searchText: nextSearchText,
      searchItems,
      debounceMs,
      sequence: requestSequence.current,
      items: [],
    });
  }

  function retrySearch() {
    requestRef.current?.abort();
    retryImmediately.current = true;
    setSearchState({
      status: 'loading',
      searchText,
      searchItems,
      debounceMs,
      sequence: requestSequence.current,
      items: [],
    });
    setSelectedIndex(0);
    setRetryCount((count) => count + 1);
    inputRef.current?.focus();
  }

  const hasItems = items.length > 0;
  const statusText =
    status === 'loading'
      ? '正在搜索…'
      : status === 'error'
        ? '搜索失败，请重试'
        : searchText
          ? '没有找到匹配的用户或文章'
          : '暂无推荐的用户或文章';

  return (
    <div
      data-slot='mention-command-menu'
      contentEditable={false}
      className={cn(
        'relative z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover font-sans text-popover-foreground shadow-lg',
        className,
      )}
    >
      <div className='flex items-center justify-between gap-2 px-3 pt-2.5 pb-2'>
        <p
          id={headingId}
          className='text-sm font-medium'
        >
          {title}
        </p>
        <Button
          type='button'
          variant='ghost'
          size='icon-xs'
          aria-label='关闭提及菜单'
          onClick={onClose}
          className='text-muted-foreground'
        >
          <X aria-hidden='true' />
        </Button>
      </div>
      <div className='border-b px-3 pb-3'>
        <div className='relative'>
          <Search
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground'
          />
          <Input
            ref={inputRef}
            type='search'
            role='combobox'
            aria-label='搜索提及候选项'
            aria-autocomplete='list'
            aria-expanded='true'
            aria-controls={listId}
            aria-activedescendant={
              activeItem ? `${menuId}-option-${activeIndex}` : undefined
            }
            aria-describedby={!hasItems ? statusId : undefined}
            placeholder={searchPlaceholder}
            autoComplete='off'
            spellCheck={false}
            value={searchText}
            onChange={(event) => changeSearch(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (handleKeyDown(event.nativeEvent)) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            className='pl-8'
          />
        </div>
      </div>
      <div
        id={listId}
        ref={listRef}
        role='listbox'
        aria-labelledby={headingId}
        aria-busy={status === 'loading'}
        className={cn('max-h-72 overflow-y-auto', hasItems && 'p-1.5')}
      >
        {items.map((item, index) => {
          const selected = index === activeIndex;

          return (
            <button
              key={`${item.kind ?? 'user'}:${item.id}`}
              id={`${menuId}-option-${index}`}
              type='button'
              role='option'
              aria-selected={selected}
              tabIndex={-1}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left outline-none transition-colors',
                selected && 'bg-accent text-accent-foreground',
              )}
              onMouseEnter={() => setSelectedIndex(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => {
                if (
                  searchState.sequence === requestSequence.current &&
                  !requestRef.current?.signal.aborted
                ) {
                  onSelect(item);
                }
              }}
            >
              <span
                aria-hidden='true'
                className='flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0'
              >
                {item.icon ??
                  (item.kind === 'article' ? <FileText /> : <UserRound />)}
              </span>
              <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                <span className='truncate text-sm font-medium'>
                  {item.label}
                </span>
                {item.description && (
                  <span className='truncate text-xs leading-5 text-muted-foreground'>
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {!hasItems && (
        <div className='flex min-h-32 flex-col items-center justify-center gap-3 px-3 py-6'>
          <p
            id={statusId}
            role={status === 'error' ? 'alert' : 'status'}
            className='flex items-center gap-2 text-sm text-muted-foreground'
          >
            {status === 'loading' && (
              <Loader2
                aria-hidden='true'
                className='size-4 animate-spin'
              />
            )}
            {statusText}
          </p>
          <Button
            type='button'
            variant='outline'
            size='xs'
            onClick={retrySearch}
          >
            {status === 'error' ? '重试' : '重新搜索'}
          </Button>
        </div>
      )}
      <p className='border-t px-3 py-2 text-xs text-muted-foreground'>
        ↑ ↓ 选择 · Enter 插入 · Esc 关闭
      </p>
    </div>
  );
}

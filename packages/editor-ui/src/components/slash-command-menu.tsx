import type {
  SlashCommandGroup,
  SlashCommandSuggestionProps,
} from '@qingmo/core';
import { cn } from '@qingmo/shadcn/lib/utils';
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type RefAttributes,
} from 'react';

export type SlashCommandMenuHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type SlashCommandMenuProps = {
  editor: SlashCommandSuggestionProps['editor'];
  groups: SlashCommandGroup[];
} & RefAttributes<SlashCommandMenuHandle>;

export function SlashCommandMenu({
  editor,
  groups,
  ref,
}: SlashCommandMenuProps) {
  const menuId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const commands = groups.flatMap((group) => group.commands);
  const commandNames = JSON.stringify(commands.map((command) => command.name));
  const [selection, setSelection] = useState({ commandNames, index: 0 });

  if (selection.commandNames !== commandNames) {
    setSelection({ commandNames, index: 0 });
  }

  const selectedIndex =
    selection.commandNames === commandNames
      ? Math.min(selection.index, Math.max(0, commands.length - 1))
      : 0;

  function selectIndex(index: number) {
    setSelection({ commandNames, index });
  }

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (event.isComposing || commands.length === 0) return false;

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const direction = event.key === 'ArrowUp' ? -1 : 1;
        selectIndex(
          (selectedIndex + direction + commands.length) % commands.length,
        );
        return true;
      }

      if (event.key === 'Enter') {
        const selected = commands[selectedIndex];
        if (!selected) return false;
        selected.action(editor);
        return true;
      }

      return false;
    },
  }));

  let commandIndex = 0;
  const hasCommands = commands.length > 0;

  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, groups]);

  return (
    <div
      data-slot='slash-command-menu'
      className='relative z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg'
    >
      <div
        ref={listRef}
        role='listbox'
        aria-label='斜杠命令'
        className='max-h-80 overflow-y-auto p-1.5'
      >
        {hasCommands ? (
          groups.map((group) => {
            if (group.commands.length === 0) return null;
            const headingId = `${menuId}-${group.name}`;
            return (
              <div
                key={group.name}
                role='group'
                aria-labelledby={headingId}
                className='mb-1 last:mb-0'
              >
                <p
                  id={headingId}
                  className='px-2 py-1.5 text-xs font-medium text-muted-foreground'
                >
                  {group.title}
                </p>
                {group.commands.map((command) => {
                  const index = commandIndex++;
                  const selected = index === selectedIndex;

                  return (
                    <button
                      key={command.name}
                      type='button'
                      role='option'
                      aria-selected={selected}
                      tabIndex={-1}
                      className={cn(
                        'flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        selected && 'bg-accent text-accent-foreground',
                      )}
                      onMouseEnter={() => selectIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => command.action(editor)}
                    >
                      <span className='text-sm font-medium'>
                        {command.label}
                      </span>
                      <span className='text-xs leading-5 text-muted-foreground'>
                        {command.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })
        ) : (
          <p
            role='status'
            className='px-3 py-6 text-center text-sm text-muted-foreground'
          >
            无匹配命令
          </p>
        )}
      </div>
      <p className='border-t px-3 py-2 text-xs text-muted-foreground'>
        ↑ ↓ 选择 · Enter 插入 · Esc 关闭
      </p>
    </div>
  );
}

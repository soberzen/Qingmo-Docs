import { Document, Mention, Paragraph, Placeholder, Text } from '@qingmo/core';
import {
  createMentionCommandRenderer,
  EditorFrame,
  MentionCommandMenu,
  type MentionCommandComponentProps,
  type MentionCommandItem,
  type MentionCommandMenuHandle,
  type MentionCommandSearch,
} from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { mergeAttributes, type JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { useImperativeHandle, useRef, useState } from 'react';

const DemoParagraph = Paragraph.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, this.options.HTMLAttributes),
      0,
    ];
  },
});

const searchMentions: MentionCommandSearch = async (searchText, { signal }) => {
  const response = await fetch(
    `/api/playground/mentions?q=${encodeURIComponent(searchText)}`,
    { signal },
  );
  if (!response.ok) throw new Error('暂时无法搜索，请重试。');
  const items: MentionCommandItem[] = await response.json();
  return items;
};

function DemoMentionCommand({
  command,
  onClose,
  ref,
}: MentionCommandComponentProps) {
  const menuRef = useRef<MentionCommandMenuHandle>(null);

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      return menuRef.current?.onKeyDown(event) ?? false;
    },
  }));

  return (
    <MentionCommandMenu
      ref={menuRef}
      searchItems={searchMentions}
      onSelect={command}
      onClose={onClose}
    />
  );
}

function createInitialContent(): JSONContent {
  return {
    type: 'document',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '通知 ' },
          { type: 'mention', attrs: { id: 'user:zhang', label: '张三' } },
          { type: 'text', text: '：试试在正文里输入 @，搜索用户或文章。' },
        ],
      },
      { type: 'paragraph' },
    ],
  };
}

export function MentionDemo() {
  const [readOnly, setReadOnly] = useState(false);
  const [snapshot, setSnapshot] = useState({ json: '', html: '', text: '' });
  const editor = useEditor({
    extensions: [
      Document,
      DemoParagraph,
      Text,
      Mention.configure({
        HTMLAttributes: { class: 'mention-demo-tag' },
        render: createMentionCommandRenderer(DemoMentionCommand),
      }),
      Placeholder.configure({ placeholder: '输入 @，搜索并提及用户或文章…' }),
    ],
    content: createInitialContent(),
    editorProps: {
      attributes: {
        class: 'mention-demo-editor',
        role: 'textbox',
        'aria-label': '提及测试编辑器',
        'aria-multiline': 'true',
      },
    },
    onCreate: ({ editor: current }) =>
      setSnapshot({
        json: JSON.stringify(current.getJSON(), null, 2),
        html: current.getHTML(),
        text: current.getText(),
      }),
    onUpdate: ({ editor: current }) =>
      setSnapshot({
        json: JSON.stringify(current.getJSON(), null, 2),
        html: current.getHTML(),
        text: current.getText(),
      }),
  });

  return (
    <div className='mention-demo grid gap-4 mt-4'>
      <p className='text-sm leading-6 text-muted-foreground'>
        输入 @ 打开提及弹窗，在弹窗的搜索框中查找用户或文章。 使用 ↑ / ↓
        选择、Enter 插入、Esc 关闭；Backspace 整体删除提及。
        搜索接口使用演示数据，输入 error 可检查请求失败的提示。
      </p>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          disabled={!editor || readOnly}
          onClick={() => editor?.chain().focus('end').insertContent('@').run()}
        >
          打开提及弹窗
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor}
          onClick={() => {
            if (!editor) return;
            const nextReadOnly = editor.isEditable;
            editor.commands.dismissMention();
            editor.setEditable(!nextReadOnly);
            setReadOnly(nextReadOnly);
          }}
        >
          {readOnly ? '恢复编辑' : '切换只读'}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor}
          onClick={() => {
            if (!editor) return;
            editor.setEditable(true);
            editor.commands.setContent(createInitialContent());
            setReadOnly(false);
          }}
        >
          重置提及示例
        </Button>
      </div>
      <EditorFrame>
        <EditorContent
          editor={editor}
          className='mention-demo-host'
          data-readonly={readOnly}
        />
      </EditorFrame>
      <details className='rounded-lg border px-4 py-3 text-sm'>
        <summary className='cursor-pointer'>
          查看提及 JSON、HTML 和纯文本
        </summary>
        <pre className='mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs'>
          {snapshot.json}
        </pre>
        <pre className='mt-3 whitespace-pre-wrap break-all text-xs'>
          {snapshot.html}
        </pre>
        <pre className='mt-3 whitespace-pre-wrap text-xs'>{snapshot.text}</pre>
      </details>
    </div>
  );
}

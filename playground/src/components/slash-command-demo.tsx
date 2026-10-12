import {
  CodeBlock,
  Document,
  MathBlock,
  MathInline,
  Paragraph,
  SlashCommand,
  Text,
  type SlashCommandGroup,
} from '@qingmo/core';
import {
  createSlashCommandRenderer,
  EditorFrame,
  SlashCommandMenu,
  type SlashCommandComponentProps,
  type SlashCommandMenuHandle,
} from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { mergeAttributes, type JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { useImperativeHandle, useMemo, useRef, useState } from 'react';

// Keep the same local paragraph adjustment as the math demo so text is rendered.
const DemoParagraph = Paragraph.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, this.options.HTMLAttributes),
      0,
    ];
  },
});

function createInitialContent(): JSONContent {
  return {
    type: 'document',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '在下方空白段落输入 /，选择要插入的内容。' },
        ],
      },
      { type: 'paragraph' },
    ],
  };
}

function DemoSlashCommandMenu({
  editor,
  items,
  ref,
}: SlashCommandComponentProps) {
  const menuRef = useRef<SlashCommandMenuHandle>(null);

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      return menuRef.current?.onKeyDown(event) ?? false;
    },
  }));

  return (
    <SlashCommandMenu
      ref={menuRef}
      editor={editor}
      groups={items}
    />
  );
}

export function SlashCommandDemo() {
  const [readOnly, setReadOnly] = useState(false);
  const [lastCommand, setLastCommand] = useState('尚未执行命令');
  const [json, setJson] = useState(() =>
    JSON.stringify(createInitialContent(), null, 2),
  );
  const groups = useMemo<SlashCommandGroup[]>(
    () => [
      {
        name: 'basic',
        title: '基础内容',
        commands: [
          {
            name: 'paragraph',
            label: '文本段落',
            description: '插入一段可继续编辑的正文',
            aliases: ['text', 'paragraph', 'p'],
            action: (editor) => {
              editor
                .chain()
                .setParagraph()
                .insertContent('从斜杠命令插入的段落。')
                .run();
              setLastCommand('文本段落');
            },
          },
          {
            name: 'code-block',
            label: '代码块',
            description: '插入可继续输入的 JavaScript 代码块',
            aliases: ['code', 'javascript', 'js'],
            shouldHidden: (editor) => editor.isActive('codeBlock'),
            action: (editor) => {
              editor.commands.setCodeBlock();
              setLastCommand('代码块');
            },
          },
        ],
      },
      {
        name: 'math',
        title: '数学公式',
        commands: [
          {
            name: 'math-block',
            label: '块公式',
            description: '插入独立成块的 LaTeX 公式',
            aliases: ['math', 'formula', 'latex'],
            shouldHidden: (editor) => editor.isActive('codeBlock'),
            action: (editor) => {
              editor.commands.insertBlockMath({ latex: 'a^2 + b^2 = c^2' });
              setLastCommand('块公式');
            },
          },
          {
            name: 'math-inline',
            label: '行内公式',
            description: '在当前段落插入 LaTeX 公式',
            aliases: ['inline', 'inline math'],
            shouldHidden: (editor) => editor.isActive('codeBlock'),
            action: (editor) => {
              editor.commands.insertInlineMath({ latex: 'E = mc^2' });
              setLastCommand('行内公式');
            },
          },
        ],
      },
    ],
    [],
  );
  const editor = useEditor(
    {
      extensions: [
        Document,
        DemoParagraph,
        Text,
        CodeBlock,
        MathBlock,
        MathInline,
        SlashCommand.configure({
          groups,
          render: createSlashCommandRenderer(DemoSlashCommandMenu),
        }),
      ],
      content: createInitialContent(),
      editorProps: {
        attributes: {
          class: 'slash-command-demo-editor',
          role: 'textbox',
          'aria-label': '斜杠命令测试编辑器',
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        setJson(JSON.stringify(updatedEditor.getJSON(), null, 2));
      },
    },
    [],
  );

  function openMenu() {
    if (!editor?.isEditable) return;

    const lastNode = editor.state.doc.lastChild;
    const content =
      lastNode?.type.name === 'paragraph' && lastNode.content.size === 0
        ? '/'
        : { type: 'paragraph', content: [{ type: 'text', text: '/' }] };
    editor.chain().focus('end').insertContent(content).run();
  }

  function toggleReadOnly() {
    if (!editor) return;
    const nextReadOnly = editor.isEditable;
    editor.setEditable(!nextReadOnly);
    setReadOnly(nextReadOnly);
  }

  function resetEditor() {
    if (!editor) return;
    editor.setEditable(true);
    editor.commands.setContent(createInitialContent());
    setReadOnly(false);
    setLastCommand('尚未执行命令');
  }

  return (
    <div className='slash-command-demo'>
      <p className='text-sm leading-6 text-muted-foreground'>
        在段落开头输入 / 打开菜单，继续输入中文名称或英文别名筛选。 使用 ↑ / ↓
        选择、Enter 执行、Esc 关闭，也可以点击命令。
      </p>
      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          disabled={!editor || readOnly}
          onClick={openMenu}
        >
          打开命令菜单
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor}
          onClick={toggleReadOnly}
        >
          {readOnly ? '恢复编辑' : '切换只读'}
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!editor}
          onClick={resetEditor}
        >
          重置示例
        </Button>
      </div>
      <EditorFrame>
        <EditorContent
          editor={editor}
          className='slash-command-demo-host'
          data-readonly={readOnly}
        />
      </EditorFrame>
      <p
        className='text-sm text-muted-foreground'
        aria-live='polite'
      >
        最近执行：{lastCommand}。试试 /code、/math、/inline math 或 /不存在。
        在空代码块开头输入 / 只显示“文本段落”，可验证 shouldHidden。
      </p>
      <details>
        <summary>查看 Slash Command 文档 JSON</summary>
        <pre>{json}</pre>
      </details>
    </div>
  );
}

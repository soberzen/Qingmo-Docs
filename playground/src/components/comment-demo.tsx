import {
  Comment,
  Document,
  Paragraph,
  Text,
  type CommentAnchor,
} from '@qingmo/core';
import { EditorFrame } from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { Label } from '@qingmo/shadcn/components/label';
import { mergeAttributes, type Editor, type JSONContent } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import { EditorContent, useEditor } from '@tiptap/react';
import { useId, useState } from 'react';
import * as Y from 'yjs';

// Match the other playground editors until Paragraph renders its content hole.
const DemoParagraph = Paragraph.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      'p',
      mergeAttributes(HTMLAttributes, this.options.HTMLAttributes),
      0,
    ];
  },
});

function initialContent(): JSONContent {
  return {
    type: 'document',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: '选中这段文字，写下你的第一条评论。' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '评论锚点会跟随正文编辑移动。试着在被评论的文字前插入内容，再从右侧定位原文。',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '同一段文字可以添加多条评论。点击正文高亮，或在评论列表中选择激活和定位。',
          },
        ],
      },
    ],
  };
}

function selectedText(editor: Editor) {
  const { from, to } = editor.state.selection;
  return editor.state.doc.textBetween(from, to, '\n');
}

function CommentDemoSession({ onReset }: { onReset: () => void }) {
  const [ydoc] = useState(() => new Y.Doc());
  const [anchors, setAnchors] = useState<CommentAnchor[]>([]);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
  const [quote, setQuote] = useState('');
  const [draft, setDraft] = useState('');
  const [feedback, setFeedback] = useState('');
  const [ready, setReady] = useState(false);
  const draftId = useId();
  const selectionId = useId();

  const editor = useEditor({
    // Create in the committed effect so StrictMode cannot discard an editor
    // whose onDestroy would also destroy this session's shared document.
    immediatelyRender: false,
    extensions: [
      Document,
      DemoParagraph,
      Text,
      Collaboration.configure({ document: ydoc }),
      Comment.configure({
        anchors: ydoc.getMap<CommentAnchor>('commentAnchors'),
        onAnchorsChange: setAnchors,
        onActiveChange: setActiveAnchorId,
        onClick: (anchorId) => {
          document
            .getElementById(`comment-demo-${anchorId}`)
            ?.scrollIntoView({ block: 'nearest' });
        },
      }),
    ],
    editorProps: {
      attributes: {
        class: 'comment-demo-editor',
        role: 'textbox',
        'aria-label': '评论测试编辑器',
        'aria-multiline': 'true',
      },
    },
    onCreate: ({ editor: current }) => {
      // Seed once after the collaboration binding has initialized.
      current.commands.setContent(initialContent());
      setReady(true);
    },
    onSelectionUpdate: ({ editor: current }) => setQuote(selectedText(current)),
    onUpdate: ({ editor: current }) => setQuote(selectedText(current)),
    onDestroy: () => ydoc.destroy(),
  });

  function selectFirstParagraph() {
    const first = editor?.state.doc.firstChild;
    if (!editor || !first?.isTextblock || first.content.size === 0) {
      setFeedback('首段没有可选文字，请先在正文中输入内容。');
      return;
    }

    editor
      .chain()
      .focus()
      .setTextSelection({ from: 1, to: first.nodeSize - 1 })
      .run();
    setFeedback('已选中首段，可以在右侧填写评论。');
  }

  return (
    <div className='comment-demo'>
      <p className='text-sm leading-6 text-muted-foreground'>
        选中正文并填写评论，点击高亮可激活对应评论。编辑原文后，可从评论列表重新定位。
      </p>

      <div className='flex flex-wrap gap-2'>
        <Button
          type='button'
          size='sm'
          disabled={!ready}
          onClick={selectFirstParagraph}
        >
          选中首段
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          disabled={!ready || activeAnchorId === null}
          onClick={() => editor?.commands.setActiveComment(null)}
        >
          取消激活
        </Button>
        <Button
          type='button'
          size='sm'
          variant='ghost'
          onClick={onReset}
        >
          重置评论示例
        </Button>
      </div>

      <div className='comment-demo-layout'>
        <div className='min-w-0'>
          <h3 className='mb-3 text-sm font-medium'>正文</h3>
          <EditorFrame className='comment-demo-frame'>
            <EditorContent
              editor={editor}
              className='comment-demo-host'
            />
          </EditorFrame>
          <p className='mt-3 text-xs leading-5 text-muted-foreground'>
            普通评论显示浅黄色，当前激活的评论显示深黄色。
          </p>
        </div>

        <aside
          className='min-w-0'
          aria-label='评论面板'
        >
          <form
            className='grid gap-3'
            onSubmit={(event) => {
              event.preventDefault();
              const body = draft.trim();
              if (!editor || !body) return;

              const anchorId = crypto.randomUUID();
              if (!editor.chain().focus().setComment(anchorId).run()) {
                setFeedback('未能创建评论，请重新选中正文中的一段文字后重试。');
                return;
              }

              setMessages((previous) => ({ ...previous, [anchorId]: body }));
              setDraft('');
              setFeedback('评论已添加。');
            }}
          >
            <Label htmlFor={draftId}>评论内容</Label>
            <p
              id={selectionId}
              className='comment-demo-selection'
            >
              {quote
                ? `已选文字：“${quote}”`
                : '尚未选中文字，可点击“选中首段”开始。'}
            </p>
            <textarea
              id={draftId}
              className='comment-demo-input'
              aria-describedby={selectionId}
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder='写下你的评论…'
              disabled={!ready}
            />
            <Button
              type='submit'
              disabled={!ready || !quote.trim() || !draft.trim()}
            >
              添加评论
            </Button>
          </form>

          <h3 className='mb-2 mt-6 text-sm font-medium'>
            评论列表{' '}
            <span className='text-muted-foreground'>（{anchors.length}）</span>
          </h3>
          {anchors.length === 0 ? (
            <p className='py-3 text-sm leading-6 text-muted-foreground'>
              还没有评论。选中一段文字，添加你的第一条评论。
            </p>
          ) : (
            <ol
              className='comment-demo-list'
              aria-label='评论列表'
            >
              {anchors.map((anchor) => {
                const active = anchor.anchorId === activeAnchorId;
                return (
                  <li
                    key={anchor.anchorId}
                    id={`comment-demo-${anchor.anchorId}`}
                    className='comment-demo-item'
                    data-active={active}
                  >
                    <blockquote className='comment-demo-quote'>
                      “{anchor.quote}”
                    </blockquote>
                    <p className='my-3 whitespace-pre-wrap break-words text-sm leading-6'>
                      {messages[anchor.anchorId] ?? '未填写评论内容'}
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant={active ? 'secondary' : 'outline'}
                        aria-pressed={active}
                        onClick={() =>
                          editor?.commands.setActiveComment(anchor.anchorId)
                        }
                      >
                        {active ? '已激活' : '激活'}
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          if (!editor?.commands.focusComment(anchor.anchorId)) {
                            setFeedback(
                              '这条评论的原文范围已失效，无法定位；可以删除该评论。',
                            );
                          }
                        }}
                      >
                        定位原文
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='destructive'
                        aria-label={`删除评论：${messages[anchor.anchorId] ?? anchor.quote}`}
                        onClick={() => {
                          if (!editor?.commands.unsetComment(anchor.anchorId)) {
                            setFeedback('未能删除评论，请重试。');
                            return;
                          }
                          setMessages((previous) => {
                            const next = { ...previous };
                            delete next[anchor.anchorId];
                            return next;
                          });
                          setFeedback('评论已删除，正文保留。');
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>

      <p
        className='min-h-5 text-sm leading-5 text-muted-foreground'
        role='status'
      >
        {feedback}
      </p>
      <details className='rounded-lg border px-4 py-3 text-sm'>
        <summary className='cursor-pointer'>查看评论锚点 JSON</summary>
        <pre className='mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs'>
          {JSON.stringify(anchors, null, 2)}
        </pre>
      </details>
      <p className='text-xs leading-5 text-muted-foreground'>
        本示例在内存中保存正文与评论，刷新页面或重置示例后清空。
      </p>
    </div>
  );
}

export function CommentDemo() {
  const [session, setSession] = useState(0);
  return (
    <CommentDemoSession
      key={session}
      onReset={() => setSession((value) => value + 1)}
    />
  );
}

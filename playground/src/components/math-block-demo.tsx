import { Document, MathBlock, Paragraph, Text } from '@qingmo/core';
import { EditorFrame } from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { Editor, mergeAttributes, type JSONContent } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { useEffect, useRef, useState } from 'react';

const initialLatex = String.raw`\frac{a}{b}`;

// The shared paragraph currently omits its content hole. Keep this adjustment
// local to the demo so text entry can exercise the MathBlock input rule.
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
      { type: 'mathBlock', attrs: { latex: initialLatex } },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '在下方空白段落输入 $$a+b$$，观察输入规则转换。点击公式后，可在上方修改 LaTeX。',
          },
        ],
      },
      { type: 'paragraph' },
      { type: 'mathBlock', attrs: { latex: String.raw`E = mc^2` } },
      { type: 'paragraph' },
    ],
  };
}

function selectedMathPosition(editor: Editor): number | null {
  const { selection } = editor.state;

  return selection instanceof NodeSelection &&
    selection.node.type.name === 'mathBlock'
    ? selection.from
    : null;
}

export function MathBlockDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [latex, setLatex] = useState(initialLatex);
  const [ready, setReady] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [json, setJson] = useState('');
  const [htmlResult, setHtmlResult] = useState<string | null>(null);
  const [htmlFailed, setHtmlFailed] = useState(false);
  const [status, setStatus] = useState('编辑器准备中…');

  useEffect(() => {
    if (!hostRef.current) return;

    const syncSnapshot = (editor: Editor) => {
      setJson(JSON.stringify(editor.getJSON(), null, 2));
      setSelectedPosition(selectedMathPosition(editor));
    };

    const editor = new Editor({
      element: hostRef.current,
      extensions: [
        Document,
        DemoParagraph,
        Text,
        MathBlock.configure({
          katexOptions: { displayMode: true, throwOnError: true },
          onClick: (node, pos) => {
            const currentEditor = editorRef.current;
            if (!currentEditor || currentEditor.isDestroyed) return;

            currentEditor.commands.setNodeSelection(pos);
            setLatex(String(node.attrs.latex ?? ''));
            setStatus(`已选中位置 ${pos} 的公式。`);
          },
        }),
      ],
      content: createInitialContent(),
      editorProps: {
        attributes: {
          class: 'math-block-demo-editor',
          role: 'textbox',
          'aria-label': '数学公式测试编辑器',
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({ editor: updatedEditor }) => syncSnapshot(updatedEditor),
      onSelectionUpdate: ({ editor: updatedEditor }) => {
        syncSnapshot(updatedEditor);
        const pos = selectedMathPosition(updatedEditor);
        if (pos !== null) {
          setLatex(
            String(updatedEditor.state.doc.nodeAt(pos)?.attrs.latex ?? ''),
          );
        }
      },
    });

    editorRef.current = editor;
    syncSnapshot(editor);
    setReady(true);
    setStatus('编辑器已就绪。点击公式或先选择第一条公式。');

    return () => {
      editorRef.current = null;
      editor.destroy();
    };
  }, []);

  function insertFormula() {
    const editor = editorRef.current;
    if (!editor || !editor.isEditable) return;

    const inserted = editor.commands.insertBlockMath({ latex });
    setStatus(
      inserted ? '已在当前选区位置插入公式。' : '插入失败：请输入 LaTeX。',
    );
  }

  function updateFormula() {
    const editor = editorRef.current;
    if (!editor || !editor.isEditable) return;

    const pos = selectedMathPosition(editor);
    if (pos === null) {
      setStatus('请先选中要更新的公式。');
      return;
    }

    const updated = editor.commands.updateBlockMath({ latex, pos });
    setStatus(
      updated ? `已更新位置 ${pos} 的公式。` : '更新失败：当前位置不是公式。',
    );
  }

  function deleteFormula() {
    const editor = editorRef.current;
    if (!editor || !editor.isEditable) return;

    const pos = selectedMathPosition(editor);
    if (pos === null) {
      setStatus('请先选中要删除的公式。');
      return;
    }

    const deleted = editor.commands.deleteBlockMath({ pos });
    setStatus(
      deleted ? `已删除位置 ${pos} 的公式。` : '删除失败：当前位置不是公式。',
    );
  }

  function selectFirstFormula() {
    const editor = editorRef.current;
    if (!editor) return;

    let firstPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (firstPos !== null) return false;
      if (node.type.name === 'mathBlock') {
        firstPos = pos;
        return false;
      }
      return true;
    });

    if (firstPos === null) {
      setStatus('文档中暂时没有公式。');
      return;
    }

    editor.commands.setNodeSelection(firstPos);
    setLatex(String(editor.state.doc.nodeAt(firstPos)?.attrs.latex ?? ''));
    setStatus(`已选中第一条公式，位置为 ${firstPos}。`);
  }

  function toggleReadOnly() {
    const editor = editorRef.current;
    if (!editor) return;

    const nextReadOnly = editor.isEditable;
    editor.setEditable(!nextReadOnly);
    setReadOnly(nextReadOnly);
    setStatus(nextReadOnly ? '已切换为只读模式。' : '已恢复编辑模式。');
  }

  function resetEditor() {
    const editor = editorRef.current;
    if (!editor) return;

    editor.setEditable(true);
    editor.commands.setContent(createInitialContent());
    setReadOnly(false);
    setLatex(initialLatex);
    setHtmlResult(null);
    setHtmlFailed(false);
    setStatus('已恢复初始示例。');
  }

  function serializeHtml() {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      setHtmlResult(editor.getHTML());
      setHtmlFailed(false);
      setStatus('HTML 序列化成功。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setHtmlResult(message);
      setHtmlFailed(true);
      setStatus(`HTML 序列化失败：${message}`);
    }
  }

  return (
    <div className='math-block-demo'>
      <p className='math-block-demo-description'>
        直接运行你写的 MathBlock
        扩展。输入规则、节点选中、命令和渲染都在真实编辑器中测试。
      </p>
      <div className='math-block-demo-input-group'>
        <label htmlFor='math-block-latex'>LaTeX 源码</label>
        <textarea
          id='math-block-latex'
          spellCheck={false}
          rows={2}
          value={latex}
          onChange={(event) => setLatex(event.target.value)}
          placeholder={String.raw`\frac{a}{b}`}
          disabled={!ready || readOnly}
        />
        <p className='math-block-demo-hint'>
          可尝试 \frac{'{a}{b}'}、x^2 + y^2，或输入 \unknown 测试错误显示。
        </p>
      </div>
      <EditorFrame
        toolbar={
          <div className='math-block-demo-actions'>
            <Button
              type='button'
              size='sm'
              disabled={!ready || readOnly}
              onMouseDown={(event) => event.preventDefault()}
              onClick={insertFormula}
            >
              插入公式
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!ready || readOnly || selectedPosition === null}
              onMouseDown={(event) => event.preventDefault()}
              onClick={updateFormula}
            >
              更新选中公式
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!ready || readOnly || selectedPosition === null}
              onMouseDown={(event) => event.preventDefault()}
              onClick={deleteFormula}
            >
              删除选中公式
            </Button>
          </div>
        }
      >
        <div
          ref={hostRef}
          className='math-block-demo-host'
          data-readonly={readOnly}
        />
      </EditorFrame>
      <div className='math-block-demo-actions'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!ready}
          onMouseDown={(event) => event.preventDefault()}
          onClick={selectFirstFormula}
        >
          选择第一条公式
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!ready}
          aria-pressed={readOnly}
          onClick={toggleReadOnly}
        >
          {readOnly ? '恢复编辑' : '切换只读'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!ready}
          onClick={resetEditor}
        >
          重置示例
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!ready}
          onClick={serializeHtml}
        >
          测试 HTML 序列化
        </Button>
      </div>
      <p
        className='math-block-demo-status'
        role='status'
        aria-live='polite'
      >
        {status}
        <span>
          {selectedPosition === null
            ? '当前未选中公式。'
            : `当前选中的公式位置：${selectedPosition}。`}
        </span>
      </p>
      <details className='math-block-demo-details'>
        <summary>查看当前文档 JSON</summary>
        <pre>{json}</pre>
      </details>
      {htmlResult !== null && (
        <details
          className='math-block-demo-details'
          data-error={htmlFailed}
          open
        >
          <summary>
            {htmlFailed ? 'HTML 序列化错误' : 'HTML 序列化结果'}
          </summary>
          <pre>{htmlResult}</pre>
        </details>
      )}
    </div>
  );
}

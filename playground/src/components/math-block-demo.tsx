import { Document, MathBlock, MathInline, Paragraph, Text } from '@qingmo/core';
import { EditorFrame } from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { Editor, mergeAttributes, type JSONContent } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection } from '@tiptap/pm/state';
import { useEffect, useRef, useState } from 'react';

const initialLatex = String.raw`\frac{a}{b}`;
const initialMarkdown = String.raw`行内公式：$a+b$，后面仍有正文。

$$
\frac{a}{b}
$$

块公式后的正文，还有 $x^2$。`;
type MathNodeName = 'mathBlock' | 'mathInline';
type SelectedFormula = { pos: number; type: MathNodeName };

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
            text: '在空白段落输入 $a+b$ 测试行内公式，输入 $$a+b$$ 测试块公式。点击公式后，可在上方修改 LaTeX。',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: '行内公式：' },
          { type: 'mathInline', attrs: { latex: 'a^2 + b^2 = c^2' } },
          { type: 'text', text: '，公式和文字在同一段落。' },
        ],
      },
      { type: 'paragraph' },
      { type: 'mathBlock', attrs: { latex: String.raw`E = mc^2` } },
      { type: 'paragraph' },
    ],
  };
}

function selectedMathNode(editor: Editor): SelectedFormula | null {
  const { selection } = editor.state;

  if (!(selection instanceof NodeSelection)) return null;
  const type = selection.node.type.name;
  return type === 'mathBlock' || type === 'mathInline'
    ? { pos: selection.from, type }
    : null;
}

export function MathBlockDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const [latex, setLatex] = useState(initialLatex);
  const [ready, setReady] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [selectedFormula, setSelectedFormula] =
    useState<SelectedFormula | null>(null);
  const [json, setJson] = useState('');
  const [htmlResult, setHtmlResult] = useState<string | null>(null);
  const [htmlFailed, setHtmlFailed] = useState(false);
  const [markdownSource, setMarkdownSource] = useState(initialMarkdown);
  const [markdownResult, setMarkdownResult] = useState<string | null>(null);
  const [markdownFailed, setMarkdownFailed] = useState(false);
  const [status, setStatus] = useState('编辑器准备中…');

  useEffect(() => {
    if (!hostRef.current) return;

    const syncSnapshot = (editor: Editor) => {
      setJson(JSON.stringify(editor.getJSON(), null, 2));
      setSelectedFormula(selectedMathNode(editor));
    };

    const onMathClick = (node: PMNode, pos: number) => {
      const currentEditor = editorRef.current;
      if (!currentEditor || currentEditor.isDestroyed) return;

      currentEditor.commands.setNodeSelection(pos);
      setLatex(String(node.attrs.latex ?? ''));
      setStatus(`已选中位置 ${pos} 的公式。`);
    };

    const editor = new Editor({
      element: hostRef.current,
      extensions: [
        Document,
        DemoParagraph,
        Text,
        MathBlock.configure({
          katexOptions: { displayMode: true, throwOnError: true },
          onClick: onMathClick,
        }),
        MathInline.configure({
          katexOptions: { displayMode: false, throwOnError: true },
          onClick: onMathClick,
        }),
        Markdown,
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
        const selected = selectedMathNode(updatedEditor);
        if (selected !== null) {
          setLatex(
            String(
              updatedEditor.state.doc.nodeAt(selected.pos)?.attrs.latex ?? '',
            ),
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

  function insertFormula(type: MathNodeName) {
    const editor = editorRef.current;
    if (!editor || !editor.isEditable) return;

    const inserted =
      type === 'mathInline'
        ? editor.commands.insertInlineMath({ latex })
        : editor.commands.insertBlockMath({ latex });
    setStatus(
      inserted
        ? `已在当前选区位置插入${type === 'mathInline' ? '行内' : '块'}公式。`
        : '插入失败：请输入 LaTeX。',
    );
  }

  function updateFormula() {
    const editor = editorRef.current;
    if (!editor || !editor.isEditable) return;

    const selected = selectedMathNode(editor);
    if (selected === null) {
      setStatus('请先选中要更新的公式。');
      return;
    }

    const { pos, type } = selected;
    const updated =
      type === 'mathInline'
        ? editor
            .chain()
            .updateInlineMath({ latex, pos })
            .setNodeSelection(pos)
            .run()
        : editor
            .chain()
            .updateBlockMath({ latex, pos })
            .setNodeSelection(pos)
            .run();
    setStatus(
      updated ? `已更新位置 ${pos} 的公式。` : '更新失败：当前位置不是公式。',
    );
  }

  function deleteFormula() {
    const editor = editorRef.current;
    if (!editor || !editor.isEditable) return;

    const selected = selectedMathNode(editor);
    if (selected === null) {
      setStatus('请先选中要删除的公式。');
      return;
    }

    const { pos, type } = selected;
    const deleted =
      type === 'mathInline'
        ? editor.commands.deleteInlineMath({ pos })
        : editor.commands.deleteBlockMath({ pos });
    setStatus(
      deleted ? `已删除位置 ${pos} 的公式。` : '删除失败：当前位置不是公式。',
    );
  }

  function selectFirstFormula(type: MathNodeName) {
    const editor = editorRef.current;
    if (!editor) return;

    let firstPos: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (firstPos !== null) return false;
      if (node.type.name === type) {
        firstPos = pos;
        return false;
      }
      return true;
    });

    if (firstPos === null) {
      setStatus(`文档中暂时没有${type === 'mathInline' ? '行内' : '块'}公式。`);
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
    setMarkdownResult(null);
    setMarkdownFailed(false);
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

  function importMarkdown() {
    const editor = editorRef.current;
    if (!editor?.isEditable || !editor.markdown) return;

    try {
      const parsed = editor.markdown.parse(markdownSource);
      // Markdown returns a `doc` root; Qingmo names its top node `document`.
      editor.commands.setContent(
        {
          ...parsed,
          type: editor.schema.topNodeType.name,
          content: parsed.content?.length
            ? parsed.content
            : [{ type: 'paragraph' }],
        },
        { errorOnInvalidContent: true },
      );
      setMarkdownResult(null);
      setMarkdownFailed(false);
      setStatus('Markdown 导入成功。可查看公式渲染和当前文档 JSON。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMarkdownResult(message);
      setMarkdownFailed(true);
      setStatus(`Markdown 导入失败：${message}`);
    }
  }

  function exportMarkdown() {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      setMarkdownResult(editor.getMarkdown());
      setMarkdownFailed(false);
      setStatus('Markdown 导出成功。可以把结果填回源码框，再次导入检查。');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMarkdownResult(message);
      setMarkdownFailed(true);
      setStatus(`Markdown 导出失败：${message}`);
    }
  }

  return (
    <div className='math-block-demo'>
      <p className='math-block-demo-description'>
        直接运行 MathBlock 和 MathInline
        扩展。输入规则、节点选中、命令和渲染都在真实编辑器中测试。
      </p>
      <div className='math-block-demo-input-group'>
        <label htmlFor='math-markdown-source'>Markdown 源码</label>
        <textarea
          id='math-markdown-source'
          spellCheck={false}
          rows={7}
          value={markdownSource}
          onChange={(event) => setMarkdownSource(event.target.value)}
          disabled={!ready || readOnly}
        />
        <div className='math-block-demo-actions'>
          <Button
            type='button'
            size='sm'
            disabled={!ready || readOnly}
            onClick={importMarkdown}
          >
            从 Markdown 导入
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={!ready}
            onClick={exportMarkdown}
          >
            导出 Markdown
          </Button>
        </div>
        <p className='math-block-demo-hint'>
          导入会替换当前示例文档。测试正文中的 $...$ 和单独成块的 $$...$$。
        </p>
      </div>
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
              onClick={() => insertFormula('mathBlock')}
            >
              插入块公式
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={!ready || readOnly}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertFormula('mathInline')}
            >
              插入行内公式
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!ready || readOnly || selectedFormula === null}
              onMouseDown={(event) => event.preventDefault()}
              onClick={updateFormula}
            >
              更新选中公式
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!ready || readOnly || selectedFormula === null}
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
          onClick={() => selectFirstFormula('mathBlock')}
        >
          选择第一条公式
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!ready}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => selectFirstFormula('mathInline')}
        >
          选择第一条行内公式
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
          {selectedFormula === null
            ? '当前未选中公式。'
            : `当前选中的${selectedFormula.type === 'mathInline' ? '行内' : '块'}公式位置：${selectedFormula.pos}。`}
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
      {markdownResult !== null && (
        <details
          className='math-block-demo-details'
          data-error={markdownFailed}
          open
        >
          <summary>
            {markdownFailed ? 'Markdown 转换错误' : 'Markdown 导出结果'}
          </summary>
          <pre>{markdownResult}</pre>
        </details>
      )}
    </div>
  );
}

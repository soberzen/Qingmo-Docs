import type { SupportedLanguageConfig } from '@qingmo/core';
import { CodeBlockFrame } from '@qingmo/editor-ui';
import {
  NodeViewContent,
  NodeViewWrapper,
  useEditorState,
  type ReactNodeViewProps,
} from '@tiptap/react';

export function CodeBlockNodeView({
  editor,
  extension,
  node,
  selected,
  updateAttributes,
}: ReactNodeViewProps) {
  const isEditable = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => currentEditor.isEditable,
  });
  const language =
    typeof node.attrs.language === 'string' ? node.attrs.language : 'text';
  const supportedLanguages: SupportedLanguageConfig[] =
    extension.options.supportedLanguages;

  function changeLanguage(nextLanguage: string) {
    if (editor.isDestroyed || !editor.isEditable) return;
    updateAttributes({ language: nextLanguage });
  }

  return (
    <NodeViewWrapper data-node-type='codeBlock'>
      <CodeBlockFrame
        language={language}
        supportedLanguages={supportedLanguages}
        data-selected={selected || undefined}
        onCopy={() => navigator.clipboard.writeText(node.textContent)}
        {...(isEditable ? { onLanguageChange: changeLanguage } : {})}
      >
        <NodeViewContent style={{ whiteSpace: 'pre' }} />
      </CodeBlockFrame>
    </NodeViewWrapper>
  );
}

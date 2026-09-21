import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DecorationSet, type Decoration } from '@tiptap/pm/view';

import { DecorationCache } from './cache';
import type { HighlightPluginState, LanguageExtractor, Parser } from './types';

export const highlightPluginKey = new PluginKey<HighlightPluginState>(
  'codeHighlight',
);

function calculateDecorations({
  cache,
  doc,
  languageExtractor,
  nodeTypes,
  parser,
}: {
  cache: DecorationCache;
  doc: ProseMirrorNode;
  languageExtractor: LanguageExtractor;
  nodeTypes: Set<string>;
  parser: Parser;
}): HighlightPluginState {
  const decorations: Decoration[] = [];
  const promises: Promise<void>[] = [];

  doc.descendants((node, pos) => {
    if (!nodeTypes.has(node.type.name) || !node.type.inlineContent) {
      return true;
    }

    const cached = cache.get(pos);

    if (cached?.[0].eq(node)) {
      decorations.push(...cached[1]);
      return false;
    }

    const result = parser({
      content: node.textContent,
      language: languageExtractor(node) || 'text',
      pos,
      size: node.nodeSize,
    });

    if (Array.isArray(result)) {
      cache.set(pos, node, result);
      decorations.push(...result);
    } else {
      promises.push(result);
    }

    return false;
  });

  return {
    cache,
    decorations: DecorationSet.create(doc, decorations),
    promises,
  };
}

export function createHighlightPlugin({
  parser,
  nodeTypes = ['codeBlock'],
  languageExtractor = (node) => node.attrs.language,
}: {
  parser: Parser;
  nodeTypes?: string[];
  languageExtractor?: LanguageExtractor;
}) {
  const supportedNodeTypes = new Set(nodeTypes);

  return new Plugin<HighlightPluginState>({
    key: highlightPluginKey,
    state: {
      init(_, state) {
        return calculateDecorations({
          cache: new DecorationCache(),
          doc: state.doc,
          languageExtractor,
          nodeTypes: supportedNodeTypes,
          parser,
        });
      },
      apply(tr, pluginState) {
        const cache = pluginState.cache.invalidate(tr);
        const shouldRefresh = tr.getMeta(highlightPluginKey) === 'refresh';

        if (!tr.docChanged && !shouldRefresh) {
          return {
            cache,
            decorations: pluginState.decorations.map(tr.mapping, tr.doc),
            promises: pluginState.promises,
          };
        }

        return calculateDecorations({
          cache,
          doc: tr.doc,
          languageExtractor,
          nodeTypes: supportedNodeTypes,
          parser,
        });
      },
    },
    props: {
      decorations(state) {
        return highlightPluginKey.getState(state)?.decorations;
      },
    },
    view(editorView) {
      const watchedPromises = new Set<Promise<void>>();
      let destroyed = false;
      let refreshQueued = false;

      const queueRefresh = () => {
        if (destroyed || refreshQueued) {
          return;
        }

        refreshQueued = true;
        queueMicrotask(() => {
          refreshQueued = false;

          if (!destroyed) {
            editorView.dispatch(
              editorView.state.tr.setMeta(highlightPluginKey, 'refresh'),
            );
          }
        });
      };

      const watchPendingParsers = () => {
        const promises = highlightPluginKey.getState(
          editorView.state,
        )?.promises;

        promises?.forEach((promise) => {
          if (watchedPromises.has(promise)) {
            return;
          }

          watchedPromises.add(promise);
          void promise
            .catch((error: unknown) => {
              console.error('Unable to highlight code block.', error);
            })
            .finally(() => {
              watchedPromises.delete(promise);
              queueRefresh();
            });
        });
      };

      watchPendingParsers();

      return {
        update() {
          watchPendingParsers();
        },
        destroy() {
          destroyed = true;
          watchedPromises.clear();
        },
      };
    },
  });
}

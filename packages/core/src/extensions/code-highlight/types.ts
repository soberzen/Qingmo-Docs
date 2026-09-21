import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { DecorationCache } from './cache';

export interface ParserOptions {
  content: string;

  pos: number;

  size: number;

  language?: string;
}

export type Parser = (options: ParserOptions) => Decoration[] | Promise<void>;

export type LanguageExtractor = (node: ProseMirrorNode) => string | undefined;

export interface HighlightPluginState {
  cache: DecorationCache;
  decorations: DecorationSet;
  promises: Promise<void>[];
}

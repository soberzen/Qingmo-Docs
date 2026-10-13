import {
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
  type ReactNodeViewRendererOptions,
} from '@tiptap/react';
import type { ComponentType } from 'react';

export type RenderNodeViewProps<T = HTMLElement> = {
  components: ComponentType<ReactNodeViewProps<T>>;
  props?: Partial<ReactNodeViewRendererOptions>;
};

export function renderNodeView<T = HTMLElement>({
  components,
  props,
}: RenderNodeViewProps<T>) {
  return ReactNodeViewRenderer<T>(components, props);
}

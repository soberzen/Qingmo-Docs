import type { MentionOptions, MentionProps } from '@qingmo/core';
import { ReactRenderer } from '@tiptap/react';
import type { ComponentType, RefAttributes } from 'react';

export type MentionCommandHandle = {
  onKeyDown: NonNullable<ReturnType<MentionOptions['render']>['onKeyDown']>;
};

export type MentionCommandComponentProps = MentionProps &
  RefAttributes<MentionCommandHandle> & {
    onClose: () => void;
  };

export function createMentionCommandRenderer(
  MentionCommandComponent: ComponentType<MentionCommandComponentProps>,
): MentionOptions['render'] {
  return () => {
    let editor: MentionProps['editor'] | undefined;
    let component:
      | ReactRenderer<MentionCommandHandle, MentionCommandComponentProps>
      | undefined;
    let unmount: ReturnType<MentionProps['mount']> | undefined;

    function destroy() {
      unmount?.();
      unmount = undefined;
      component?.destroy();
      component = undefined;
      editor = undefined;
    }

    function onClose() {
      const currentEditor = editor;
      if (!currentEditor || currentEditor.isDestroyed) return;

      // 关闭建议状态会触发 onExit，因此清理函数允许重复调用。
      currentEditor.commands.dismissMention();
      destroy();
      if (!currentEditor.isDestroyed) currentEditor.view.focus();
    }

    return {
      onStart(props) {
        editor = props.editor;
        component = new ReactRenderer<
          MentionCommandHandle,
          MentionCommandComponentProps
        >(MentionCommandComponent, {
          editor,
          props: { ...props, onClose },
        });

        Object.assign(component.element.style, {
          position: props.floatingUi.strategy,
          left: '0',
          top: '0',
        });
        unmount = props.mount(component.element);
      },

      onUpdate(props) {
        component?.updateProps({ ...props, onClose });
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape' || props.event.key === 'Esc') {
          onClose();
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit: destroy,
    };
  };
}

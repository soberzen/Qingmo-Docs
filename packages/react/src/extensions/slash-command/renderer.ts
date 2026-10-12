import type {
  SlashCommandOptions,
  SlashCommandSuggestionProps,
} from '@qingmo/core';
import { ReactRenderer } from '@tiptap/react';
import type { ComponentType, RefAttributes } from 'react';

export type SlashCommandHandle = {
  onKeyDown: NonNullable<
    ReturnType<SlashCommandOptions['render']>['onKeyDown']
  >;
};

export type SlashCommandComponentProps = SlashCommandSuggestionProps &
  RefAttributes<SlashCommandHandle>;

export function createSlashCommandRenderer(
  SlashCommandComponent: ComponentType<SlashCommandComponentProps>,
): SlashCommandOptions['render'] {
  return () => {
    let component:
      | ReactRenderer<SlashCommandHandle, SlashCommandSuggestionProps>
      | undefined;
    let unmount: ReturnType<SlashCommandSuggestionProps['mount']> | undefined;

    return {
      onStart(props) {
        component = new ReactRenderer<
          SlashCommandHandle,
          SlashCommandSuggestionProps
        >(SlashCommandComponent, {
          props,
          editor: props.editor,
        });

        Object.assign(component.element.style, {
          position: props.floatingUi.strategy,
          left: '0',
          top: '0',
        });
        unmount = props.mount(component.element);
      },

      onUpdate(props) {
        component?.updateProps(props);
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape' || props.event.key === 'Esc') {
          return true;
        }

        return component?.ref?.onKeyDown(props) ?? false;
      },

      onExit() {
        unmount?.();
        unmount = undefined;
        component?.destroy();
        component = undefined;
      },
    };
  };
}

import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

import type {
  SlashCommandGroup,
  Command,
  SlashCommandSuggestionProps,
} from './types';

export type SlashCommandOptions = {
  groups: SlashCommandGroup[];
  render: NonNullable<SuggestionOptions<SlashCommandGroup, Command>['render']>;
};

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      groups: [],
      render: () => ({}),
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey<{
      active: boolean;
      range: SlashCommandSuggestionProps['range'];
    }>('slashCommand');

    const prepareCommand = (command: Command): Command => ({
      ...command,
      action(editor) {
        if (editor.isDestroyed || !editor.isEditable) return;

        const state = pluginKey.getState(editor.state);
        if (state?.active) {
          editor.commands.deleteRange(state.range);
        }

        command.action(editor);
        editor.view.focus();
      },
    });

    return [
      Suggestion<SlashCommandGroup, Command>({
        editor: this.editor,
        char: '/',
        allowSpaces: true,
        startOfLine: true,
        pluginKey,

        command({ editor, props }) {
          props.action(editor);
        },

        items: ({ query }) => {
          const keyword = query.toLowerCase().trim();

          return this.options.groups
            .map((group) => ({
              ...group,
              commands: group.commands
                .filter((item) =>
                  [item.name, item.label, ...(item.aliases ?? [])].some(
                    (value) => value.toLowerCase().trim().includes(keyword),
                  ),
                )
                .filter((item) => !item.shouldHidden?.(this.editor))
                .map(prepareCommand),
            }))
            .filter((group) => group.commands.length > 0);
        },

        render: this.options.render,
      }),
    ];
  },
});

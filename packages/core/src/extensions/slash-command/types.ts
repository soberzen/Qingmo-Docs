import type { Editor } from '@tiptap/core';
import type { SuggestionProps } from '@tiptap/suggestion';

export type SlashCommandGroup = {
  name: string;
  title: string;
  commands: Command[];
};

export type Command = {
  name: string;
  label: string;
  description: string;
  aliases?: string[];
  action: (editor: Editor) => void;
  shouldHidden?: (editor: Editor) => boolean;
};

export type SlashCommandSuggestionProps = SuggestionProps<
  SlashCommandGroup,
  Command
>;

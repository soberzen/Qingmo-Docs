export { Document } from './basic-node/document';
export { Paragraph } from './basic-node/paragraph';
export { Text } from './basic-node/text';
export { CodeHighlight } from './extensions/code-highlight/code-highlight';
export { CodeBlock } from './nodes/code-block';
export { MathBlock, type MathBlockOptions } from './nodes/math-block';
export { MathInline, type MathInlineOptions } from './nodes/math-inline';
export {
  SlashCommand,
  type SlashCommandOptions,
} from './extensions/slash-command/slash-command';
export type {
  Command,
  SlashCommandGroup,
  SlashCommandSuggestionProps,
} from './extensions/slash-command/types';
export type { SupportedLanguageConfig } from './utils/supportedLanguages';
export { defaultSupportedLanguages } from './utils/supportedLanguages';
import './style/index.css';

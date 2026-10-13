# React

`@qingmo/react` is the React integration and public editor entry for Qingmo. It
depends on `@qingmo/core` for editor behavior and `@qingmo/editor-ui` for view
components. It owns editor initialization, hooks, context, and component
composition. Concrete styled components are implemented in editor-ui, not here.

The current entry exports shared editor-ui components and the React `CodeBlock`
extension. There is no direct dependency on shadcn or Tailwind.

## Code block node views

Import `CodeBlock` from `@qingmo/react` in a React editor. It extends core's
`CodeBlock` and adds a node view through `renderNodeView`, which wraps Tiptap's
`ReactNodeViewRenderer`. Register this extension once instead of also
registering core's `CodeBlock`; both use the same `codeBlock` node name.

```tsx
import { CodeBlock } from '@qingmo/react';

const codeBlock = CodeBlock.configure({ defaultLanguage: 'javascript' });
```

The node view adapter passes node attributes and editor callbacks to editor-ui's
`CodeBlockFrame`. Language changes call `updateAttributes({ language })`;
copying uses the node's text content. `NodeViewContent` hosts the editable code,
which ProseMirror owns, including syntax highlighting decorations. The language
picker is disabled in a read-only editor, while copying remains available.

Core retains the schema, commands, parsing, and HTML serialization. The React
toolbar only appears in the editor and is not included in document JSON or
exported HTML. Other React node views can follow the same extension-and-adapter
pattern.

## Mention menus

`createMentionCommandRenderer(Component)` adapts core's `Mention.render` to a
React component. `MentionCommandComponentProps` includes the suggestion range,
`command`, a stable `onClose` callback, and a ref to `MentionCommandHandle`. The
renderer creates the React portal, passes updated suggestion props, forwards
editor keyboard events, and uses `props.mount` for positioning and cleanup.

Use editor-ui's `MentionCommandMenu` through this package's public export. The
menu owns its input and remote search; suggestion `query` and `items` do not
provide those search results. Pass the menu's selected item to `props.command`
and bridge `MentionCommandHandle.onKeyDown({ event })` to
`MentionCommandMenuHandle.onKeyDown(event)`.

Closing the menu or pressing Escape dismisses core's Mention suggestion and
returns focus with `editor.view.focus()`. The renderer creates and mounts the
component in `onStart`, updates its props in `onUpdate`, and cleans it up in
`onExit`. A menu input should focus after mounting, such as in a cancellable
animation frame from its effect. Exiting an open menu removes both its
positioning listeners and React portal.

## Imports and styles

Applications consume the public React entry:

```tsx
import { EditorFrame } from '@qingmo/react';
```

Import the stylesheet once from the application's CSS entry:

```css
@import '@qingmo/react/styles.css';

@source './';
```

This stylesheet forwards editor-ui's style entry, including its source
registration and the shared shadcn theme, and core's syntax highlighting styles.
Applications own their fonts and page layout and use Tailwind's Vite plugin to
compile the styles.

## Package boundaries

- core: schemas, commands, parsing, serialization, and highlighting
- react: integration, state, hooks, composition, and public editor exports
- editor-ui: concrete node views, toolbars, menus, and editor layouts
- shadcn: generic UI primitives, utilities, and theme

Editor UI must not import this package. Receive editor state and callbacks
through props to keep the dependency direction from React to editor-ui.

## Scripts

Run from the repository root:

- `pnpm --filter @qingmo/react build`
- `pnpm --filter @qingmo/react dev`
- `pnpm --filter @qingmo/react clean`
- `pnpm --filter @qingmo/react check-types`

JavaScript and types use the existing tsdown dist build. The CSS subpath exposes
the source stylesheet. Use `pnpm dev:playground` to build dependencies and run
the editor package watchers alongside the playground.

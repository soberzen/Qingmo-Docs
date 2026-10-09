# React

`@qingmo/react` is the React integration and public editor entry for Qingmo. It
depends on `@qingmo/core` for editor behavior and `@qingmo/editor-ui` for view
components. It owns editor initialization, hooks, context, and component
composition. Concrete styled components are implemented in editor-ui, not here.

The current entry exports `EditorFrame`, `ImageBlockFrame`, and their props
from editor-ui. Editor initialization APIs and concrete node views will be
added as the editor is implemented. There is no direct dependency on shadcn
or Tailwind.

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
registration and the shared shadcn theme. Applications own their fonts and page
layout and use Tailwind's Vite plugin to compile the styles.

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

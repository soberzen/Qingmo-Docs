# Editor UI

`@qingmo/editor-ui` is the private source package for Qingmo's editor interface.
It depends on React and the generic `@qingmo/shadcn` UI package. It does not
depend on `@qingmo/react`; that package composes and exports these components.

Concrete React node views, code block controls, toolbars, node menus, and the
styled editor composition belong here. Editor schemas, commands, parsing,
serialization, and highlighting stay in `@qingmo/core`. React hooks, editor
state, and composition stay in `@qingmo/react`. View components receive the
state and callbacks they need through props.

## Current entry

`EditorFrame` provides a shared layout with an optional toolbar slot, a content
area, standard div props, and the shared theme. It does not create an editor
instance; editor initialization APIs and concrete node views are still pending.

```tsx
import { EditorFrame } from '@qingmo/react';

<EditorFrame toolbar={<span>文档</span>}>
  <p>编辑器内容区域</p>
</EditorFrame>;
```

The public source exports are:

- `@qingmo/editor-ui`: components and their public types
- `@qingmo/editor-ui/components/*`: individual editor components
- `@qingmo/editor-ui/styles.css`: shared theme and editor UI source registration

Use package imports. Keep internal editor UI imports relative, and keep generic
primitives in shadcn rather than copying them into this package.

## Styles

The host application imports one stylesheet in its CSS entry:

```css
@import '@qingmo/react/styles.css';

@source './';
```

The React entry forwards this package’s stylesheet, which imports
`@qingmo/shadcn/styles.css` once and explicitly registers the editor UI source
for Tailwind v4. The shadcn stylesheet registers its own source. The host
registers its application source and owns its fonts and page layout. Hosts still
need Tailwind's Vite plugin to compile the styles.

## Development

There is no separate build or publishing workflow. Vite compiles this package's
source in web and playground; core and React retain their existing dist builds.
Run these commands from the repository root:

```sh
pnpm dev:playground
pnpm exec turbo run check-types --filter=@qingmo/editor-ui
pnpm exec turbo run build --filter=@qingmo/playground
```

`pnpm dev:playground` starts core and React build watchers alongside Vite. Vite
watches editor UI and shadcn source directly.

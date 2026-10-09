# React

React bindings for the Qingmo Docs editor core.

The package depends on `@qingmo/shadcn` through `workspace:*` so editor UI can
use the same components and theme as the web app. This dependency does not add
editor UI or change the React package's existing build.

## Shared UI

Import shared components and utilities by package name:

```tsx
import { Button } from '@qingmo/shadcn/components/button';
import { cn } from '@qingmo/shadcn/lib/utils';
```

The host application imports `@qingmo/shadcn/styles.css` once in its CSS entry,
adds an `@source` directive for its own source files, and controls its fonts and
page layout. See [the shared UI package](../shadcn/README.md) for setup and CLI
usage.

## Scripts

- `pnpm build`
- `pnpm dev`
- `pnpm clean`
- `pnpm check-types`

## Structure

- `src/index.ts` public entry
- `dist/` build output

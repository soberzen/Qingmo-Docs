# Shared UI

`@qingmo/shadcn` is a private source package for reusable components, utilities,
and the Qingmo Docs theme. The web app and React bindings consume it through
`workspace:*`. There is no separate build or npm publishing workflow.

## Components

- Standard UI: Button, Checkbox, Input, Label, Separator, Field, and Toaster
- Additional UI: PasswordToggleButton, InteractiveHoverButton, and LumaSpin
- Utilities: `cn`, `showToast`, and `ToastType`
- Styles: theme colors, radii, light and dark themes, shared base rules, and the
  LumaSpin animation

App-specific UI, including the login page's `AnimatedCharacters`, belongs in the
web app. Pages, forms, routes, and state management stay with their consumers.

## Imports

```tsx
import { Button } from '@qingmo/shadcn/components/button';
import { cn } from '@qingmo/shadcn/lib/utils';
import { showToast } from '@qingmo/shadcn/lib/toast';
```

Source exports are available under `@qingmo/shadcn/components/*`,
`@qingmo/shadcn/lib/*`, and `@qingmo/shadcn/hooks/*`. Use these package paths
instead of importing another package's source by relative path or a TypeScript
alias.

`showToast` provides success, error, info, warning, and loading notifications.
Defaults are top-center placement, a 3000 ms duration, and rich colors; per-call
options override them. Mount `Toaster` once in the host application. Keep
business conditions and notification messages in the calling application.

## Styles

Import the shared stylesheet once from the host application's CSS entry. For an
entry inside the application's `src` directory:

```css
@import '@qingmo/shadcn/styles.css';

@source "./";
```

The shared stylesheet scans this package's source. The application's `@source`
directive scans its own source; adjust that path relative to its CSS entry if
needed. The host application owns font declarations and mappings, page layout,
and app-specific animations such as `eye-blink`.

## Adding Components

Run from the repository root:

```sh
pnpm shadcn:add dialog
```

This command uses the CLI installed in this package with the web app as its
working directory. The paired `components.json` configurations direct shared UI
components to this package and business blocks to the web app. Both use
`radix-nova`, neutral colors, lucide icons, and `rsc: false`.

Registry access is required when adding components or running a registry-backed
dry run. After generating a component, keep its internal imports relative to
this package and check the affected consumers.

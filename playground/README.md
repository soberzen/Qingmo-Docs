# Qingmo Playground

用于独立调试 `@qingmo/react` 和 `@qingmo/shadcn` 的 Vite +
React 应用。React 包负责适配与组装，具体编辑器组件由 editor-ui 实现。

## 开发

在仓库根目录运行：

```sh
pnpm install
pnpm dev:playground
```

默认访问
`http://localhost:5174`。命令同时启动 core、React 包的构建监听和 playground。Vite 直接监听 editor-ui 和 shadcn 源码。

playground 启动前会通过 Turbo 构建 React 包及其依赖，因为 React 和 core 的入口指向
`dist`。只启动页面时可运行
`pnpm --filter @qingmo/playground dev`，该命令先构建依赖，但不持续监听编辑器包。根目录的
`pnpm dev` 也会启动 playground。

当前页面通过 React 包使用 editor-ui 的 `EditorFrame`
布局组件，并保留共享基础组件和通知示例。编辑器初始化 API 和具体 NodeView 尚未实现；后续节点界面放在 editor-ui 中。

## 构建与检查

在仓库根目录运行：

```sh
pnpm exec turbo run build --filter=@qingmo/playground
pnpm exec turbo run check-types --filter=@qingmo/playground
pnpm --filter @qingmo/playground preview
```

Turbo 按依赖顺序构建 core、React 包和 playground。editor-ui 与 shadcn 是源码包，由 playground 的 Vite 编译，不需要单独构建。

## 样式与组件

playground 安装 `tailwindcss` 和 `@tailwindcss/vite`，在 Vite 中启用 Tailwind
v4 插件。`src/index.css` 导入
`@qingmo/react/styles.css`，该入口转发 editor-ui 样式，统一导入共享主题，并注册 editor-ui 和 shadcn 源码中的类名。页面通过
`@source` 注册自身源码。

组件和工具通过包名导入：

```tsx
import { EditorFrame } from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { showToast } from '@qingmo/shadcn/lib/toast';
```

新增基础组件时运行：

```sh
pnpm --filter @qingmo/playground shadcn:add dialog
```

命令使用共享包中的 CLI 和 playground 的 `components.json`。基础 UI 组件生成到
`packages/shadcn`，业务组件生成到 playground 的
`src/components`。复用的编辑器组件由 `packages/editor-ui` 维护。

可在命令后添加 `--dry-run --view dialog.tsx`
查看生成内容。目前 registry 的新模板会提示新增 `cn`
依赖，并可能覆盖已有的 Button；现有组件仍使用共享包的
`lib/utils.ts`。playground 接入时仅验证了生成位置，没有实际添加新组件或 `cn`
依赖。

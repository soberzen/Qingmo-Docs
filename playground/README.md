# Qingmo Playground

用于独立调试 `@qingmo/react` 和 `@qingmo/shadcn` 的 Vite + React 应用。

## 开发

在仓库根目录运行：

```sh
pnpm install
pnpm dev:playground
```

默认访问
`http://localhost:5174`。命令同时启动 core、React 包的构建监听和 playground。playground 启动前会通过 Turbo 构建 React 包及其依赖，因为 React 包的入口指向
`dist`。

只启动页面时可运行
`pnpm --filter @qingmo/playground dev`，该命令先构建依赖，但不持续监听编辑器包。根目录的
`pnpm dev` 也会启动 playground。

React 包目前只有占位入口，尚未导出编辑器组件。当前页面提供共享组件和通知示例，并保留后续编辑器接入位置。

## 构建与检查

```sh
pnpm exec turbo run build --filter=@qingmo/playground
pnpm exec turbo run check-types --filter=@qingmo/playground
pnpm --filter @qingmo/playground preview
```

Turbo 按依赖顺序构建 core、React 包和 playground。shadcn 是源码包，由 Vite 编译，不需要单独构建。

## 样式与组件

playground 配置 `tailwindcss` 和 `@tailwindcss/vite`。`src/index.css` 导入
`@qingmo/shadcn/styles.css`，复用共享主题和 Tailwind 入口，再用 `@source`
注册 playground 和 React 包源码。共享样式已注册自身源码，不需要复制主题。

组件与工具通过包名导入：

```tsx
import { Button } from '@qingmo/shadcn/components/button';
import { showToast } from '@qingmo/shadcn/lib/toast';
```

新增基础组件时运行：

```sh
pnpm --filter @qingmo/playground shadcn:add dialog
```

命令使用共享包中的 CLI 和 playground 的 `components.json`。基础组件生成到
`packages/shadcn`，业务组件生成到 playground 的 `src/components`。

可添加 `--dry-run --view dialog.tsx` 查看内容。目前 registry 新模板会提示新增
`cn` 依赖，并可能覆盖已有 Button；现有组件仍使用共享
`lib/utils.ts`。此次接入只验证生成位置，没有实际添加组件或 `cn` 依赖。

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
布局组件，并保留图片块、共享基础组件和通知示例。数学公式区域直接初始化 Tiptap
Editor，加载 core 中的 `MathBlock`，用于测试节点实现。

## MathBlock 测试

测试组件位于 `src/components/math-block-demo.tsx`，KaTeX 样式在 `src/main.tsx`
导入。修改 `packages/core/src/nodes/math-block.ts` 后，使用
`pnpm dev:playground` 持续构建 core，让页面加载最新实现。

页面可进行以下测试：

1. 点击“选择第一条公式”，修改上方 LaTeX，再点击更新或删除。首条公式位于
   `pos = 0`。
2. 点击编辑器空白段落，在上方输入 LaTeX，然后点击“插入公式”。
3. 在编辑器空白段落逐字输入
   `$$a+b$$`，展开“查看当前文档 JSON”检查转换结果。粘贴不会触发键入规则。
4. 把公式更新为 `\unknown`，检查错误显示，再改回 `\sqrt{x}`，检查是否恢复。
5. 点击“切换只读”检查输入和按钮状态。
6. 点击“测试 HTML 序列化”，检查 `getHTML()` 的结果或错误。

2026-10-10 初始版本浏览器实测：

| 测试                                 | 结果                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| KaTeX 渲染、插入、显式位置更新和删除 | 通过，包括 `pos = 0`                                                                  |
| 无效 LaTeX 错误显示、修改后恢复      | 通过                                                                                  |
| 只读状态                             | 编辑器不可输入，修改按钮禁用                                                          |
| 输入 `$$a+b$$`                       | 生成公式，但前后保留文本为 `$$` 的段落                                                |
| 点击首条公式                         | 能选中节点，但 `if (!pos)` 拦住位置 `0` 的点击回调                                    |
| HTML 序列化                          | 抛出 `Content hole not allowed in a leaf node spec`；数学叶节点的 `renderHTML` 含 `0` |

上表中的三处问题已在当前实现中修正：输入规则的第一捕获组包含完整语法、点击判断显式检查
`undefined`、数学叶节点的 HTML 渲染移除内容占位符。完整语法替换仍可能留下空段落。

测试页直接加载 core 的 MathBlock。共享 `Paragraph.renderHTML`
当前缺少内容占位符，测试页通过局部 `DemoParagraph` 补上
`0`，保证段落文字和键入测试正常；共享 Paragraph 源码没有改动。

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

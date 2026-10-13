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
Editor，加载 core 中的 `MathBlock` 和 `MathInline`，用于测试节点实现。

## Slash Command 测试

测试组件位于 `src/components/slash-command-demo.tsx`。编辑器加载 core 的
`SlashCommand`，通过 React 包的 `createSlashCommandRenderer` 渲染共享
`SlashCommandMenu`。示例使用 `useEditor` 和
`EditorContent`，后者提供 ReactRenderer 所需的 portal 容器。

1. 在空白段落开头输入 `/`，或点击“打开命令菜单”，查看基础内容与数学公式分组。
2. 输入 `/代码`、`/co`、`/for`、`/INLINE` 或
   `/math-block`，检查中文显示名称、部分别名和命令名称筛选。core 对
   `name`、`label` 和 `aliases` 都做包含匹配，忽略大小写与首尾空格；输入
   `/不存在` 检查空状态。
3. 使用 ↑ /
   ↓ 切换命令、Enter 执行，或直接点击命令。检查插入的段落、代码块、块公式和行内公式，以及文档 JSON 中是否已移除斜杠和搜索词。
4. 输入 `/` 后按 Esc 关闭菜单。在正文中间输入 `/` 不触发菜单，因为 core 配置了
   `startOfLine: true`。
5. 插入代码块后，在空代码块开头输入 `/`。此时仅显示“文本段落”，用于检查
   `shouldHidden`；选择它可以回到正文。
6. 点击“切换只读”检查编辑器与打开菜单按钮，再点击“重置示例”恢复初始内容。

编辑器中的代码块使用 React 包导出的 `CodeBlock`
扩展，core 的代码块定义保持独立。初始内容包含一段 JavaScript，斜杠命令插入的代码块也使用同一个视图。示例同时加载 core 的
`CodeHighlight`，用于检查语法高亮在代码视图中正常显示。React 扩展继承 core 的
`renderHTML`，工具栏只用于编辑器界面，不会进入文档 JSON 或导出 HTML。

新增示例命令时修改 `groups`，使用 React 包导出的 `SlashCommandMenuGroup[]`
类型，为命令提供 `name`、`label`、`description`、可选 `aliases`、可选 `icon` 和
`action(editor)`。`icon` 接受 `ReactNode`，例如
`<CodeXml />`；不提供时保留原有文字布局。 `SlashCommandMenuCommand` 和
`SlashCommandMenuGroup` 由 editor-ui 定义，并通过 `@qingmo/react`
导出；图标只属于菜单展示，core 的命令类型不依赖 React。editor-ui 的
`SlashCommandMenu`
内部维护选中项，负责鼠标悬停、上下键选择和 Enter 确认；筛选结果变化时从首项开始。组件通过
`SlashCommandMenuHandle.onKeyDown(event)`
暴露按键入口，playground 适配层只转发 Suggestion 的按键事件，并把 `editor`
和分组传给菜单。菜单选中命令后直接调用
`action(editor)`；core 为返回的命令包装 action，先清除当前 Suggestion 范围内的斜杠和搜索词，再执行原始 action 并恢复编辑器焦点。位置与挂载由 core 的 Suggestion 管理。

## Mention 提及测试

`src/components/mention-demo.tsx` 接入 core 的 `Mention`、React 的
`createMentionCommandRenderer` 和 editor-ui 的 `MentionCommandMenu`。输入 `@`
打开浮层后，焦点进入浮层的搜索框。搜索词和结果由菜单自己维护，不使用编辑器中的
`Suggestion.query` 或 `props.items`。

演示通过 `fetch('/api/playground/mentions?q=...')`
发起 HTTP 请求。Vite 的本地开发和 preview 服务使用 `src/data/mention-items.ts`
中的演示用户、文章响应请求；实际项目通过 `searchItems(searchText, { signal })`
传入业务搜索接口。

1. 在正文任意位置输入 `@`，或点击“打开提及弹窗”，检查搜索框自动获得焦点。
2. 搜索“张”“alice”“代码”或“协作”，点击结果或使用 ↑ / ↓ 和 Enter 插入。原来的 `@`
   被替换为完整提及，弹窗关闭，焦点返回编辑器。
3. 搜索不存在的词，检查空状态；搜索
   `error`，检查错误和重试入口。清空搜索后显示推荐项。
4. 快速更换搜索词，确认旧请求不会覆盖新结果；按 Esc 或关闭按钮取消，正文保留
   `@`。
5. 提及后的光标位置按 Backspace，检查整体删除；切换只读，检查不能插入、删除或打开菜单。
6. 展开“查看提及 JSON、HTML 和纯文本”，检查 `id/label` 保存在 JSON 中，HTML 保存
   `data-id/data-label` 并显示 `@名称`，纯文本同样保留显示名称。

## Placeholder 测试

斜杠命令和数学公式编辑器都加载 core 导出的 `Placeholder`。通过
`placeholder({ node })` 为段落提供不同提示，其他节点返回空字符串。保持默认的
`showOnlyCurrent: true` 和
`showOnlyWhenEditable: true`：只在当前空段落显示占位文字，切换只读时隐藏。

占位样式位于 `src/index.css`，使用 `p.is-empty[data-placeholder]::before` 和
`content: attr(data-placeholder)` 显示提示。

1. 点击编辑器中的空段落，查看占位提示；输入文字后提示消失，删除文字后恢复。
2. 点击斜杠命令区域的“清空内容”，查看整篇文档为空时的提示；点击“重置示例”恢复内容。
3. 切换只读，检查占位提示隐藏；恢复编辑后再次显示。
4. 展开当前文档 JSON，确认占位文字没有写入正文。

## 代码块语言选择测试

共享组件区域的 `CodeBlockFrame` 使用 `App.tsx` 中的 `codeLanguage`
state作为当前语言，`supportedLanguages` 提供 `{ id, name, match }` 配置，
`onLanguageChange`
更新 state。点击工具栏中的语言名称可打开搜索菜单，按显示名称、语言 ID 或别名搜索，例如
`JavaScript`、`ts`、`py`；选择后检查工具栏名称、选中标记和下方当前语言 ID。也可使用 ↑
/ ↓ 和 Enter 选择，按 Esc 关闭。

斜杠命令编辑器中的代码块可进行以下测试：

1. 直接修改示例代码，展开“查看当前文档 JSON”，检查 `codeBlock.content`
   同步更新，且 JSON 仅保留代码节点、语言属性与正文，没有工具栏内容。
2. 点击代码块工具栏的语言名称，搜索并选择 Python，检查工具栏显示 Python，且 JSON 中
   `codeBlock.attrs.language` 变为 `python`。
3. 在空白段落通过 `/code` 插入新的代码块，检查工具栏、语言选择和正文输入。
4. 点击“切换只读”，检查代码正文不可编辑，语言选择不能修改，复制仍可用；点击“恢复编辑”后继续修改代码和语言。

## MathBlock 测试

测试组件位于 `src/components/math-block-demo.tsx`，KaTeX 样式在 `src/main.tsx`
导入。修改 `packages/core/src/nodes/math-block.ts` 后，使用
`pnpm dev:playground` 持续构建 core，让页面加载最新实现。

页面可进行以下测试：

1. 点击“选择第一条公式”，修改上方 LaTeX，再点击更新或删除。首条公式位于
   `pos = 0`。
2. 点击编辑器空白段落，在上方输入 LaTeX，然后点击“插入块公式”。
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

## MathInline 测试

行内公式与块公式共用测试编辑器和 LaTeX 输入框。MathInline 使用
`span[data-type="math-inline"]` 保存 HTML，公式内容保存在
`data-latex`，KaTeX 以行内模式显示。Markdown 使用
`$...$`，节点和 tokenizer 名称均为 `mathInline`。

1. 在空白段落逐字输入
   `before $a+b$ after`，检查正文、公式、正文是否保持在同一段落，且公式前后没有残留
   `$`。
2. 输入
   `$$a+b$$`，检查仍生成块公式；行内规则跳过双美元符号、转义的起始美元符号和跨行公式。
3. 点击“选择第一条行内公式”，修改 LaTeX 后点击更新或删除。也可以点击编辑器中的行内公式直接选择。
4. 点击正文中的插入位置，在上方填写 LaTeX，再点击“插入行内公式”；插入后可继续输入正文。
5. 使用 `\unknown` 检查错误显示，再改回 `\sqrt{x}`
   检查恢复；切换只读和测试 HTML 序列化也同时适用于行内公式。

公开命令与 MathBlock 对应，均支持可选的节点位置 `pos`：

```ts
editor.commands.insertInlineMath({ latex: 'a+b' });
editor.commands.updateInlineMath({ latex: 'x^2', pos });
editor.commands.deleteInlineMath({ pos });
```

## Markdown 导入和导出

公式测试区提供“Markdown 源码”输入框、“从 Markdown 导入”和“导出 Markdown”按钮。导入会替换当前示例文档。默认样例同时包含正文、`$a+b$`
行内公式、多行 `$$...$$`
块公式和公式后的正文；导出结果可以复制回源码框再次导入。

测试页加载 `@tiptap/markdown`，实际调用
`editor.markdown.parse()`，再把解析结果交给 `setContent()`。解析器的根节点叫
`doc`，Qingmo 的根节点叫 `document`，所以导入时将根节点类型映射到
`editor.schema.topNodeType.name`。空 Markdown 补一个空段落，满足 `block+`
的结构要求。导出调用 `editor.getMarkdown()`。

这条路径会运行公式扩展的 `markdownTokenizer` 和 `parseMarkdown`，不是
`addInputRules()` 或
`addPasteRules()`。输入规则负责逐字键入，粘贴规则负责编辑器粘贴事件，两者不等于整篇 Markdown 导入。

2026-10-10 已通过真实解析和编辑器集成验证：正文和两类公式混排、多条行内公式、单行块公式、多行块公式中的 LaTeX 反斜杠、导出后再次导入和空输入，共 6 个场景。浏览器也已验证默认样例渲染，以及导出后再次导入的文档 JSON 保持一致。当前正则及正文序列化对转义美元符号的处理仍有限制，暂不保证
`\$` 的完整往返转换。

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

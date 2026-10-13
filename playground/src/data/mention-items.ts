export const demoMentionItems = [
  {
    id: 'user:zhang',
    label: '张三',
    kind: 'user',
    description: '产品设计 · zhangsan',
  },
  {
    id: 'user:li',
    label: '李四',
    kind: 'user',
    description: '前端开发 · lisi',
  },
  {
    id: 'user:wang',
    label: '王小明',
    kind: 'user',
    description: '协作成员 · wang',
  },
  {
    id: 'user:alice',
    label: 'Alice Chen',
    kind: 'user',
    description: '文档维护 · alice',
  },
  {
    id: 'article:guide',
    label: 'Qingmo 入门指南',
    kind: 'article',
    description: '文章 · 编辑器与文档使用说明',
  },
  {
    id: 'article:code',
    label: '代码块使用说明',
    kind: 'article',
    description: '文章 · 语言选择与语法高亮',
  },
  {
    id: 'article:collaboration',
    label: '协作文档设计',
    kind: 'article',
    description: '文章 · CRDT 与多人协作',
  },
] as const;

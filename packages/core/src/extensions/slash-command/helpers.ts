import type { ResolvedPos } from '@tiptap/pm/model';

export function getSlashCommandStart(
  $head: ResolvedPos,
  $from: ResolvedPos,
  end: number,
): number {
  const nodeBefore = $head.nodeBefore;

  // 光标前没有节点，使用当前段落的起点
  if (!nodeBefore) {
    return $from.start();
  }

  const text = nodeBefore.text ?? '';
  const slashIndex = text.indexOf('/');
  const textToDelete = text.substring(slashIndex);

  return end - textToDelete.length;
}

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';
import { type Decoration, DecorationSet } from '@tiptap/pm/view';

export class DecorationCache {
  private cache: Map<
    number,
    [node: ProseMirrorNode, decorations: Decoration[]]
  >;
  constructor(
    cache?: Map<number, [node: ProseMirrorNode, decorations: Decoration[]]>,
  ) {
    this.cache = new Map(cache);
  }

  get(pos: number) {
    return this.cache.get(pos);
  }

  set(pos: number, node: ProseMirrorNode, decorations: Decoration[]): void {
    if (pos < 0) {
      return;
    }

    this.cache.set(pos, [node, decorations]);
  }

  private replace(
    oldPos: number,
    newPos: number,
    node: ProseMirrorNode,
    decorations: Decoration[],
  ) {
    this.remove(oldPos);
    this.set(newPos, node, decorations);
  }

  remove(pos: number): void {
    this.cache.delete(pos);
  }

  invalidate(tr: Transaction): DecorationCache {
    const returnCache = new DecorationCache(this.cache);
    const mapping = tr.mapping;

    this.cache.forEach(([node, decorations], pos) => {
      if (pos < 0) {
        return;
      }

      const result = mapping.mapResult(pos);

      const mappedNode = tr.doc.nodeAt(result.pos);

      if (result.deleted || !mappedNode?.eq(node)) {
        returnCache.remove(pos);
      } else if (pos !== result.pos) {
        const updatedDecorations = DecorationSet.create(tr.before, [
          ...decorations,
        ])
          .map(mapping, tr.doc)
          .find();
        returnCache.replace(pos, result.pos, mappedNode, updatedDecorations);
      }
    });

    return returnCache;
  }
}

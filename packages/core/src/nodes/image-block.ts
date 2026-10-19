import { mergeAttributes, type Range } from '@tiptap/core';
import { Image as TiptapImage } from '@tiptap/extension-image';

export type ImageBlockAlign = 'left' | 'center' | 'right';

export interface ImageBlockAttributes {
  src: string;
  alt?: string | null;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  align?: ImageBlockAlign;
  caption?: string | null;
}

function getImageAttribute(element: HTMLElement, name: string) {
  const image = element.matches('img') ? element : element.querySelector('img');
  return (
    element.getAttribute(`data-${name}`) ?? image?.getAttribute(name) ?? null
  );
}

function parseImageSize(value: string | null) {
  const size = Number(value);
  return Number.isFinite(size) && size > 0 ? Math.round(size) : null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageBlock: {
      setImageBlock: (attributes: ImageBlockAttributes) => ReturnType;
      setImageBlockAt: (
        attributes: ImageBlockAttributes & {
          pos: number | Range;
        },
      ) => ReturnType;
      updateImageBlock: (
        attributes: Partial<ImageBlockAttributes>,
      ) => ReturnType;
      setImageBlockAlign: (align: ImageBlockAlign) => ReturnType;
      setImageBlockCaption: (caption: string | null) => ReturnType;
      setImageBlockWidth: (width: number) => ReturnType;
      deleteImageBlock: () => ReturnType;
    };
  }
}

export const ImageBlock = TiptapImage.extend({
  name: 'imageBlock',

  group: 'block',

  inline: false,

  atom: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) => getImageAttribute(element, 'src') ?? '',
        renderHTML: (attributes) => {
          if (attributes.src) {
            return {
              'data-src': attributes.src,
            };
          }
          return {};
        },
      },
      alt: {
        default: '',
        parseHTML: (element) => getImageAttribute(element, 'alt') ?? '',
        renderHTML: (attributes) => {
          if (attributes.alt) {
            return {
              'data-alt': attributes.alt,
            };
          }
          return {};
        },
      },
      title: {
        default: '',
        parseHTML: (element) => getImageAttribute(element, 'title') ?? '',
        renderHTML: (attributes) => {
          if (attributes.title) {
            return {
              'data-title': attributes.title,
            };
          }
          return {};
        },
      },
      width: {
        default: null,
        parseHTML: (element) =>
          parseImageSize(getImageAttribute(element, 'width')),
        renderHTML: (attributes) => {
          if (attributes.width) {
            return {
              'data-width': attributes.width,
            };
          }
          return {};
        },
      },
      height: {
        default: null,
        parseHTML: (element) =>
          parseImageSize(getImageAttribute(element, 'height')),
        renderHTML: (attributes) => {
          if (attributes.height) {
            return {
              'data-height': attributes.height,
            };
          }
          return {};
        },
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => {
          if (attributes.align) {
            return {
              'data-align': attributes.align,
            };
          }
          return {};
        },
      },
      caption: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-caption') ??
          element.querySelector('figcaption')?.textContent ??
          '',
        renderHTML: (attributes) => {
          if (attributes.caption) {
            return {
              'data-caption': attributes.caption,
            };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-block-type="image"]',
        getAttrs: (element) => {
          const src = getImageAttribute(element, 'src');
          return !this.options.allowBase64 && src?.startsWith('data:')
            ? false
            : null;
        },
      },
      {
        tag: this.options.allowBase64
          ? 'img[src]'
          : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = node.attrs?.caption || '';

    return [
      'figure',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-block-type': 'image',
      }),
      [
        'img',
        {
          src: node.attrs.src || null,
          alt: node.attrs.alt || '',
          title: node.attrs.title || null,
          width: node.attrs.width,
          height: node.attrs.height,
        },
      ],
      ...(caption ? [['figcaption', {}, caption]] : []),
    ];
  },

  addCommands() {
    return {
      ...this.parent?.(),

      setImageBlock:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: attributes,
          }),

      setImageBlockAt:
        ({ pos, ...attributes }) =>
        ({ commands }) =>
          commands.insertContentAt(pos, {
            type: this.name,
            attrs: attributes,
          }),
      updateImageBlock:
        (attributes) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, attributes),

      setImageBlockAlign:
        (align) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { align }),

      setImageBlockCaption:
        (caption) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, {
            caption: caption?.trim() || null,
          }),

      setImageBlockWidth:
        (width) =>
        ({ commands }) => {
          if (!Number.isFinite(width) || width <= 0) {
            return false;
          }
          return commands.updateAttributes(this.name, {
            width: Math.round(width),
            height: null,
          });
        },

      deleteImageBlock:
        () =>
        ({ tr, dispatch }) => {
          const pos = tr.selection.$from.pos;

          const node = tr.doc.nodeAt(pos);

          if (!node || node.type.name !== this.name) {
            return false;
          }

          if (dispatch) {
            tr.delete(pos, pos + node.nodeSize);
          }
          return true;
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const wrapper = document.createElement('div');
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      const figcaption = document.createElement('figcaption');

      wrapper.dataset.nodeType = this.name;
      wrapper.contentEditable = 'false';
      figure.style.maxWidth = '100%';
      img.style.display = 'block';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.draggable = false;
      figcaption.style.marginTop = '0.5rem';
      figcaption.style.textAlign = 'center';

      const attributes = mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          'data-block-type': 'image',
        },
      );
      for (const [name, value] of Object.entries(attributes)) {
        if (value != null) figure.setAttribute(name, String(value));
      }

      figure.append(img);
      wrapper.append(figure);

      function render(currentNode: typeof node) {
        const { src, alt, title, width, height, align, caption } =
          currentNode.attrs;

        // 复用图片元素，只更新变化的属性，避免无关更新重新加载图片。
        const imageAttributes = { src, alt: alt ?? '', title, width, height };
        for (const [name, value] of Object.entries(imageAttributes)) {
          if (value == null || value === '') {
            if (name === 'alt') img.setAttribute(name, '');
            else img.removeAttribute(name);
          } else if (img.getAttribute(name) !== String(value)) {
            img.setAttribute(name, String(value));
          }
        }

        const dataAttributes = {
          src,
          alt,
          title,
          width,
          height,
          align,
          caption,
        };
        for (const [name, value] of Object.entries(dataAttributes)) {
          if (value == null || value === '')
            figure.removeAttribute(`data-${name}`);
          else figure.setAttribute(`data-${name}`, String(value));
        }

        const imageWidth =
          typeof width === 'number' && width > 0 ? width : null;
        figure.style.width = imageWidth ? `${imageWidth}px` : 'fit-content';
        img.style.height =
          typeof height === 'number' && height > 0 ? `${height}px` : 'auto';
        figure.style.marginLeft = align === 'left' ? '0' : 'auto';
        figure.style.marginRight = align === 'right' ? '0' : 'auto';

        // 图片说明保存在属性中，仅展示文本，不作为可编辑的节点内容。
        figcaption.textContent = caption || '';
        if (caption) {
          if (figcaption.parentNode !== figure) figure.append(figcaption);
        } else {
          figcaption.remove();
        }
      }

      render(node);

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type !== node.type) return false;
          render(updatedNode);
          return true;
        },
      };
    };
  },
});

import { ImageBlock as CoreImageBlock } from '@qingmo/core';

import { renderNodeView } from '../../utils/renderNodeView';
import { ImageBlockNodeView } from './image-block-node-view';

export const ImageBlock: typeof CoreImageBlock = CoreImageBlock.extend({
  addNodeView() {
    return renderNodeView({ components: ImageBlockNodeView });
  },
});

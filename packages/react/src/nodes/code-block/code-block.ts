import { CodeBlock as CoreCodeBlock } from '@qingmo/core';

import { renderNodeView } from '../../utils/renderNodeView';
import { CodeBlockNodeView } from './code-block-node-view';

export const CodeBlock: typeof CoreCodeBlock = CoreCodeBlock.extend({
  addNodeView() {
    return renderNodeView({
      components: CodeBlockNodeView,
      props: { contentDOMElementTag: 'code' },
    });
  },
});

import { ImageBlockFrame, type ImageBlockSize } from '@qingmo/editor-ui';
import { Button } from '@qingmo/shadcn/components/button';
import { useState } from 'react';

const demoImage = '/image-block-demo.svg';

function DemoCaption({ shouldFail }: { shouldFail: boolean }) {
  if (shouldFail) throw new Error('模拟图片说明渲染失败');

  return <>拖动图片四个角，可等比例调整大小。</>;
}

export function ImageBlockDemo() {
  const [width, setWidth] = useState(560);
  const [lastSize, setLastSize] = useState<ImageBlockSize>();
  const [captionFailed, setCaptionFailed] = useState(false);

  return (
    <div className='mt-6 space-y-8'>
      <div className='space-y-3'>
        <h3 className='text-sm font-medium'>拖拽调整大小</h3>
        <ImageBlockFrame
          src={demoImage}
          alt='青绿色的山峦与湖面插画'
          caption={<DemoCaption shouldFail={captionFailed} />}
          width={width}
          aspectRatio={16 / 9}
          onResizeEnd={(size) => {
            setWidth(size.width);
            setLastSize(size);
          }}
        />
        <p
          className='text-xs text-muted-foreground'
          aria-live='polite'
        >
          {lastSize
            ? `上次提交尺寸：${Math.round(lastSize.width)} × ${Math.round(lastSize.height)} px`
            : '松开角落手柄后，显示提交给编辑器的图片尺寸。'}
        </p>
        <details className='text-sm'>
          <summary className='cursor-pointer text-muted-foreground'>
            验证渲染错误边界
          </summary>
          <p className='mt-3 text-muted-foreground'>
            模拟错误后，先恢复渲染，再点击图片错误提示中的重新加载。
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setCaptionFailed(true)}
            >
              模拟渲染错误
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setCaptionFailed(false)}
            >
              恢复渲染
            </Button>
          </div>
        </details>
      </div>

      <div className='space-y-3'>
        <h3 className='text-sm font-medium'>加载失败与重试</h3>
        <p className='text-sm text-muted-foreground'>
          此图片首次加载会失败，点击重试后恢复为本地示例图片。
        </p>
        <ImageBlockFrame
          src='/image-block-missing.svg'
          alt='重试后显示的山峦与湖面插画'
          defaultWidth={400}
          aspectRatio={16 / 9}
          onRetry={async () => demoImage}
        />
      </div>

      <div className='space-y-3'>
        <h3 className='text-sm font-medium'>进入视口后加载</h3>
        <p className='text-sm text-muted-foreground'>
          向下滚动下方区域，图片进入可见范围时才开始加载。
        </p>
        <div className='h-72 overflow-y-auto rounded-lg border bg-muted/20 p-4'>
          <div className='flex h-80 items-start justify-center pt-8 text-sm text-muted-foreground'>
            图片在下方 ↓
          </div>
          <ImageBlockFrame
            src={demoImage}
            alt='滚动进入视口后加载的山峦与湖面插画'
            caption='已进入视口。'
            defaultWidth={480}
            aspectRatio={16 / 9}
            resizable={false}
          />
          <div className='h-8' />
        </div>
      </div>
    </div>
  );
}

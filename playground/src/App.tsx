import { EditorFrame } from '@qingmo/react';
import { Button } from '@qingmo/shadcn/components/button';
import { Input } from '@qingmo/shadcn/components/input';
import { Label } from '@qingmo/shadcn/components/label';
import { Separator } from '@qingmo/shadcn/components/separator';
import { Toaster } from '@qingmo/shadcn/components/sonner';
import { showToast } from '@qingmo/shadcn/lib/toast';
import { useState } from 'react';

function App() {
  const [message, setMessage] = useState('共享组件已接入 playground');
  const [count, setCount] = useState(0);

  return (
    <>
      <main className='mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-8 px-6 py-12 sm:py-16'>
        <header className='space-y-3'>
          <p className='text-sm font-medium text-muted-foreground'>
            Qingmo Docs
          </p>
          <h1 className='text-3xl font-semibold tracking-tight sm:text-4xl'>
            Playground
          </h1>
          <p className='text-sm leading-6 text-muted-foreground'>
            编辑器界面与共享 UI 的独立调试环境。
          </p>
        </header>

        <section
          aria-labelledby='editor-heading'
          className='rounded-xl border bg-card p-6 text-card-foreground'
        >
          <h2
            id='editor-heading'
            className='text-lg font-semibold'
          >
            编辑器预览
          </h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            @qingmo/react 负责适配与组装，界面组件由 @qingmo/editor-ui 实现。
          </p>
          <EditorFrame
            className='mt-6'
            toolbar={<span className='text-sm font-medium'>编辑器操作栏</span>}
          >
            <div className='flex min-h-40 items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground'>
              后续在此接入编辑器内容与节点渲染组件
            </div>
          </EditorFrame>
        </section>

        <section
          aria-labelledby='components-heading'
          className='rounded-xl border bg-card p-6 text-card-foreground'
        >
          <h2
            id='components-heading'
            className='text-lg font-semibold'
          >
            共享组件预览
          </h2>
          <p className='mt-2 text-sm leading-6 text-muted-foreground'>
            使用共享包中的组件、主题和通知工具。
          </p>
          <Separator className='my-6' />
          <form
            className='space-y-3'
            onSubmit={(event) => {
              event.preventDefault();
              showToast.success(message.trim() || '共享组件已接入 playground');
            }}
          >
            <Label htmlFor='toast-message'>通知内容</Label>
            <Input
              id='toast-message'
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder='输入一条通知'
            />
            <div className='flex flex-wrap gap-3 pt-2'>
              <Button type='submit'>发送通知</Button>
              <Button
                type='button'
                variant='outline'
                onClick={() => setCount((value) => value + 1)}
              >
                点击次数：{count}
              </Button>
            </div>
          </form>
        </section>
      </main>
      <Toaster theme='light' />
    </>
  );
}

export default App;

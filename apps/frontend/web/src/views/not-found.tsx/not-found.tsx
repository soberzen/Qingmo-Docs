import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className='flex min-h-screen w-full flex-col items-center justify-center bg-background px-6 py-12 text-center'>
      <div className='mx-auto max-w-md space-y-8'>
        <h1 className='text-9xl! font-black leading-none tracking-tighter text-primary/10 dark:text-white/20 select-none'>
          404
        </h1>

        <div className='-mt-8 space-y-6'>
          <div className='space-y-2'>
            <h2 className='text-3xl font-bold tracking-tight text-foreground'>
              页面未找到
            </h2>
            <p className='text-lg text-muted-foreground'>
              抱歉，我们无法找到您访问的页面。
            </p>
          </div>

          <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
            <Button size='lg'>
              <Link to='/'>返回首页</Link>
            </Button>

            <Button
              variant='outline'
              size='lg'
              onClick={() => navigate(-1)}
            >
              返回上一页
            </Button>
          </div>

          <p className='text-xs text-muted-foreground/50'>
            Error Code: 404_NOT_FOUND
          </p>
        </div>
      </div>
    </div>
  );
}

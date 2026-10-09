import { Button } from '@qingmo/shadcn/components/button';
import { cn } from '@qingmo/shadcn/lib/utils';
import { ImageOff, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react';
import { Component, useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';

import { useImageResize } from '../hooks/use-image-resize';
import type { ImageBlockSize } from '../hooks/use-image-resize';

export type { ImageBlockSize } from '../hooks/use-image-resize';

export type ImageBlockFrameProps = Omit<
  ComponentProps<'figure'>,
  'children' | 'onResize'
> & {
  src: string;
  alt?: string;
  caption?: ReactNode;
  /** Controlled width in CSS pixels. Update it from onResizeEnd. */
  width?: number;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  /** Placeholder ratio; the loaded image uses its intrinsic ratio. */
  aspectRatio?: number;
  resizable?: boolean;
  loading?: 'lazy' | 'eager';
  onResizeEnd?: (size: ImageBlockSize) => void;
  /** Optionally return a refreshed URL, e.g. for an expired signed URL. */
  onRetry?: () => string | void | Promise<string | void>;
};

type ErrorBoundaryProps = { children: ReactNode; fallback: ReactNode };

class ImageBlockErrorBoundary extends Component<
  ErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function ImageFailure({
  onRetry,
  retrying = false,
  message = '图片加载失败',
}: {
  onRetry: () => void;
  retrying?: boolean;
  message?: string;
}) {
  return (
    <div className='flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 p-4 text-center'>
      <ImageOff
        className='size-6 text-muted-foreground'
        aria-hidden='true'
      />
      <p
        role='status'
        className='text-sm text-muted-foreground'
      >
        {message}
      </p>
      <Button
        type='button'
        variant='outline'
        disabled={retrying}
        onClick={onRetry}
      >
        {retrying ? (
          <Loader2
            className='size-4 animate-spin'
            aria-hidden='true'
          />
        ) : (
          <RotateCcw
            className='size-4'
            aria-hidden='true'
          />
        )}
        {retrying ? '正在重试' : '重新加载'}
      </Button>
    </div>
  );
}

function ImageRequest({
  src,
  alt,
  shouldLoad,
  retrying,
  onReady,
  onRetry,
}: {
  src: string;
  alt: string;
  shouldLoad: boolean;
  retrying: boolean;
  onReady: (image: HTMLImageElement) => void;
  onRetry: () => void;
}) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    src ? 'loading' : 'error',
  );
  const imageRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(
    (image: HTMLImageElement) => {
      if (image.naturalWidth === 0 || image.naturalHeight === 0) return;
      setStatus('loaded');
      onReady(image);
    },
    [onReady],
  );

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete) {
      if (image.naturalWidth > 0) handleLoad(image);
      else setStatus('error');
    }
  }, [shouldLoad, handleLoad]);

  return (
    <div
      data-slot='image-content'
      data-state={shouldLoad ? status : 'idle'}
      className='absolute inset-0 overflow-hidden rounded-lg'
      aria-busy={shouldLoad && (status === 'loading' || retrying)}
    >
      {shouldLoad && status !== 'error' && (
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          decoding='async'
          draggable={false}
          onLoad={(event) => handleLoad(event.currentTarget)}
          onError={() => setStatus('error')}
          className={cn(
            'absolute inset-0 h-full w-full object-contain',
            status !== 'loaded' && 'invisible',
          )}
        />
      )}
      {shouldLoad && status === 'error' ? (
        <ImageFailure
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : status !== 'loaded' ? (
        <div className='flex h-full flex-col items-center justify-center gap-3 bg-muted/40 text-muted-foreground'>
          {shouldLoad ? (
            <Loader2
              className='size-6 animate-spin'
              aria-hidden='true'
            />
          ) : (
            <ImageIcon
              className='size-6'
              aria-hidden='true'
            />
          )}
          <span
            role='status'
            className='text-sm'
          >
            {shouldLoad ? '图片加载中' : '等待图片进入视口'}
          </span>
        </div>
      ) : null}
    </div>
  );
}

const resizeCorners = [
  ['top-left', '左上', '-top-3 -left-3 cursor-nwse-resize'],
  ['top-right', '右上', '-top-3 -right-3 cursor-nesw-resize'],
  ['bottom-left', '左下', '-bottom-3 -left-3 cursor-nesw-resize'],
  ['bottom-right', '右下', '-bottom-3 -right-3 cursor-nwse-resize'],
] as const;

function ImageBlockContent({
  src,
  alt = '',
  caption,
  width,
  defaultWidth = 640,
  minWidth = 120,
  maxWidth,
  aspectRatio = 16 / 9,
  resizable = true,
  loading = 'lazy',
  onResizeEnd,
  onRetry,
  className,
  ...props
}: ImageBlockFrameProps) {
  const [enteredViewport, setEnteredViewport] = useState(false);
  const [supportsObserver, setSupportsObserver] = useState(true);
  const shouldLoad =
    enteredViewport || loading === 'eager' || !supportsObserver;
  const [request, setRequest] = useState({ src, attempt: 0 });
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryPending = useRef(false);
  const mounted = useRef(false);
  const ratio =
    naturalRatio ??
    (Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9);
  const {
    containerRef,
    frameRef,
    width: renderedWidth,
    isResizing,
    getHandleProps,
  } = useImageResize({
    defaultWidth,
    minWidth,
    aspectRatio: ratio,
    resizable,
    ...(width !== undefined && { width }),
    ...(maxWidth !== undefined && { maxWidth }),
    ...(onResizeEnd && { onResizeEnd }),
  });

  useEffect(() => {
    mounted.current = true;
    // Detect support after hydration so server and client placeholders match.
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => {
        if (mounted.current) setSupportsObserver(false);
      });
    }
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (shouldLoad) return;
    const element = frameRef.current;
    if (typeof IntersectionObserver === 'undefined') return;
    if (!element) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setEnteredViewport(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad, frameRef]);

  const handleReady = useCallback((image: HTMLImageElement) => {
    setNaturalRatio(image.naturalWidth / image.naturalHeight);
  }, []);

  const handleRetry = async () => {
    if (retryPending.current) return;
    retryPending.current = true;
    setRetrying(true);
    try {
      const refreshedSrc = await onRetry?.();
      if (!mounted.current) return;
      setRequest((previous) => ({
        src: typeof refreshedSrc === 'string' ? refreshedSrc : previous.src,
        attempt: previous.attempt + 1,
      }));
      setEnteredViewport(true);
    } catch {
      // Keep the failure card available when refreshing the URL also fails.
    } finally {
      if (mounted.current) {
        retryPending.current = false;
        setRetrying(false);
      }
    }
  };

  return (
    <figure
      data-slot='image-block'
      className={cn('my-4 w-full', className)}
      {...props}
    >
      <div
        ref={containerRef}
        contentEditable={false}
        className='w-full'
      >
        <div
          ref={frameRef}
          data-slot='image-frame'
          data-resizing={isResizing || undefined}
          className={cn(
            'group/image relative mx-auto max-w-full rounded-lg border bg-muted/40',
            isResizing && 'select-none ring-2 ring-ring',
          )}
          style={{
            width: renderedWidth,
            aspectRatio: ratio,
            minHeight: naturalRatio === null ? 160 : undefined,
          }}
        >
          <ImageRequest
            key={`${request.src}:${request.attempt}`}
            src={request.src}
            alt={alt}
            shouldLoad={shouldLoad}
            retrying={retrying}
            onReady={handleReady}
            onRetry={handleRetry}
          />
          {resizable &&
            naturalRatio !== null &&
            resizeCorners.map(([corner, label, position]) => (
              <button
                key={corner}
                {...getHandleProps(corner)}
                type='button'
                aria-label={`${label}调整图片大小`}
                className={cn(
                  'absolute z-10 flex size-6 items-center justify-center rounded-sm outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:opacity-0 sm:group-hover/image:opacity-100 sm:group-focus-within/image:opacity-100',
                  isResizing && 'sm:opacity-100',
                  position,
                )}
              >
                <span className='size-3 rounded-sm border-2 border-ring bg-background shadow-sm' />
              </button>
            ))}
        </div>
      </div>
      {caption != null && (
        <figcaption className='mt-3 text-center text-sm text-muted-foreground'>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function ImageBlockFrame(props: ImageBlockFrameProps) {
  const [resetVersion, setResetVersion] = useState(0);

  return (
    <ImageBlockErrorBoundary
      key={`${props.src}:${resetVersion}`}
      fallback={
        <figure
          data-slot='image-block'
          contentEditable={false}
          className={cn('my-4 w-full', props.className)}
        >
          <ImageFailure
            message='图片组件显示失败'
            onRetry={() => setResetVersion((version) => version + 1)}
          />
        </figure>
      }
    >
      <ImageBlockContent {...props} />
    </ImageBlockErrorBoundary>
  );
}

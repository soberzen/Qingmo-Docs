import type { ComponentProps, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ImageBlockSize = {
  width: number;
  height: number;
};

export type ImageResizeHandle =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export type UseImageResizeOptions = {
  width?: number | undefined;
  defaultWidth?: number | undefined;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
  aspectRatio: number;
  resizable?: boolean | undefined;
  onResizeEnd?: ((size: ImageBlockSize) => void) | undefined;
};

type ResizeGesture = {
  pointerId: number;
  handle: ImageResizeHandle;
  startX: number;
  startY: number;
  startWidth: number;
  currentWidth: number;
  target: HTMLButtonElement;
};

const handleLabels: Record<ImageResizeHandle, string> = {
  'top-left': '从左上角调整图片大小',
  'top-right': '从右上角调整图片大小',
  'bottom-left': '从左下角调整图片大小',
  'bottom-right': '从右下角调整图片大小',
};

function positiveNumber(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function releasePointer(gesture: ResizeGesture | null) {
  if (!gesture) return;

  // The browser may already have released capture after cancel or removal.
  try {
    if (gesture.target.hasPointerCapture(gesture.pointerId)) {
      gesture.target.releasePointerCapture(gesture.pointerId);
    }
  } catch {
    // The pointer no longer exists, so there is nothing left to release.
  }
}

export function useImageResize({
  width,
  defaultWidth = 640,
  minWidth = 120,
  maxWidth,
  aspectRatio,
  resizable = true,
  onResizeEnd,
}: UseImageResizeOptions): {
  containerRef: RefObject<HTMLDivElement | null>;
  frameRef: RefObject<HTMLDivElement | null>;
  width: number;
  isResizing: boolean;
  getHandleProps: (handle: ImageResizeHandle) => ComponentProps<'button'>;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<ResizeGesture | null>(null);
  const [savedWidth, setSavedWidth] = useState(() =>
    positiveNumber(defaultWidth, 640),
  );
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  if (!resizable && previewWidth !== null) setPreviewWidth(null);

  const controlled = width !== undefined;
  const preferredWidth = controlled
    ? positiveNumber(width, positiveNumber(defaultWidth, 640))
    : savedWidth;
  const ratio = positiveNumber(aspectRatio, 1);
  const requestedMinimum = positiveNumber(minWidth, 120);
  const maximum = Math.min(
    positiveNumber(maxWidth, Number.POSITIVE_INFINITY),
    containerWidth ??
      Math.max(
        preferredWidth,
        positiveNumber(defaultWidth, 640),
        requestedMinimum,
      ),
  );
  // A narrow container takes precedence over the requested minimum.
  const minimum = Math.min(requestedMinimum, maximum);
  const constrainWidth = useCallback(
    (value: number) => Math.min(maximum, Math.max(minimum, value)),
    [maximum, minimum],
  );
  const renderedWidth = constrainWidth(previewWidth ?? preferredWidth);

  const cancelResize = useCallback(() => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    setPreviewWidth(null);
    releasePointer(gesture);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = (nextWidth: number) => {
      setContainerWidth(
        Number.isFinite(nextWidth) && nextWidth > 0 ? nextWidth : null,
      );
    };
    const measure = () => {
      const styles = window.getComputedStyle(container);
      const padding =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0);
      updateWidth(container.clientWidth - padding);
    };

    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) updateWidth(entry.contentRect.width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!resizable) {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      releasePointer(gesture);
    }
  }, [resizable]);

  useEffect(
    () => () => {
      const gesture = gestureRef.current;
      gestureRef.current = null;
      releasePointer(gesture);
    },
    [],
  );

  const commitWidth = (nextWidth: number, previousWidth: number) => {
    const finalWidth = constrainWidth(nextWidth);
    if (finalWidth === previousWidth) return;

    if (!controlled) setSavedWidth(finalWidth);
    onResizeEnd?.({ width: finalWidth, height: finalWidth / ratio });
  };

  const getPointerWidth = (
    gesture: ResizeGesture,
    clientX: number,
    clientY: number,
  ) => {
    const horizontalDirection = gesture.handle.endsWith('left') ? -1 : 1;
    const verticalDirection = gesture.handle.startsWith('top') ? -1 : 1;
    // The frame is horizontally centered: each horizontal edge moves half
    // the width delta. Vertical movement converts height back into width.
    const horizontalDelta =
      (clientX - gesture.startX) * horizontalDirection * 2;
    const verticalDelta =
      (clientY - gesture.startY) * verticalDirection * ratio;
    // The top edge stays in the document flow. Top handles therefore resize
    // from horizontal movement; applying a vertical delta would move the
    // opposite edge while leaving the grabbed corner stationary.
    const delta =
      gesture.handle.startsWith('top') ||
      Math.abs(horizontalDelta) >= Math.abs(verticalDelta)
        ? horizontalDelta
        : verticalDelta;

    return constrainWidth(gesture.startWidth + delta);
  };

  const getHandleProps = (
    handle: ImageResizeHandle,
  ): ComponentProps<'button'> => ({
    type: 'button',
    role: 'slider',
    disabled: !resizable,
    tabIndex: resizable ? 0 : -1,
    'aria-label': handleLabels[handle],
    'aria-orientation': 'horizontal',
    'aria-valuemin': minimum,
    'aria-valuemax': maximum,
    'aria-valuenow': renderedWidth,
    'aria-valuetext': `${Math.round(renderedWidth)} × ${Math.round(renderedWidth / ratio)} 像素`,
    'aria-disabled': !resizable,
    style: {
      touchAction: 'none',
      cursor:
        handle === 'top-left' || handle === 'bottom-right'
          ? 'nwse-resize'
          : 'nesw-resize',
    },
    onPointerDown: (event) => {
      if (
        !resizable ||
        !event.isPrimary ||
        event.button !== 0 ||
        gestureRef.current
      )
        return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });

      const measuredWidth = frameRef.current?.getBoundingClientRect().width;
      const startWidth = constrainWidth(
        positiveNumber(measuredWidth, renderedWidth),
      );
      gestureRef.current = {
        pointerId: event.pointerId,
        handle,
        startX: event.clientX,
        startY: event.clientY,
        startWidth,
        currentWidth: startWidth,
        target: event.currentTarget,
      };
      setPreviewWidth(startWidth);

      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        cancelResize();
      }
    },
    onPointerMove: (event) => {
      const gesture = gestureRef.current;
      if (!resizable || !gesture || gesture.pointerId !== event.pointerId)
        return;
      event.preventDefault();
      gesture.currentWidth = getPointerWidth(
        gesture,
        event.clientX,
        event.clientY,
      );
      setPreviewWidth(gesture.currentWidth);
    },
    onPointerUp: (event) => {
      const gesture = gestureRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      event.preventDefault();

      const finalWidth = getPointerWidth(gesture, event.clientX, event.clientY);
      gestureRef.current = null;
      setPreviewWidth(null);
      releasePointer(gesture);
      if (resizable) commitWidth(finalWidth, gesture.startWidth);
    },
    onPointerCancel: (event) => {
      if (gestureRef.current?.pointerId === event.pointerId) cancelResize();
    },
    onLostPointerCapture: (event) => {
      if (gestureRef.current?.pointerId === event.pointerId) cancelResize();
    },
    onKeyDown: (event) => {
      if (!resizable) return;

      const step = event.shiftKey ? 50 : 10;
      let nextWidth: number;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          nextWidth = renderedWidth - step;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          nextWidth = renderedWidth + step;
          break;
        case 'Home':
          nextWidth = minimum;
          break;
        case 'End':
          nextWidth = maximum;
          break;
        default:
          return;
      }

      event.preventDefault();
      if (gestureRef.current) cancelResize();
      commitWidth(nextWidth, renderedWidth);
    },
  });

  return {
    containerRef,
    frameRef,
    width: renderedWidth,
    isResizing: previewWidth !== null,
    getHandleProps,
  };
}

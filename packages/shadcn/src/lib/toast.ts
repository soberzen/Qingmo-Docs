import { toast } from 'sonner';
import type { ExternalToast } from 'sonner';

const defaultToastOptions: ExternalToast = {
  position: 'top-center',
  duration: 3000,
  richColors: true,
};

export type ToastType = keyof Pick<
  typeof toast,
  'success' | 'error' | 'info' | 'warning' | 'loading'
>;

const createToast = (
  type: ToastType,
  message: string,
  options?: ExternalToast,
) => {
  const finalOptions = { ...defaultToastOptions, ...options };

  return toast[type](message, finalOptions);
};

export const showToast = {
  success: (message: string, options?: ExternalToast) =>
    createToast('success', message, options),
  error: (message: string, options?: ExternalToast) =>
    createToast('error', message, options),
  info: (message: string, options?: ExternalToast) =>
    createToast('info', message, options),
  warning: (message: string, options?: ExternalToast) =>
    createToast('warning', message, options),
  loading: (message: string, options?: ExternalToast) =>
    createToast('loading', message, options),
};

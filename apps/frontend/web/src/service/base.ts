import { UPLOAD_URL } from '@/config';
import { getToken } from '@/utils/auth';
import { showToast } from '@/utils/toast';

import type { FetchOptionType } from './fetch';
import { base } from './fetch';

export type IOtherOptions = {
  silent?: boolean; // 是否关闭错误提示框
  getAbortController?: (abortController: AbortController) => void; // 获取取消控制器
  // 上传进度回调
  onProgress?: (event: ProgressEvent) => void;
};

export const get = <T>(
  url: string,
  options: FetchOptionType = {},
  otherOptions?: IOtherOptions,
) => {
  return base<T>(
    url,
    Object.assign({}, options, { method: 'GET' }),
    otherOptions,
  );
};

export const post = <T>(
  url: string,
  options: FetchOptionType = {},
  otherOptions?: IOtherOptions,
) => {
  return base<T>(
    url,
    Object.assign({}, options, { method: 'POST' }),
    otherOptions,
  );
};

export const put = <T>(
  url: string,
  options: FetchOptionType = {},
  otherOptions?: IOtherOptions,
) => {
  return base<T>(
    url,
    Object.assign({}, options, { method: 'PUT' }),
    otherOptions,
  );
};

export const del = <T>(
  url: string,
  options: FetchOptionType = {},
  otherOptions?: IOtherOptions,
) => {
  return base<T>(
    url,
    Object.assign({}, options, { method: 'DELETE' }),
    otherOptions,
  );
};

export const patch = <T>(
  url: string,
  options: FetchOptionType = {},
  otherOptions?: IOtherOptions,
) => {
  return base<T>(
    url,
    Object.assign({}, options, { method: 'PATCH' }),
    otherOptions,
  );
};

export const upload = <T>(
  url: string,
  options: FetchOptionType = {},
  otherOptions: IOtherOptions = {},
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const { body, params, headers = {} } = options;
    const { onProgress, silent = false } = otherOptions;

    const searchParams = new URLSearchParams(params || {}).toString();
    const fullUrl =
      UPLOAD_URL +
      (url.startsWith('/') ? url.slice(1) : url) +
      (searchParams ? `?${searchParams}` : '');

    const xhr = new XMLHttpRequest();
    if (onProgress && xhr.upload) {
      xhr.upload.onprogress = onProgress;
    }

    xhr.open('POST', fullUrl);
    const customHeaders = headers as Record<string, string>;

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value as string);
    });
    const token = getToken();
    if (token && !customHeaders['Authorization']) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response as T);
        } catch {
          resolve(xhr.responseText as any);
        }
      } else {
        if (!silent && xhr.status !== 401) {
          try {
            const errorData = JSON.parse(xhr.responseText);
            showToast.error(errorData.message || '上传失败');
          } catch {
            showToast.error(`上传失败: ${xhr.status}`);
          }
        }
        reject(xhr);
      }
    };
    xhr.onerror = () => {
      reject(new Error('网络错误'));
    };
    xhr.onabort = () => {
      reject(new Error('上传已取消'));
    };

    if (
      body instanceof FormData ||
      body instanceof Blob ||
      typeof body === 'string'
    ) {
      xhr.send(body);
    } else {
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(body));
    }
  });
};

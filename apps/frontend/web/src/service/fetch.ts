import type { BeforeRequestHook, AfterResponseHook, Hooks } from 'ky';
import ky, { HTTPError } from 'ky';

import { API_PREFIX } from '@/config';
import { getToken, removeToken, setToken } from '@/utils/auth';
import { showToast } from '@/utils/toast';

import type { IOtherOptions } from './base';

const TIME_OUT = 100000;

export const ContentType = {
  json: 'application/json',
  form: 'application/x-www-form-urlencoded; charset=UTF-8',
  download: 'application/octet-stream',
  upload: 'multipart/form-data',
};

export type HTTPResponse<T> = {
  code: string;
  message: string;
  data: T;
};

type ResponseError = HTTPResponse<null>;

export type AccessTokenResponse = HTTPResponse<{ accessToken: string }>;

export type FetchOptionType = Omit<RequestInit, 'body'> & {
  params?: Record<string, any>;
  body?: BodyInit | Record<string, any> | null;
};

type PendingRequest = {
  request: Request;
  resolve: (request: Request) => void;
  reject: (error: unknown) => void;
};

let isRefreshing = false;
const requestsQueue: PendingRequest[] = [];

const afterResponseErrorCode = (
  otherOptions: IOtherOptions,
): AfterResponseHook => {
  return async ({ response }) => {
    if (!/^([23])\d{2}$/.test(String(response.status))) {
      const errorData = await response
        .clone()
        .json()
        .then((data) => data as ResponseError)
        .catch(() => null);
      const shouldNotifyError =
        response.status !== 401 && errorData && !otherOptions.silent;
      if (shouldNotifyError) {
        showToast.error(errorData.message);
      }
    }
  };
};

const beforeRequest: BeforeRequestHook = ({ request }) => {
  const token = getToken();
  if (token) {
    request.headers.set('Authorization', `Bearer ${token}`);
  }
};

const baseHooks: Hooks = {
  beforeRequest: [beforeRequest],
};

const baseClient = ky.create({
  timeout: TIME_OUT,
  hooks: baseHooks,
});

const isPlainObject = (val: unknown) =>
  val !== null &&
  typeof val === 'object' &&
  Object.getPrototypeOf(val) === Object.prototype;

function shouldRefreshAccessToken(request: Request) {
  const pathname = new URL(request.url).pathname;

  return !['/auth/login', '/auth/register', '/auth/refresh'].some((path) =>
    pathname.endsWith(path),
  );
}

function redirectToLogin() {
  if (typeof window === 'undefined' || window.location.pathname === '/login') {
    return;
  }
  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
}

function createRetryRequest(request: Request, accessToken: string) {
  const headers = new Headers(request.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  return new Request(request, { headers });
}

function waitForRefreshedRequest(request: Request) {
  return new Promise<Request>((resolve, reject) => {
    requestsQueue.push({ request, resolve, reject });
  });
}

function resolveRequestsQueue(accessToken: string) {
  while (requestsQueue.length > 0) {
    const pendingRequest = requestsQueue.shift();

    if (pendingRequest) {
      pendingRequest.resolve(
        createRetryRequest(pendingRequest.request, accessToken),
      );
    }
  }
}

function rejectRequestsQueue(error: unknown) {
  while (requestsQueue.length > 0) {
    requestsQueue.shift()?.reject(error);
  }
}

async function refreshAccessToken() {
  isRefreshing = true;

  try {
    const response = await ky
      .post(`${API_PREFIX}/auth/refresh`, {
        credentials: 'include',
        retry: 0,
        timeout: TIME_OUT,
      })
      .json<AccessTokenResponse>();
    const accessToken = response.data?.accessToken;

    if (!accessToken) {
      throw new Error('Refresh response does not include an access token');
    }

    setToken(accessToken);
    resolveRequestsQueue(accessToken);

    return accessToken;
  } catch (error) {
    rejectRequestsQueue(error);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

const afterResponseRefreshToken: AfterResponseHook = async ({
  request,
  response,
  retryCount,
}) => {
  if (response.status !== 401 || !shouldRefreshAccessToken(request)) {
    return;
  }

  if (retryCount > 0) {
    removeToken();
    redirectToLogin();
    showToast.error('登录已过期，请重新登录');
    return;
  }

  try {
    const retryRequest = isRefreshing
      ? await waitForRefreshedRequest(request)
      : createRetryRequest(request, await refreshAccessToken());

    return ky.retry({
      request: retryRequest,
      code: 'TOKEN_REFRESHED',
      delay: 0,
    });
  } catch {
    removeToken();
    redirectToLogin();
    showToast.error('登录已过期，请重新登录');
  }
};

async function base<T>(
  url: string,
  options: FetchOptionType = {},
  otherOptions: IOtherOptions = {},
) {
  const { params, body, headers: headerInit, ...restOptions } = options;

  const headers = new Headers(headerInit);
  const isJsonBody = isPlainObject(body);
  const { getAbortController } = otherOptions;
  if (!isJsonBody && typeof body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', ContentType.json);
  }

  const abortController = new AbortController();

  const fetchPathname = API_PREFIX + (url.startsWith('/') ? url : `/${url}`);

  if (getAbortController) {
    getAbortController(abortController);
  }
  options.signal = abortController.signal;

  const client = baseClient.extend({
    hooks: {
      ...baseHooks,
      afterResponse: [
        afterResponseRefreshToken,
        afterResponseErrorCode(otherOptions),
      ],
    },
  });
  let res: Response;
  try {
    res = await client(fetchPathname, {
      ...restOptions,
      headers,
      searchParams: params || undefined,
      ...(isJsonBody ? { json: body } : { body: body as BodyInit }),
    });

    const contentType = res.headers.get('content-type');

    if (contentType && contentType.includes(ContentType.download)) {
      return (await res.blob()) as T;
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof HTTPError) {
      throw error.request.clone();
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      throw '请求被取消';
    }
    throw error;
  }
}

export { base };

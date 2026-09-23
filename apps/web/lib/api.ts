import type { ApiErrorBody } from '@csbms/shared';

export const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }

  get code() {
    return this.body.error;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  query?: Record<string, string | number | undefined | null>;
}

let refreshing: Promise<boolean> | null = null;

/** One refresh call at a time, even when many requests fail together. */
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

export function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Calls the NestJS API through the same-origin /api proxy.
 * On an expired access token it refreshes once and retries.
 */
export async function api<T>(path: string, opts: RequestOptions = {}, retry = true): Promise<T> {
  const init: RequestInit = { method: opts.method ?? 'GET', credentials: 'include', headers: {} };
  if (opts.formData) {
    init.body = opts.formData;
  } else if (opts.body !== undefined) {
    init.body = JSON.stringify(opts.body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  const res = await fetch(buildUrl(path, opts.query), init);

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return api<T>(path, opts, false);
    if (typeof window !== 'undefined') {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = { statusCode: res.status, error: 'ERROR', message: res.statusText };
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

import { ref } from 'vue';

export type ShortLinkStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ShortLinkResult =
  | { ok: true; url: string; code: string; path: string }
  | { ok: false; error: string };

export function buildShortLinkUrl(path: string, origin = window.location.origin) {
  return new URL(path, origin).toString();
}

export async function requestShortLink(
  url: string,
  name: string,
  fetcher: typeof fetch = fetch,
  origin = window.location.origin,
): Promise<ShortLinkResult> {
  try {
    const backendOrigin = new URL(url, origin).origin;
    const response = await fetcher(buildShortLinkUrl('/short', backendOrigin), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, name }),
    });
    const payload = await response.json() as { code?: unknown; path?: unknown; error?: unknown };
    if (!response.ok || typeof payload.code !== 'string' || typeof payload.path !== 'string') {
      return { ok: false, error: typeof payload.error === 'string' ? payload.error : 'request-failed' };
    }
    return {
      ok: true,
      code: payload.code,
      path: payload.path,
      url: buildShortLinkUrl(payload.path, backendOrigin),
    };
  } catch {
    return { ok: false, error: 'request-failed' };
  }
}

export function useShortLink() {
  const url = ref('');
  const status = ref<ShortLinkStatus>('idle');
  const error = ref('');

  function reset() {
    url.value = '';
    error.value = '';
    status.value = 'idle';
  }

  async function create(longUrl: string, name: string) {
    if (!longUrl) return false;
    status.value = 'loading';
    error.value = '';
    const result = await requestShortLink(longUrl, name);
    if (!result.ok) {
      url.value = '';
      status.value = 'error';
      error.value = result.error;
      return false;
    }
    url.value = result.url;
    status.value = 'ready';
    return true;
  }

  return { url, status, error, create, reset };
}

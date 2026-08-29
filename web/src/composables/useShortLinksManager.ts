import { computed, ref, unref, type Ref } from 'vue';

export interface ServerShortLink {
  code: string;
  path: string;
  shortUrl: string;
  url: string;
  name: string;
  createdAt: number;
  lastAccessAt: number;
}

type ShortLinksResult =
  | { ok: true; items: ServerShortLink[] }
  | { ok: false; error: string };

type DeleteResult = { ok: true } | { ok: false; error: string };

function backendOrigin(origin: string) {
  return origin.replace(/\/+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function normalizeItem(value: unknown, origin: string): ServerShortLink | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.code !== 'string' ||
    typeof value.path !== 'string' ||
    typeof value.url !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.created_at !== 'number' ||
    typeof value.last_access_at !== 'number'
  ) {
    return undefined;
  }
  return {
    code: value.code,
    path: value.path,
    shortUrl: new URL(value.path, origin).toString(),
    url: value.url,
    name: value.name,
    createdAt: value.created_at,
    lastAccessAt: value.last_access_at,
  };
}

export async function requestShortLinks(
  origin: string,
  fetcher: typeof fetch = fetch,
): Promise<ShortLinksResult> {
  try {
    const base = backendOrigin(origin);
    const response = await fetcher(`${base}/short/list`);
    const payload = await response.json() as { items?: unknown; error?: unknown };
    if (!response.ok || !Array.isArray(payload.items)) {
      return { ok: false, error: typeof payload.error === 'string' ? payload.error : 'request-failed' };
    }
    return {
      ok: true,
      items: payload.items
        .map((item) => normalizeItem(item, base))
        .filter((item): item is ServerShortLink => !!item),
    };
  } catch {
    return { ok: false, error: 'request-failed' };
  }
}

export async function requestDeleteShortLink(
  origin: string,
  code: string,
  fetcher: typeof fetch = fetch,
): Promise<DeleteResult> {
  try {
    const base = backendOrigin(origin);
    const response = await fetcher(`${base}/short?id=${encodeURIComponent(code)}`, { method: 'DELETE' });
    const payload = await response.json() as { deleted?: unknown; error?: unknown };
    if (!response.ok || payload.deleted !== true) {
      return { ok: false, error: typeof payload.error === 'string' ? payload.error : 'request-failed' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'request-failed' };
  }
}

export function useShortLinksManager(origin: string | Ref<string>) {
  const items = ref<ServerShortLink[]>([]);
  const loading = ref(false);
  const error = ref('');

  async function refresh() {
    loading.value = true;
    error.value = '';
    const result = await requestShortLinks(unref(origin));
    loading.value = false;
    if (!result.ok) {
      error.value = result.error;
      return false;
    }
    items.value = result.items;
    return true;
  }

  async function remove(code: string) {
    error.value = '';
    const result = await requestDeleteShortLink(unref(origin), code);
    if (!result.ok) {
      error.value = result.error;
      return false;
    }
    items.value = items.value.filter((item) => item.code !== code);
    return true;
  }

  return {
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refresh,
    remove,
  };
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  requestDeleteShortLink,
  requestShortLinks,
  requestUpdateShortLink,
  useShortLinksManager,
} from './useShortLinksManager';

describe('short link manager helpers', () => {
  it('keeps full short links copyable but masks their display value', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [{
          code: 'Ab3k9Qx2',
          path: '/s?id=Ab3k9Qx2',
          url: 'http://server:25500/sub?target=clash&url=https%3A%2F%2Fs',
          name: 'Demo',
          created_at: 1000,
          last_access_at: 2000,
        }],
      }),
    })) as unknown as typeof fetch;

    const result = await requestShortLinks('http://server:25500', 'secret', fetcher);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shortUrl).toBe('http://server:25500/s?id=Ab3k9Qx2');
      expect(result.items[0].maskedShortUrl).toBe('http://server:25500/s?id=Ab3***');
    }
  });

  it('loads short links from the backend origin', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [{
          code: 'Ab3k9Qx2',
          path: '/s?id=Ab3k9Qx2',
          url: 'http://server:25500/sub?target=clash&url=https%3A%2F%2Fs',
          name: 'Demo',
          created_at: 1000,
          last_access_at: 2000,
        }],
      }),
    })) as unknown as typeof fetch;

    const result = await requestShortLinks('http://server:25500', 'secret', fetcher);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shortUrl).toBe('http://server:25500/s?id=Ab3k9Qx2');
    }
    expect(fetcher).toHaveBeenCalledWith('http://server:25500/short/list', {
      headers: { 'X-Short-Link-Password': 'secret' },
    });
  });

  it('deletes a short link by code', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ deleted: true }),
    })) as unknown as typeof fetch;

    const result = await requestDeleteShortLink('http://server:25500', 'Ab3k9Qx2', 'secret', fetcher);

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith('http://server:25500/short?id=Ab3k9Qx2', {
      method: 'DELETE',
      headers: { 'X-Short-Link-Password': 'secret' },
    });
  });

  it('defaults updatedAt to 0 when the record predates the field', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [{
          code: 'Ab3k9Qx2',
          path: '/s?id=Ab3k9Qx2',
          url: 'http://server:25500/sub?target=clash&url=https%3A%2F%2Fs',
          name: 'Demo',
          created_at: 1000,
          last_access_at: 2000,
        }],
      }),
    })) as unknown as typeof fetch;

    const result = await requestShortLinks('http://server:25500', '', fetcher);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items[0].updatedAt).toBe(0);
  });

  it('reads updated_at when present', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        items: [{
          code: 'Ab3k9Qx2',
          path: '/s?id=Ab3k9Qx2',
          url: 'http://server:25500/sub?target=clash&url=https%3A%2F%2Fs',
          name: 'Demo',
          created_at: 1000,
          last_access_at: 2000,
          updated_at: 3000,
        }],
      }),
    })) as unknown as typeof fetch;

    const result = await requestShortLinks('http://server:25500', '', fetcher);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items[0].updatedAt).toBe(3000);
  });

  it('updates a short link with PATCH and the admin header', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        code: 'Ab3k9Qx2',
        path: '/s?id=Ab3k9Qx2',
        updated_at: 5000,
      }),
    })) as unknown as typeof fetch;

    const result = await requestUpdateShortLink(
      'http://server:25500', 'Ab3k9Qx2', 'http://server:25500/sub?target=clash&url=B',
      'Renamed', 'secret', fetcher,
    );

    expect(result).toEqual({ ok: true, updatedAt: 5000 });
    expect(fetcher).toHaveBeenCalledWith('http://server:25500/short?id=Ab3k9Qx2', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Short-Link-Password': 'secret',
      },
      body: JSON.stringify({
        url: 'http://server:25500/sub?target=clash&url=B',
        name: 'Renamed',
      }),
    });
  });

  it('surfaces the backend error code when an update is rejected', async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'not-found' }),
    })) as unknown as typeof fetch;

    const result = await requestUpdateShortLink(
      'http://server:25500', 'missing1', 'http://server:25500/sub?target=clash&url=B',
      '', '', fetcher,
    );

    expect(result).toEqual({ ok: false, error: 'not-found' });
  });

  it('reports request-failed when the update response is not JSON', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const result = await requestUpdateShortLink(
      'http://server:25500', 'Ab3k9Qx2', 'http://server:25500/sub?target=clash&url=B',
      '', '', fetcher,
    );

    expect(result).toEqual({ ok: false, error: 'request-failed' });
  });
});

describe('useShortLinksManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps loaded server short links and removes deleted ones', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return { ok: true, json: async () => ({ deleted: true }) };
      }
      return {
        ok: true,
        json: async () => ({
          items: [{
            code: 'Ab3k9Qx2',
            path: '/s?id=Ab3k9Qx2',
            url: 'http://server:25500/sub?target=clash&url=https%3A%2F%2Fs',
            name: 'Demo',
            created_at: 1000,
            last_access_at: 0,
          }],
        }),
      };
    }) as unknown as typeof fetch);

    const manager = useShortLinksManager('http://server:25500');
    expect(await manager.refresh()).toBe(true);
    expect(manager.items.value).toHaveLength(1);

    expect(await manager.remove('Ab3k9Qx2')).toBe(true);

    expect(manager.items.value).toHaveLength(0);
  });

  it('patches the local item in place after a successful update', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return { ok: true, json: async () => ({ code: 'Ab3k9Qx2', updated_at: 7000 }) };
      }
      return {
        ok: true,
        json: async () => ({
          items: [{
            code: 'Ab3k9Qx2',
            path: '/s?id=Ab3k9Qx2',
            url: 'http://server:25500/sub?target=clash&url=A',
            name: 'Demo',
            created_at: 1000,
            last_access_at: 0,
            updated_at: 1000,
          }],
        }),
      };
    }) as unknown as typeof fetch);

    const manager = useShortLinksManager('http://server:25500');
    expect(await manager.refresh()).toBe(true);

    const before = manager.items.value[0];
    const ok = await manager.update('Ab3k9Qx2', 'http://server:25500/sub?target=clash&url=B', 'Demo');

    expect(ok).toBe(true);
    // No refetch: the same array entry is patched.
    expect(manager.items.value).toHaveLength(1);
    expect(manager.items.value[0].url).toBe('http://server:25500/sub?target=clash&url=B');
    expect(manager.items.value[0].updatedAt).toBe(7000);
    // The code (and thus the short address) is untouched.
    expect(manager.items.value[0].code).toBe(before.code);
    expect(manager.items.value[0].shortUrl).toBe(before.shortUrl);
  });

  it('keeps the original url and sets error when an update fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return { ok: false, json: async () => ({ error: 'storage-unavailable' }) };
      }
      return {
        ok: true,
        json: async () => ({
          items: [{
            code: 'Ab3k9Qx2',
            path: '/s?id=Ab3k9Qx2',
            url: 'http://server:25500/sub?target=clash&url=A',
            name: 'Demo',
            created_at: 1000,
            last_access_at: 0,
            updated_at: 1000,
          }],
        }),
      };
    }) as unknown as typeof fetch);

    const manager = useShortLinksManager('http://server:25500');
    await manager.refresh();

    const ok = await manager.update('Ab3k9Qx2', 'http://server:25500/sub?target=clash&url=B');

    expect(ok).toBe(false);
    expect(manager.error.value).toBe('storage-unavailable');
    expect(manager.items.value[0].url).toBe('http://server:25500/sub?target=clash&url=A');
    expect(manager.items.value[0].updatedAt).toBe(1000);
  });
});

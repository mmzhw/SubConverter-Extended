import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestDeleteShortLink, requestShortLinks, useShortLinksManager } from './useShortLinksManager';

describe('short link manager helpers', () => {
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

    const result = await requestShortLinks('http://server:25500', fetcher);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items[0].shortUrl).toBe('http://server:25500/s?id=Ab3k9Qx2');
    }
    expect(fetcher).toHaveBeenCalledWith('http://server:25500/short/list');
  });

  it('deletes a short link by code', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ deleted: true }),
    })) as unknown as typeof fetch;

    const result = await requestDeleteShortLink('http://server:25500', 'Ab3k9Qx2', fetcher);

    expect(result).toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith('http://server:25500/short?id=Ab3k9Qx2', { method: 'DELETE' });
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
});

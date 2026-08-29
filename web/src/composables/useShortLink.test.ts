import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildShortLinkUrl, requestShortLink, useShortLink } from './useShortLink';

describe('short link helpers', () => {
  it('builds an absolute short URL from a returned path', () => {
    expect(buildShortLinkUrl('/s?id=Ab3k9Qx2', 'http://127.0.0.1:5173')).toBe(
      'http://127.0.0.1:5173/s?id=Ab3k9Qx2',
    );
  });

  it('requests a short link from the backend', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ code: 'Ab3k9Qx2', path: '/s?id=Ab3k9Qx2' }),
    })) as unknown as typeof fetch;

    const result = await requestShortLink(
      'http://127.0.0.1:5173/sub?target=clash&url=https%3A%2F%2Fsub.example.com',
      '测试订阅',
      fetcher,
      'http://127.0.0.1:5173',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.url).toBe('http://127.0.0.1:5173/s?id=Ab3k9Qx2');
    }
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:5173/short', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'http://127.0.0.1:5173/sub?target=clash&url=https%3A%2F%2Fsub.example.com',
        name: '测试订阅',
      }),
    });
  });

  it('reports backend errors', async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'invalid-url' }),
    })) as unknown as typeof fetch;

    const result = await requestShortLink('bad', '', fetcher, 'http://127.0.0.1:5173');

    expect(result).toEqual({ ok: false, error: 'invalid-url' });
  });

  it('posts to the backend origin from the generated long URL', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ code: 'Ab3k9Qx2', path: '/s?id=Ab3k9Qx2' }),
    })) as unknown as typeof fetch;

    const result = await requestShortLink(
      'http://192.168.40.128:8080/sub?target=clash&url=https%3A%2F%2Fsub.example.com',
      '',
      fetcher,
      'http://127.0.0.1:5173',
    );

    expect(result.ok && result.url).toBe('http://192.168.40.128:8080/s?id=Ab3k9Qx2');
    expect(fetcher).toHaveBeenCalledWith('http://192.168.40.128:8080/short', expect.any(Object));
  });
});

describe('useShortLink', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps generated short link state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ code: 'Ab3k9Qx2', path: '/s?id=Ab3k9Qx2' }),
    })));

    const short = useShortLink();

    await short.create('http://127.0.0.1:5173/sub?target=clash&url=https%3A%2F%2Fsub.example.com', '测试订阅');

    expect(short.status.value).toBe('ready');
    expect(short.url.value).toBe('http://127.0.0.1:5173/s?id=Ab3k9Qx2');
  });

  it('resets an existing short link when the long URL changes', () => {
    const short = useShortLink();
    short.url.value = 'http://localhost:3000/s?id=old';
    short.status.value = 'ready';

    short.reset();

    expect(short.url.value).toBe('');
    expect(short.status.value).toBe('idle');
  });
});

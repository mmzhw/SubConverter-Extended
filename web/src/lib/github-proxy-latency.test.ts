import { describe, expect, it, vi } from 'vitest';
import {
  buildServerLatencyUrl,
  measurePreferredProxyLatency,
  measureServerProxyLatency,
} from './github-proxy-latency';

describe('github proxy latency measurement', () => {
  it('builds a backend endpoint that measures from the service network', () => {
    expect(buildServerLatencyUrl(
      'http://backend.test/',
      'https://gh-proxy.com/https://raw.githubusercontent.com/A/B/main/c.ini',
    )).toBe(
      'http://backend.test/api/github-proxy-latency?url=https%3A%2F%2Fgh-proxy.com%2Fhttps%3A%2F%2Fraw.githubusercontent.com%2FA%2FB%2Fmain%2Fc.ini',
    );
  });

  it('passes the timeout to the backend latency endpoint', () => {
    expect(buildServerLatencyUrl(
      'http://backend.test',
      'https://example.test/config.ini',
      3500,
    )).toBe(
      'http://backend.test/api/github-proxy-latency?url=https%3A%2F%2Fexample.test%2Fconfig.ini&timeout_ms=3500',
    );
  });

  it('uses service-network latency results when the backend endpoint responds', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', ms: 123 }),
    });

    await expect(measureServerProxyLatency('http://backend.test', 'https://example.test/config.ini', fetchImpl))
      .resolves.toEqual({ status: 'ok', ms: 123, source: 'server' });
  });

  it('falls back to browser latency only when the service endpoint is unavailable', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('backend unavailable'))
      .mockResolvedValueOnce({ ok: true });
    let now = 100;

    await expect(measurePreferredProxyLatency({
      backendBase: 'http://backend.test',
      url: 'https://example.test/config.ini',
      fetchImpl,
      now: () => {
        now += 50;
        return now;
      },
    })).resolves.toEqual({ status: 'ok', ms: 50, source: 'browser' });
  });
});

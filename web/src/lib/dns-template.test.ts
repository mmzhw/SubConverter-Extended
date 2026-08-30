import { describe, expect, it, vi } from 'vitest';
import { loadDnsTemplate, saveDnsTemplate } from './dns-template';

describe('dns template api', () => {
  it('loads the default DNS template from the backend API', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: 'dns:\n  enable: true\n' }),
    });

    await expect(loadDnsTemplate('http://backend.test', '', fetcher))
      .resolves.toEqual({ content: 'dns:\n  enable: true\n' });
    expect(fetcher).toHaveBeenCalledWith('http://backend.test/api/dns-template', {
      method: 'GET',
      cache: 'no-store',
    });
  });

  it('loads an existing per-link DNS template by id', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'abc123', content: 'dns:\n  enable: true\n' }),
    });

    await expect(loadDnsTemplate('http://backend.test/', 'abc123', fetcher))
      .resolves.toEqual({ id: 'abc123', content: 'dns:\n  enable: true\n' });
    expect(fetcher).toHaveBeenCalledWith('http://backend.test/api/dns-template?id=abc123', {
      method: 'GET',
      cache: 'no-store',
    });
  });

  it('saves a per-link DNS template and returns its id', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'abc123', content: 'dns:\n  enable: true\n' }),
    });

    await expect(saveDnsTemplate('http://backend.test', 'dns:\n  enable: true\n', fetcher))
      .resolves.toEqual({ id: 'abc123', content: 'dns:\n  enable: true\n' });
    expect(fetcher).toHaveBeenCalledWith('http://backend.test/api/dns-template', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'dns:\n  enable: true\n' }),
    });
  });
});

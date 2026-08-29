import { describe, it, expect } from 'vitest';
import { buildSubUrl, FormState } from './url-builder';

const base = (over: Partial<FormState> = {}): FormState => ({
  target: 'clash', sourceUrl: '', backendBase: '', options: {}, ...over,
});

describe('buildSubUrl', () => {
  it('builds a relative URL with target and percent-encoded source', () => {
    const url = buildSubUrl(base({ sourceUrl: 'https://sub.example.com/a?token=x&y=1' }));
    expect(url).toBe('/sub?target=clash&url=https%3A%2F%2Fsub.example.com%2Fa%3Ftoken%3Dx%26y%3D1');
  });

  it('serializes true options as true and drops falsy options', () => {
    const url = buildSubUrl(base({
      target: 'mihomo', sourceUrl: 'https://s',
      options: { emoji: true, tfo: false, rename: 'abc', empty: '' },
    }));
    expect(url).toContain('emoji=true');
    expect(url).toContain('rename=abc');
    expect(url).not.toContain('tfo');
    expect(url).not.toContain('empty');
  });

  it('serializes false when disabling default-on options', () => {
    const url = buildSubUrl(base({
      target: 'clash', sourceUrl: 'https://s',
      options: { provider: false, expand: false, udp: false },
    }));
    expect(url).toContain('provider=false');
    expect(url).toContain('expand=false');
    expect(url).toContain('udp=false');
  });

  it('serializes an external remote config URL', () => {
    const url = buildSubUrl(base({
      target: 'clash',
      sourceUrl: 'https://s',
      options: { config: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini' },
    }));
    expect(url).toContain(
      'config=https%3A%2F%2Fraw.githubusercontent.com%2FACL4SSR%2FACL4SSR%2Fmaster%2FClash%2Fconfig%2FACL4SSR_Online.ini',
    );
  });

  it('serializes node filters and update interval', () => {
    const url = buildSubUrl(base({
      target: 'mihomo',
      sourceUrl: 'https://s',
      options: { include: '香港|HK', exclude: '到期|剩余流量', interval: 86400 },
    }));
    expect(url).toContain('include=%E9%A6%99%E6%B8%AF%7CHK');
    expect(url).toContain('exclude=%E5%88%B0%E6%9C%9F%7C%E5%89%A9%E4%BD%99%E6%B5%81%E9%87%8F');
    expect(url).toContain('interval=86400');
  });

  it('prepends a custom backend, stripping trailing slashes', () => {
    const url = buildSubUrl(base({ sourceUrl: 'https://s', backendBase: 'http://127.0.0.1:25500/' }));
    expect(url).toBe('http://127.0.0.1:25500/sub?target=clash&url=https%3A%2F%2Fs');
  });
});

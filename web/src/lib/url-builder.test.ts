import { describe, it, expect } from 'vitest';
import { DEFAULT_EXCLUDE_REMARKS } from '../config/options';
import { GITHUB_PROXY_CUSTOM } from './github-proxy';
import { buildSubUrl, FormState } from './url-builder';

const base = (over: Partial<FormState> = {}): FormState => ({
  target: 'clash', sourceUrl: '', backendBase: '', options: {}, ...over,
});

describe('buildSubUrl', () => {
  it('builds an absolute same-origin URL with target and percent-encoded source', () => {
    const url = buildSubUrl(base({ sourceUrl: 'https://sub.example.com/a?token=x&y=1' }));
    expect(url).toBe('http://localhost:3000/sub?target=clash&url=https%3A%2F%2Fsub.example.com%2Fa%3Ftoken%3Dx%26y%3D1');
  });

  it('serializes true options as true and drops falsy options', () => {
    const url = buildSubUrl(base({
      target: 'clashr', sourceUrl: 'https://s',
      options: { emoji: true, tfo: false, rename: 'abc', empty: '' },
    }));
    expect(url).toContain('emoji=true');
    expect(url).toContain('rename=abc');
    expect(url).not.toContain('tfo');
    expect(url).not.toContain('empty');
  });

  it('serializes false when disabling default-on options', () => {
    const url = buildSubUrl(base({
      target: 'clashr', sourceUrl: 'https://s',
      options: { provider: false, expand: false, udp: false },
    }));
    expect(url).toContain('provider=false');
    expect(url).toContain('expand=false');
    expect(url).toContain('udp=false');
  });

  it('omits provider mode for non-Clash targets', () => {
    const url = buildSubUrl(base({
      target: 'stash',
      sourceUrl: 'https://s',
      options: { provider: false },
    }));
    expect(url).not.toContain('provider=');
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

  it('applies a GitHub proxy to remote config only', () => {
    const url = buildSubUrl(base({
      target: 'clash',
      sourceUrl: 'https://sub.example.com',
      githubProxy: 'https://gh-proxy.com/',
      options: { config: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini' },
    }));
    expect(decodeURIComponent(url)).toContain(
      'config=https://gh-proxy.com/https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini',
    );
    expect(decodeURIComponent(url)).toContain('url=https://sub.example.com');
  });

  it('supports a custom GitHub proxy prefix for remote config', () => {
    const url = buildSubUrl(base({
      target: 'clash',
      sourceUrl: 'https://sub.example.com',
      githubProxy: GITHUB_PROXY_CUSTOM,
      customGithubProxy: 'https://proxy.example/{url}',
      options: { config: 'https://github.com/A/B/raw/main/config.ini' },
    }));
    expect(decodeURIComponent(url)).toContain(
      'config=https://proxy.example/https://github.com/A/B/raw/main/config.ini',
    );
  });

  it('rewrites GitHub remote config to jsDelivr when selected', () => {
    const url = buildSubUrl(base({
      target: 'clash',
      sourceUrl: 'https://sub.example.com',
      githubProxy: 'https://testingcf.jsdelivr.net/',
      options: { config: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini' },
    }));
    expect(decodeURIComponent(url)).toContain(
      'config=https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/config/ACL4SSR_Online.ini',
    );
  });

  it('serializes node filters and update interval', () => {
    const url = buildSubUrl(base({
      target: 'clashr',
      sourceUrl: 'https://s',
      options: { include: '香港|HK', exclude: DEFAULT_EXCLUDE_REMARKS, interval: 86400 },
    }));
    expect(url).toContain('include=%E9%A6%99%E6%B8%AF%7CHK');
    expect(decodeURIComponent(url)).toContain(`exclude=${DEFAULT_EXCLUDE_REMARKS}`);
    expect(url).toContain('interval=86400');
  });

  it('prepends a custom backend, stripping trailing slashes', () => {
    const url = buildSubUrl(base({ sourceUrl: 'https://s', backendBase: 'http://127.0.0.1:25500/' }));
    expect(url).toBe('http://127.0.0.1:25500/sub?target=clash&url=https%3A%2F%2Fs');
  });
});

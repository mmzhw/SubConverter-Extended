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

  it('prepends a custom backend, stripping trailing slashes', () => {
    const url = buildSubUrl(base({ sourceUrl: 'https://s', backendBase: 'http://127.0.0.1:25500/' }));
    expect(url).toBe('http://127.0.0.1:25500/sub?target=clash&url=https%3A%2F%2Fs');
  });
});

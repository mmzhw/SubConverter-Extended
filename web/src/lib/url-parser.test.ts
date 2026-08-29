import { describe, it, expect } from 'vitest';
import { parseSubUrl } from './url-parser';

describe('parseSubUrl', () => {
  it('parses target, url and known options back into form state', () => {
    const { state } = parseSubUrl('http://host/sub?target=clashr&url=https%3A%2F%2Fsub.example.com%2F&emoji=true&tfo=false&include=HK%7C%E9%A6%99%E6%B8%AF&interval=86400');
    expect(state.target).toBe('clashr');
    expect(state.sourceUrl).toBe('https://sub.example.com/');
    expect(state.options.emoji).toBe(true);
    expect(state.options.tfo).toBe(false);
    expect(state.options.include).toBe('HK|香港');
    expect(state.options.interval).toBe(86400);
  });

  it('preserves unknown parameters verbatim', () => {
    const { unknown } = parseSubUrl('http://host/sub?target=clash&url=https%3A%2F%2Fs&weird_param=abc%26x');
    expect(unknown.weird_param).toBe('abc&x');
  });

  it('throws invalid-link for non-subconverter URLs', () => {
    expect(() => parseSubUrl('https://example.com/not-a-sub-link')).toThrow('invalid-link');
    expect(() => parseSubUrl('http://host/sub?target=clash')).toThrow('invalid-link');
    expect(() => parseSubUrl('not a url')).toThrow('invalid-link');
  });
});

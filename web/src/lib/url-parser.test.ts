import { describe, it, expect } from 'vitest';
import { parseSubUrl } from './url-parser';

describe('parseSubUrl', () => {
  it('parses target, url and known options back into form state', () => {
    const { state } = parseSubUrl('http://host/sub?target=clashr&url=https%3A%2F%2Fsub.example.com%2F&filename=%E6%88%91%E7%9A%84%E8%AE%A2%E9%98%85&emoji=true&tfo=false&include=HK%7C%E9%A6%99%E6%B8%AF&interval=86400&dns_template=abc123');
    expect(state.target).toBe('clashr');
    expect(state.sourceUrl).toBe('https://sub.example.com/');
    expect(state.subscriptionName).toBe('我的订阅');
    expect(state.dnsTemplateId).toBe('abc123');
    expect(state.options.emoji).toBe(true);
    expect(state.options.tfo).toBe(false);
    expect(state.options.include).toBe('HK|香港');
    expect(state.options.interval).toBe(86400);
  });

  it('preserves unknown parameters verbatim', () => {
    const { unknown } = parseSubUrl('http://host/sub?target=clash&url=https%3A%2F%2Fs&weird_param=abc%26x');
    expect(unknown.weird_param).toBe('abc&x');
  });

  it('treats ignored compatibility ruleset parameters as unknown to the form', () => {
    const { state, unknown } = parseSubUrl('http://host/sub?target=clash&url=https%3A%2F%2Fs&ruleset=abc');
    expect(state.options.ruleset).toBeUndefined();
    expect(unknown.ruleset).toBe('abc');
  });

  it('throws invalid-link for non-subconverter URLs', () => {
    expect(() => parseSubUrl('https://example.com/not-a-sub-link')).toThrow('invalid-link');
    expect(() => parseSubUrl('http://host/sub?target=clash')).toThrow('invalid-link');
    expect(() => parseSubUrl('not a url')).toThrow('invalid-link');
  });

  it('round-trips ext_ruleset via URL `;` separator back to textarea newlines', () => {
    const query = '?target=clash&url=https%3A%2F%2Fs&ext_ruleset=Proxy%2Chttps%3A%2F%2Fa%2Fp.list%3BDomestic%2Chttps%3A%2F%2Fb%2Fd.list';
    const { state: parsed } = parseSubUrl('http://host/sub' + query);
    expect(parsed.options.ext_ruleset).toBe('Proxy,https://a/p.list\nDomestic,https://b/d.list');
  });
});

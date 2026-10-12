import { describe, it, expect } from 'vitest';
import { DEFAULT_EXCLUDE_REMARKS } from '../config/options';
import { GITHUB_PROXY_CUSTOM } from './github-proxy';
import { buildSubUrl, FormState } from './url-builder';

const base = (over: Partial<FormState> = {}): FormState => ({
  target: 'clash', sourceUrl: '', subscriptionName: '', backendBase: '', options: {}, ...over,
});

describe('buildSubUrl', () => {
  it('uses the Vite default backend base before falling back to the page origin', () => {
    const previous = import.meta.env.VITE_DEFAULT_BACKEND_BASE;
    import.meta.env.VITE_DEFAULT_BACKEND_BASE = 'http://192.168.40.128:25500/';
    try {
      const url = buildSubUrl(base({ sourceUrl: 'https://s' }));
      expect(url).toBe('http://192.168.40.128:25500/sub?target=clash&url=https%3A%2F%2Fs');
    } finally {
      if (previous === undefined) {
        delete import.meta.env.VITE_DEFAULT_BACKEND_BASE;
      } else {
        import.meta.env.VITE_DEFAULT_BACKEND_BASE = previous;
      }
    }
  });

  it('builds an absolute same-origin URL with target and percent-encoded source', () => {
    const url = buildSubUrl(base({ sourceUrl: 'https://sub.example.com/a?token=x&y=1' }));
    expect(url).toBe('http://localhost:3000/sub?target=clash&url=https%3A%2F%2Fsub.example.com%2Fa%3Ftoken%3Dx%26y%3D1');
  });

  it('joins one-source-per-line input with a pipe, not a comma', () => {
    // A comma would be read as a per-source prefix separator, collapsing the
    // list into a single address the backend cannot fetch.
    const url = new URL(buildSubUrl(base({
      sourceUrl: 'https://a.example/sub\nhttps://b.example/sub',
    })));
    expect(url.searchParams.get('url')).toBe('https://a.example/sub|https://b.example/sub');
  });

  it('drops blank lines so no empty source reaches the wire', () => {
    const url = new URL(buildSubUrl(base({
      sourceUrl: 'https://a.example/sub\n\n  \nhttps://b.example/sub',
    })));
    expect(url.searchParams.get('url')).toBe('https://a.example/sub|https://b.example/sub');
  });

  it('leaves a single source untouched', () => {
    const url = new URL(buildSubUrl(base({ sourceUrl: 'https://a.example/sub' })));
    expect(url.searchParams.get('url')).toBe('https://a.example/sub');
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

  it('serializes a subscription filename when a subscription name is provided', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      subscriptionName: '我的订阅',
    }));
    expect(url).toContain('filename=%E6%88%91%E7%9A%84%E8%AE%A2%E9%98%85');
  });

  it('serializes false when disabling default-on options', () => {
    const url = buildSubUrl(base({
      target: 'clashr', sourceUrl: 'https://s',
      options: { provider: false, udp: false },
    }));
    expect(url).toContain('provider=false');
    expect(url).toContain('udp=false');
  });

  it('serializes ruleset expansion only when explicitly enabled', () => {
    const defaultUrl = buildSubUrl(base({
      target: 'clashr', sourceUrl: 'https://s',
    }));
    expect(defaultUrl).not.toContain('expand=');

    const expandedUrl = buildSubUrl(base({
      target: 'clashr', sourceUrl: 'https://s',
      options: { expand: true },
    }));
    expect(expandedUrl).toContain('expand=true');
  });

  it('serializes the Clash DNS template switch with a dotted backend key', () => {
    const url = buildSubUrl(base({
      target: 'clash',
      sourceUrl: 'https://s',
      options: { 'clash.dns': true },
    }));
    expect(url).toContain('clash.dns=1');
  });

  it('serializes a per-link DNS template id only when Clash DNS is enabled', () => {
    const enabled = buildSubUrl(base({
      target: 'clash',
      sourceUrl: 'https://s',
      dnsTemplateId: 'abc123',
      options: { 'clash.dns': true },
    }));
    const disabled = buildSubUrl(base({
      target: 'clash',
      sourceUrl: 'https://s',
      dnsTemplateId: 'abc123',
      options: { 'clash.dns': false },
    }));

    expect(enabled).toContain('dns_template=abc123');
    expect(disabled).not.toContain('dns_template=');
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

describe('buildSubUrl with ext_ruleset', () => {
  it('joins multi-line ext_ruleset with semicolons', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: {
        ext_ruleset: 'Proxy,https://a/p.list\nDomestic,https://b/d.list',
      },
    }));
    expect(url).toContain('ext_ruleset=Proxy%2Chttps%3A%2F%2Fa%2Fp.list%3BDomestic%2Chttps%3A%2F%2Fb%2Fd.list');
  });

  it('skips blank lines and comments', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: { ext_ruleset: '\n# comment\nProxy,https://a/p.list\n\n' },
    }));
    expect(url).toContain('ext_ruleset=Proxy%2Chttps%3A%2F%2Fa%2Fp.list');
    // Only one entry — no extra semicolons.
    const decoded = decodeURIComponent(url);
    expect(decoded.match(/ext_ruleset=[^&]*/)![0])
      .toBe('ext_ruleset=Proxy,https://a/p.list');
  });

  it('omits the parameter when ext_ruleset is empty/whitespace', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: { ext_ruleset: '   \n\n  ' },
    }));
    expect(url).not.toContain('ext_ruleset=');
  });
});

describe('buildSubUrl with inline_rules', () => {
  it('passes inline_rules through with the wire separators URL-encoded', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: {
        inline_rules:
          'Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar;'
          + 'Proxy:IP-CIDR,10.0.0.0/8',
      },
    }));
    expect(url).toContain(
      'inline_rules=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com%7CDOMAIN-KEYWORD%2Cbar%3BProxy%3AIP-CIDR%2C10.0.0.0%2F8',
    );
  });

  it('omits the parameter when inline_rules is empty', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: { inline_rules: '' },
    }));
    expect(url).not.toContain('inline_rules=');
  });
});

describe('buildSubUrl with rule placement', () => {
  it('writes the plain parameter for the default append placement', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: {
        ext_ruleset: 'Proxy,https://a/p.list',
        inline_rules: 'Proxy:DOMAIN-KEYWORD,foo',
      },
    }));
    expect(url).toContain('inline_rules=');
    expect(url).toContain('ext_ruleset=');
    expect(url).not.toContain('_prepend=');
  });

  it('writes the _prepend parameter when a family is placed first', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: {
        ext_ruleset: 'Proxy,https://a/p.list',
        ext_ruleset_mode: 'prepend',
        inline_rules: 'Proxy:DOMAIN-KEYWORD,foo',
        inline_rules_mode: 'prepend',
      },
    }));
    expect(url).toContain('ext_ruleset_prepend=Proxy%2Chttps%3A%2F%2Fa%2Fp.list');
    expect(url).toContain('inline_rules_prepend=Proxy%3ADOMAIN-KEYWORD%2Cfoo');
    // The plain spellings must not appear alongside the prepend ones.
    expect(url).not.toMatch(/[?&]inline_rules=/);
    expect(url).not.toMatch(/[?&]ext_ruleset=/);
  });

  it('places the two families independently', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: {
        ext_ruleset: 'Proxy,https://a/p.list',
        inline_rules: 'Proxy:DOMAIN-KEYWORD,foo',
        inline_rules_mode: 'prepend',
      },
    }));
    expect(url).toContain('inline_rules_prepend=');
    expect(url).toMatch(/[?&]ext_ruleset=/);
  });

  it('never serializes the placement shadow key itself', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: {
        ext_ruleset: 'Proxy,https://a/p.list',
        ext_ruleset_mode: 'prepend',
        inline_rules: 'Proxy:DOMAIN-KEYWORD,foo',
        inline_rules_mode: 'append',
      },
    }));
    expect(url).not.toContain('_mode');
  });

  it('keeps the canonicalised ext_ruleset value under the prepend name', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: {
        ext_ruleset: '\n# comment\nProxy,https://a/p.list\n\nDomestic,https://b/d.list\n',
        ext_ruleset_mode: 'prepend',
      },
    }));
    expect(decodeURIComponent(url)).toContain(
      'ext_ruleset_prepend=Proxy,https://a/p.list;Domestic,https://b/d.list',
    );
  });

  it('omits the parameter when a prepend-placed family is empty', () => {
    const url = buildSubUrl(base({
      sourceUrl: 'https://s',
      options: { inline_rules: '', inline_rules_mode: 'prepend' },
    }));
    expect(url).not.toContain('inline_rules_prepend=');
    expect(url).not.toContain('inline_rules=');
  });
});

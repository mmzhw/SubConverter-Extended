import { describe, expect, it } from 'vitest';
import {
  applyGitHubProxy,
  GITHUB_PROXY_CUSTOM,
  GITHUB_PROXY_PRESETS,
  githubProxyPrefixFor,
  isGitHubConfigUrl,
} from './github-proxy';

describe('github proxy helpers', () => {
  it('detects GitHub config URLs', () => {
    expect(isGitHubConfigUrl('https://raw.githubusercontent.com/A/B/main/config.ini')).toBe(true);
    expect(isGitHubConfigUrl('https://github.com/A/B/raw/main/config.ini')).toBe(true);
    expect(isGitHubConfigUrl('https://example.com/config.ini')).toBe(false);
  });

  it('applies prefix-style GitHub proxy URLs only to GitHub configs', () => {
    const raw = 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini';
    expect(applyGitHubProxy(raw, 'https://gh-proxy.com')).toBe(`https://gh-proxy.com/${raw}`);
    expect(applyGitHubProxy('https://example.com/config.ini', 'https://gh-proxy.com')).toBe('https://example.com/config.ini');
  });

  it('supports custom placeholder proxy templates', () => {
    const raw = 'https://raw.githubusercontent.com/A/B/main/config.ini';
    expect(githubProxyPrefixFor(GITHUB_PROXY_CUSTOM, 'https://proxy.example/{encodedUrl}')).toBe(
      'https://proxy.example/{encodedUrl}',
    );
    expect(applyGitHubProxy(raw, 'https://proxy.example/{encodedUrl}')).toBe(
      `https://proxy.example/${encodeURIComponent(raw)}`,
    );
  });

  it('keeps direct, public and custom choices available', () => {
    expect(GITHUB_PROXY_PRESETS[0].value).toBe('');
    expect(GITHUB_PROXY_PRESETS.map((preset) => preset.value)).toContain(GITHUB_PROXY_CUSTOM);
    expect(GITHUB_PROXY_PRESETS.length).toBeGreaterThanOrEqual(5);
  });
});

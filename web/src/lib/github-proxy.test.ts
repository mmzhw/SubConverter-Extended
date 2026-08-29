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

  it('converts GitHub raw and blob URLs to jsDelivr gh paths', () => {
    expect(applyGitHubProxy(
      'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini',
      'https://testingcf.jsdelivr.net/',
    )).toBe('https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash/config/ACL4SSR_Online.ini');
    expect(applyGitHubProxy(
      'https://github.com/Aethersailor/Custom_OpenClash_Rules/blob/main/cfg/Custom_Clash.ini',
      'https://fastly.jsdelivr.net/',
    )).toBe('https://fastly.jsdelivr.net/gh/Aethersailor/Custom_OpenClash_Rules@main/cfg/Custom_Clash.ini');
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
    expect(GITHUB_PROXY_PRESETS.map((preset) => preset.value)).toContain('https://testingcf.jsdelivr.net/');
    expect(GITHUB_PROXY_PRESETS.map((preset) => preset.value)).toContain('https://mirror.ghproxy.com/');
    expect(GITHUB_PROXY_PRESETS.length).toBeGreaterThanOrEqual(18);
  });
});

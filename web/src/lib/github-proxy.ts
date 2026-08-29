import type { BilingualText } from '../config/options';

export const GITHUB_PROXY_CUSTOM = '__custom_github_proxy__';

export interface GitHubProxyPreset {
  value: string;
  label: BilingualText;
}

export const GITHUB_PROXY_PRESETS: GitHubProxyPreset[] = [
  { value: '', label: { en: 'Direct', zh: '直连' } },
  { value: 'https://gh-proxy.com/', label: { en: 'gh-proxy.com', zh: 'gh-proxy.com' } },
  { value: 'https://ghfast.top/', label: { en: 'ghfast.top', zh: 'ghfast.top' } },
  { value: 'https://ghproxy.net/', label: { en: 'ghproxy.net', zh: 'ghproxy.net' } },
  { value: 'https://github.akams.cn/', label: { en: 'github.akams.cn', zh: 'github.akams.cn' } },
  { value: GITHUB_PROXY_CUSTOM, label: { en: 'Custom proxy', zh: '自定义代理' } },
];

const githubHosts = new Set(['github.com', 'raw.githubusercontent.com', 'gist.githubusercontent.com']);

export function isGitHubConfigUrl(value: string): boolean {
  try {
    return githubHosts.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function normalizeGitHubProxyPrefix(prefix?: string): string {
  const trimmed = (prefix || '').trim();
  if (!trimmed) return '';
  if (trimmed.includes('{url}') || trimmed.includes('{encodedUrl}')) return trimmed;
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function githubProxyPrefixFor(value?: string, customPrefix?: string): string {
  if (!value) return '';
  return normalizeGitHubProxyPrefix(value === GITHUB_PROXY_CUSTOM ? customPrefix : value);
}

export function applyGitHubProxy(value: string, proxyPrefix?: string): string {
  const prefix = normalizeGitHubProxyPrefix(proxyPrefix);
  if (!prefix || !isGitHubConfigUrl(value)) return value;
  if (prefix.includes('{encodedUrl}')) return prefix.split('{encodedUrl}').join(encodeURIComponent(value));
  if (prefix.includes('{url}')) return prefix.split('{url}').join(value);
  return `${prefix}${value}`;
}

import type { BilingualText } from '../config/options';

export const GITHUB_PROXY_CUSTOM = '__custom_github_proxy__';

export interface GitHubProxyPreset {
  value: string;
  label: BilingualText;
}

export const GITHUB_PROXY_PRESETS: GitHubProxyPreset[] = [
  { value: '', label: { en: 'Direct', zh: '直连' } },
  { value: 'https://testingcf.jsdelivr.net/', label: { en: 'jsDelivr testingcf', zh: 'jsDelivr testingcf' } },
  { value: 'https://fastly.jsdelivr.net/', label: { en: 'jsDelivr Fastly', zh: 'jsDelivr Fastly' } },
  { value: 'https://cdn.jsdelivr.net/', label: { en: 'jsDelivr CDN', zh: 'jsDelivr CDN' } },
  { value: 'https://gh-proxy.com/', label: { en: 'gh-proxy.com', zh: 'gh-proxy.com' } },
  { value: 'https://mirror.ghproxy.com/', label: { en: 'mirror.ghproxy.com', zh: 'mirror.ghproxy.com' } },
  { value: 'https://ghfast.top/', label: { en: 'ghfast.top', zh: 'ghfast.top' } },
  { value: 'https://ghproxy.net/', label: { en: 'ghproxy.net', zh: 'ghproxy.net' } },
  { value: 'https://gh.llkk.cc/', label: { en: 'gh.llkk.cc', zh: 'gh.llkk.cc' } },
  { value: 'https://gh.ddlc.top/', label: { en: 'gh.ddlc.top', zh: 'gh.ddlc.top' } },
  { value: 'https://gh.con.sh/', label: { en: 'gh.con.sh', zh: 'gh.con.sh' } },
  { value: 'https://ghp.ci/', label: { en: 'ghp.ci', zh: 'ghp.ci' } },
  { value: 'https://ghproxy.cc/', label: { en: 'ghproxy.cc', zh: 'ghproxy.cc' } },
  { value: 'https://ghproxy.cfd/', label: { en: 'ghproxy.cfd', zh: 'ghproxy.cfd' } },
  { value: 'https://ghps.cc/', label: { en: 'ghps.cc', zh: 'ghps.cc' } },
  { value: 'https://hub.gitmirror.com/', label: { en: 'hub.gitmirror.com', zh: 'hub.gitmirror.com' } },
  { value: 'https://github.akams.cn/', label: { en: 'github.akams.cn', zh: 'github.akams.cn' } },
  { value: 'https://github.boki.moe/', label: { en: 'github.boki.moe', zh: 'github.boki.moe' } },
  { value: 'https://github.moeyy.xyz/', label: { en: 'github.moeyy.xyz', zh: 'github.moeyy.xyz' } },
  { value: 'https://github.abskoop.workers.dev/', label: { en: 'github.abskoop.workers.dev', zh: 'github.abskoop.workers.dev' } },
  { value: 'https://git.886.be/', label: { en: 'git.886.be', zh: 'git.886.be' } },
  { value: 'https://kgithub.com/', label: { en: 'kgithub.com', zh: 'kgithub.com' } },
  { value: GITHUB_PROXY_CUSTOM, label: { en: 'Custom proxy', zh: '自定义代理' } },
];

const githubHosts = new Set(['github.com', 'raw.githubusercontent.com', 'gist.githubusercontent.com']);
const jsdelivrHosts = new Set(['cdn.jsdelivr.net', 'fastly.jsdelivr.net', 'testingcf.jsdelivr.net']);

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

function jsdelivrGhPath(value: string): string {
  const url = new URL(value);
  const segments = url.pathname.split('/').filter(Boolean);
  if (url.hostname.toLowerCase() === 'raw.githubusercontent.com' && segments.length >= 4) {
    const [owner, repo, ref, ...path] = segments;
    return `gh/${owner}/${repo}@${ref}/${path.join('/')}`;
  }
  if (url.hostname.toLowerCase() === 'github.com' && segments.length >= 5) {
    const [owner, repo, mode, ref, ...path] = segments;
    if (mode === 'raw' || mode === 'blob') return `gh/${owner}/${repo}@${ref}/${path.join('/')}`;
  }
  return '';
}

export function applyGitHubProxy(value: string, proxyPrefix?: string): string {
  const prefix = normalizeGitHubProxyPrefix(proxyPrefix);
  if (!prefix || !isGitHubConfigUrl(value)) return value;
  if (prefix.includes('{encodedUrl}')) return prefix.split('{encodedUrl}').join(encodeURIComponent(value));
  if (prefix.includes('{url}')) return prefix.split('{url}').join(value);
  try {
    if (jsdelivrHosts.has(new URL(prefix).hostname.toLowerCase())) {
      const path = jsdelivrGhPath(value);
      return path ? `${prefix}${path}` : value;
    }
  } catch {
    return value;
  }
  return `${prefix}${value}`;
}

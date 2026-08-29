import { OPTION_DEFS } from '../config/options';
import { applyGitHubProxy, githubProxyPrefixFor } from './github-proxy';

export interface FormState {
  target: string;
  sourceUrl: string;
  subscriptionName: string;
  backendBase: string;
  githubProxy?: string;
  customGithubProxy?: string;
  options: Record<string, string | number | boolean | undefined>;
}

const explicitFalseKeys = new Set(
  OPTION_DEFS.filter((def) => def.type === 'boolean' && def.defaultValue === true).map((def) => def.key),
);

function defaultBackendBase(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin === 'null' ? '' : window.location.origin;
}

function normalizeBackendBase(value: string): string {
  return value.replace(/\/+$/, '');
}

export function buildSubUrl(state: FormState): string {
  const params = new URLSearchParams();
  const githubProxyPrefix = githubProxyPrefixFor(state.githubProxy, state.customGithubProxy);
  params.set('target', state.target);
  params.set('url', state.sourceUrl);
  if (state.subscriptionName.trim()) {
    params.set('filename', state.subscriptionName.trim());
  }
  for (const [key, value] of Object.entries(state.options)) {
    if (key === 'provider' && state.target !== 'clash' && state.target !== 'clashr') continue;
    if (value === undefined || value === '') continue;
    if (value === false) {
      if (explicitFalseKeys.has(key)) params.set(key, 'false');
      continue;
    }
    if (key === 'config' && typeof value === 'string') {
      params.set(key, applyGitHubProxy(value, githubProxyPrefix));
      continue;
    }
    params.set(key, value === true ? 'true' : String(value));
  }
  const base = normalizeBackendBase(state.backendBase || defaultBackendBase());
  return `${base}/sub?${params.toString()}`;
}

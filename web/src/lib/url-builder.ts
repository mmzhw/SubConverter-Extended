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

export function defaultBackendBase(): string {
  const configured = import.meta.env.VITE_DEFAULT_BACKEND_BASE?.trim();
  if (configured) return configured;
  if (typeof window === 'undefined') return '';
  return window.location.origin === 'null' ? '' : window.location.origin;
}

export function normalizeBackendBase(value: string): string {
  return value.replace(/\/+$/, '');
}

export function backendBaseForState(state: Pick<FormState, 'backendBase'>): string {
  return normalizeBackendBase(state.backendBase || defaultBackendBase());
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
  const base = backendBaseForState(state);
  return `${base}/sub?${params.toString()}`;
}

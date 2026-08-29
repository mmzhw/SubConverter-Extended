import { OPTION_DEFS } from '../config/options';
import { applyGitHubProxy, githubProxyPrefixFor } from './github-proxy';

export interface FormState {
  target: string;
  sourceUrl: string;
  backendBase: string;
  githubProxy?: string;
  customGithubProxy?: string;
  options: Record<string, string | number | boolean | undefined>;
}

const explicitFalseKeys = new Set(
  OPTION_DEFS.filter((def) => def.type === 'boolean' && def.defaultValue === true).map((def) => def.key),
);

export function buildSubUrl(state: FormState): string {
  const params = new URLSearchParams();
  const githubProxyPrefix = githubProxyPrefixFor(state.githubProxy, state.customGithubProxy);
  params.set('target', state.target);
  params.set('url', state.sourceUrl);
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
  const base = state.backendBase ? state.backendBase.replace(/\/+$/, '') : '';
  return `${base}/sub?${params.toString()}`;
}

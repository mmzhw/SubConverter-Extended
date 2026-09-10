import { OPTION_DEFS } from '../config/options';
import { applyGitHubProxy, githubProxyPrefixFor } from './github-proxy';

export interface FormState {
  target: string;
  sourceUrl: string;
  subscriptionName: string;
  dnsTemplateId?: string;
  backendBase: string;
  githubProxy?: string;
  customGithubProxy?: string;
  options: Record<string, string | number | boolean | undefined>;
}

const explicitFalseKeys = new Set(
  OPTION_DEFS.filter((def) => def.type === 'boolean' && def.defaultValue === true).map((def) => def.key),
);
const trueAsOneKeys = new Set(['clash.dns']);

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
  if (
    (state.target === 'clash' || state.target === 'clashr') &&
    state.options['clash.dns'] === true &&
    state.dnsTemplateId?.trim()
  ) {
    params.set('dns_template', state.dnsTemplateId.trim());
  }
  // ext_ruleset: textarea stores one "Group,URL" per line. Join with
  // ';' and skip blanks + '#' comments so the URL parameter value
  // is canonicalised.
  const extRaw = state.options['ext_ruleset'];
  if (typeof extRaw === 'string') {
    const lines = extRaw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    if (lines.length) params.set('ext_ruleset', lines.join(';'));
  }
  for (const [key, value] of Object.entries(state.options)) {
    if (key === 'provider' && state.target !== 'clash' && state.target !== 'clashr') continue;
    if (key === 'ext_ruleset') continue;  // handled above
    if (value === undefined || value === '') continue;
    if (value === false) {
      if (explicitFalseKeys.has(key)) params.set(key, 'false');
      continue;
    }
    if (key === 'config' && typeof value === 'string') {
      params.set(key, applyGitHubProxy(value, githubProxyPrefix));
      continue;
    }
    params.set(key, value === true ? (trueAsOneKeys.has(key) ? '1' : 'true') : String(value));
  }
  const base = backendBaseForState(state);
  return `${base}/sub?${params.toString()}`;
}

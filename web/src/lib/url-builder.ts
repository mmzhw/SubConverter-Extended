import { OPTION_DEFS } from '../config/options';
import { applyGitHubProxy, githubProxyPrefixFor } from './github-proxy';
import {
  PLACEMENT_KEYS,
  isPlacementKey,
  placementOf,
  ruleParamFor,
  rulePlacementKey,
} from './rule-target';
import { joinSourceUrlsForWire } from './source-urls';

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
  // The form holds one source per line; the wire format separates them with
  // '|'. A comma would be read as a per-source prefix separator, so the whole
  // list would collapse into a single unusable URL.
  params.set('url', joinSourceUrlsForWire(state.sourceUrl));
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
  // is canonicalised. The family's placement picks the parameter name.
  const extRaw = state.options['ext_ruleset'];
  if (typeof extRaw === 'string') {
    const lines = extRaw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    if (lines.length) {
      params.set(
        ruleParamFor('ext_ruleset', placementOf(state.options, 'ext_ruleset')),
        lines.join(';'),
      );
    }
  }
  for (const [key, value] of Object.entries(state.options)) {
    if (key === 'provider' && state.target !== 'clash' && state.target !== 'clashr') continue;
    if (key === 'ext_ruleset') continue;  // handled above
    // A family's placement is UI state, not a backend parameter: it only
    // selects which parameter name carries that family's rules, so the
    // shadow key itself must never be serialized.
    if (PLACEMENT_KEYS.some((family) => key === rulePlacementKey(family))) continue;
    if (value === undefined || value === '') continue;
    const paramName = isPlacementKey(key)
      ? ruleParamFor(key, placementOf(state.options, key))
      : key;
    if (value === false) {
      if (explicitFalseKeys.has(paramName)) params.set(paramName, 'false');
      continue;
    }
    if (paramName === 'config' && typeof value === 'string') {
      params.set(paramName, applyGitHubProxy(value, githubProxyPrefix));
      continue;
    }
    params.set(paramName, value === true ? (trueAsOneKeys.has(paramName) ? '1' : 'true') : String(value));
  }
  const base = backendBaseForState(state);
  return `${base}/sub?${params.toString()}`;
}

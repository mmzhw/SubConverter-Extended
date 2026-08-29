import { OPTION_DEFS } from '../config/options';

export interface FormState {
  target: string;
  sourceUrl: string;
  backendBase: string;
  options: Record<string, string | number | boolean | undefined>;
}

const explicitFalseKeys = new Set(
  OPTION_DEFS.filter((def) => def.type === 'boolean' && def.defaultValue === true).map((def) => def.key),
);

export function buildSubUrl(state: FormState): string {
  const params = new URLSearchParams();
  params.set('target', state.target);
  params.set('url', state.sourceUrl);
  for (const [key, value] of Object.entries(state.options)) {
    if (key === 'provider' && state.target !== 'clash' && state.target !== 'clashr') continue;
    if (value === undefined || value === '') continue;
    if (value === false) {
      if (explicitFalseKeys.has(key)) params.set(key, 'false');
      continue;
    }
    params.set(key, value === true ? 'true' : String(value));
  }
  const base = state.backendBase ? state.backendBase.replace(/\/+$/, '') : '';
  return `${base}/sub?${params.toString()}`;
}

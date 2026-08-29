import { OPTION_DEFS } from '../config/options';
import { FormState } from './url-builder';

export interface ParsedSubLink {
  state: FormState;
  unknown: Record<string, string>;
}

export function parseSubUrl(input: string): ParsedSubLink {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('invalid-link');
  }
  const target = url.searchParams.get('target');
  const sourceUrl = url.searchParams.get('url');
  if (!target || !sourceUrl) throw new Error('invalid-link');

  const options: FormState['options'] = {};
  const unknown: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'target' || key === 'url') continue;
    const def = OPTION_DEFS.find((d) => d.key === key);
    if (def) {
      if (def.type === 'boolean') {
        options[key] = value !== 'false' && value !== '0';
      } else if (def.type === 'number') {
        const numeric = Number(value);
        options[key] = Number.isFinite(numeric) ? numeric : value;
      } else {
        options[key] = value;
      }
    } else {
      unknown[key] = value;
    }
  }
  return { state: { target, sourceUrl, backendBase: '', options }, unknown };
}

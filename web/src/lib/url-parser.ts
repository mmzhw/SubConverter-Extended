import { OPTION_DEFS } from '../config/options';
import { parseExtRulesetRows } from './ext-rulesets';
import {
  PLACEMENT_KEYS,
  PlacementKey,
  rulePlacementKey,
} from './rule-target';
import { wireToSourceUrls } from './source-urls';
import { FormState } from './url-builder';

export interface ParsedSubLink {
  state: FormState;
  unknown: Record<string, string>;
}

/** Canonicalises a rule-family value for the form's options record. */
function ruleFamilyValue(family: PlacementKey, value: string): string {
  if (family !== 'ext_ruleset') return value;
  // Round-trip through the shared row parser so the reverse parse stays
  // consistent with the row-based control.
  return parseExtRulesetRows(value)
    .map((row) => `${row.group},${row.url}`)
    .join('\n');
}

export function parseSubUrl(input: string): ParsedSubLink {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('invalid-link');
  }
  const target = url.searchParams.get('target');
  const wireSourceUrl = url.searchParams.get('url');
  const subscriptionName = url.searchParams.get('filename') || '';
  const dnsTemplateId = url.searchParams.get('dns_template') || '';
  if (!target || !wireSourceUrl) throw new Error('invalid-link');
  // '|' separates sources on the wire; the form edits them one per line.
  const sourceUrl = wireToSourceUrls(wireSourceUrl);

  const options: FormState['options'] = {};
  const unknown: Record<string, string> = {};
  // A rule family travels under either `<family>` (append) or
  // `<family>_prepend` (prepend), never both. Collect both spellings first
  // so the winner does not depend on the parameter order in the URL.
  const prependValues = new Map<PlacementKey, string>();
  const appendValues = new Map<PlacementKey, string>();
  for (const [key, value] of url.searchParams.entries()) {
    if (key === 'target' || key === 'url' || key === 'filename' || key === 'dns_template') continue;
    const prependFamily = PLACEMENT_KEYS.find((family) => key === `${family}_prepend`);
    if (prependFamily) {
      prependValues.set(prependFamily, value);
      continue;
    }
    const appendFamily = PLACEMENT_KEYS.find((family) => key === family);
    if (appendFamily) appendValues.set(appendFamily, value);
    const def = OPTION_DEFS.find((d) => d.key === key);
    if (def) {
      if (key === 'ext_ruleset' && typeof value === 'string') {
        options[key] = ruleFamilyValue('ext_ruleset', value);
        continue;
      }
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
  for (const family of PLACEMENT_KEYS) {
    const prependValue = prependValues.get(family);
    if (prependValue === undefined) continue;
    // The prepend parameter wins. The append side is reported as unknown
    // rather than silently dropped, so an import never loses input.
    const appendValue = appendValues.get(family);
    if (appendValue !== undefined) unknown[family] = appendValue;
    options[family] = ruleFamilyValue(family, prependValue);
    options[rulePlacementKey(family)] = 'prepend';
  }
  return { state: { target, sourceUrl, subscriptionName, dnsTemplateId, backendBase: '', options }, unknown };
}

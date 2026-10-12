import { describe, it, expect } from 'vitest';
import { applyPlacement, placementOf } from './rule-target';
import { buildSubUrl, FormState } from './url-builder';
import { parseSubUrl } from './url-parser';

/**
 * End-to-end placement flow: exactly the sequence the form performs when a
 * user flips the switch — parse a link into options, record a placement, and
 * rebuild. Rules must survive the flip, and only the parameter NAME may change.
 */
const base = (over: Partial<FormState> = {}): FormState => ({
  target: 'clash',
  sourceUrl: 'https://s',
  subscriptionName: '',
  backendBase: 'http://host',
  options: {},
  ...over,
});

describe('rule placement flow', () => {
  it('moves a family between parameters without losing its rules', () => {
    const { state } = parseSubUrl(
      'http://host/sub?target=clash&url=https%3A%2F%2Fs'
      + '&inline_rules=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com',
    );
    expect(placementOf(state.options, 'inline_rules')).toBe('append');
    const before = String(state.options.inline_rules);

    applyPlacement(state.options, 'inline_rules', 'prepend');
    const prepended = buildSubUrl(base({ options: state.options }));
    expect(prepended).toContain('inline_rules_prepend=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com');
    expect(state.options.inline_rules).toBe(before);

    applyPlacement(state.options, 'inline_rules', 'append');
    const appended = buildSubUrl(base({ options: state.options }));
    expect(appended).toMatch(/[?&]inline_rules=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com/);
    expect(appended).not.toContain('_prepend=');
    expect(state.options.inline_rules).toBe(before);
  });

  it('leaves the other family untouched when one family is flipped', () => {
    const { state } = parseSubUrl(
      'http://host/sub?target=clash&url=https%3A%2F%2Fs'
      + '&ext_ruleset=Proxy%2Chttps%3A%2F%2Fa%2Fp.list'
      + '&inline_rules=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com',
    );
    applyPlacement(state.options, 'inline_rules', 'prepend');
    const url = buildSubUrl(base({ options: state.options }));
    expect(url).toContain('inline_rules_prepend=');
    expect(url).toMatch(/[?&]ext_ruleset=Proxy%2Chttps%3A%2F%2Fa%2Fp.list/);
    expect(placementOf(state.options, 'ext_ruleset')).toBe('append');
  });

  it('drops the shadow key again when a family returns to the default placement', () => {
    const options: FormState['options'] = {};
    applyPlacement(options, 'inline_rules', 'prepend');
    expect(Object.keys(options)).toEqual(['inline_rules_mode']);
    applyPlacement(options, 'inline_rules', 'append');
    expect(Object.keys(options)).toEqual([]);
  });

  it('keeps the append link byte-identical for a state that never flips', () => {
    const legacy = 'http://host/sub?target=clash&url=https%3A%2F%2Fs'
      + '&inline_rules=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com';
    const { state } = parseSubUrl(legacy);
    // Reading the default placement must not materialise a shadow key.
    expect(placementOf(state.options, 'inline_rules')).toBe('append');
    expect(buildSubUrl(base({ options: state.options }))).toBe(legacy);
  });
});

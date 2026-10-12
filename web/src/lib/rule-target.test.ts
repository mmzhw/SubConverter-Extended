import { describe, it, expect } from 'vitest';
import {
  PLACEMENT_KEYS,
  applyPlacement,
  isPlacementKey,
  placementOf,
  ruleParamFor,
  rulePlacementKey,
} from './rule-target';

describe('rule-target', () => {
  it('maps a placement to the URL parameter carrying that family', () => {
    expect(ruleParamFor('inline_rules', 'append')).toBe('inline_rules');
    expect(ruleParamFor('inline_rules', 'prepend')).toBe('inline_rules_prepend');
    expect(ruleParamFor('ext_ruleset', 'append')).toBe('ext_ruleset');
    expect(ruleParamFor('ext_ruleset', 'prepend')).toBe('ext_ruleset_prepend');
  });

  it('derives the shadow key used to store a placement', () => {
    expect(rulePlacementKey('inline_rules')).toBe('inline_rules_mode');
    expect(rulePlacementKey('ext_ruleset')).toBe('ext_ruleset_mode');
    // The shadow key is not a wire parameter.
    expect(ruleParamFor('inline_rules', 'prepend')).not.toBe(rulePlacementKey('inline_rules'));
  });

  it('defaults to append when no placement was recorded', () => {
    expect(placementOf({}, 'inline_rules')).toBe('append');
    expect(placementOf({ inline_rules: 'x' }, 'inline_rules')).toBe('append');
    expect(placementOf({ inline_rules_mode: 'append' }, 'inline_rules')).toBe('append');
    // Anything unexpected also falls back to the historical append slot.
    expect(placementOf({ inline_rules_mode: 'middle' }, 'inline_rules')).toBe('append');
    expect(placementOf({ inline_rules_mode: true }, 'inline_rules')).toBe('append');
  });

  it('reports prepend once the shadow key says so', () => {
    expect(placementOf({ inline_rules_mode: 'prepend' }, 'inline_rules')).toBe('prepend');
    expect(placementOf({ ext_ruleset_mode: 'prepend' }, 'ext_ruleset')).toBe('prepend');
    // Placement is per family, not global.
    expect(placementOf({ inline_rules_mode: 'prepend' }, 'ext_ruleset')).toBe('append');
  });

  it('lists only placement-capable rule families', () => {
    expect([...PLACEMENT_KEYS]).toEqual(['ext_ruleset', 'inline_rules']);
    expect(isPlacementKey('inline_rules')).toBe(true);
    expect(isPlacementKey('ext_ruleset')).toBe(true);
    expect(isPlacementKey('config')).toBe(false);
    expect(isPlacementKey('rules')).toBe(false);
  });

  it('records a placement without ever touching the family content', () => {
    const options: Record<string, string | number | boolean | undefined> = {
      inline_rules: 'Proxy:DOMAIN-KEYWORD,foo',
      emoji: true,
    };
    applyPlacement(options, 'inline_rules', 'prepend');
    expect(options.inline_rules).toBe('Proxy:DOMAIN-KEYWORD,foo');
    expect(options.emoji).toBe(true);
    expect(options.inline_rules_mode).toBe('prepend');
    expect(placementOf(options, 'inline_rules')).toBe('prepend');

    applyPlacement(options, 'inline_rules', 'append');
    expect(options.inline_rules).toBe('Proxy:DOMAIN-KEYWORD,foo');
    // 'append' is the default: no redundant shadow value is stored.
    expect(rulePlacementKey('inline_rules') in options).toBe(false);
  });

  it('writes an explicit prepend value so placementOf round-trips', () => {
    const options: Record<string, string | number | boolean | undefined> = {};
    applyPlacement(options, 'ext_ruleset', 'prepend');
    expect(options.ext_ruleset_mode).toBe('prepend');
    applyPlacement(options, 'inline_rules', 'prepend');
    expect(placementOf(options, 'inline_rules')).toBe('prepend');
    expect(placementOf(options, 'ext_ruleset')).toBe('prepend');
  });
});

import { describe, expect, it } from 'vitest';
import { parseExtRulesetRows, serializeExtRulesetRows } from './ext-rulesets';

describe('parseExtRulesetRows', () => {
  it('splits multiple entries', () => {
    expect(parseExtRulesetRows('Proxy,https://a/p.list;Domestic,https://b/d.list'))
      .toEqual([
        { group: 'Proxy', url: 'https://a/p.list' },
        { group: 'Domestic', url: 'https://b/d.list' },
      ]);
  });

  it('ignores empty entries', () => {
    expect(parseExtRulesetRows(';Proxy,https://a;;Domestic,https://b;'))
      .toEqual([
        { group: 'Proxy', url: 'https://a' },
        { group: 'Domestic', url: 'https://b' },
      ]);
  });

  it("ignores '#'-prefixed entries", () => {
    expect(parseExtRulesetRows('# note;Proxy,https://a'))
      .toEqual([{ group: 'Proxy', url: 'https://a' }]);
  });

  it('ignores entries without a comma', () => {
    expect(parseExtRulesetRows('ProxyOnly;Proxy,https://a'))
      .toEqual([{ group: 'Proxy', url: 'https://a' }]);
  });

  it('returns empty array for empty input', () => {
    expect(parseExtRulesetRows('')).toEqual([]);
  });
});

describe('serializeExtRulesetRows', () => {
  it('joins rows with semicolons', () => {
    expect(serializeExtRulesetRows([
      { group: 'Proxy', url: 'https://a' },
      { group: 'Domestic', url: 'https://b' },
    ])).toBe('Proxy,https://a;Domestic,https://b');
  });

  it('filters fully-empty rows', () => {
    expect(serializeExtRulesetRows([
      { group: 'Proxy', url: 'https://a' },
      { group: '', url: '' },
      { group: 'Domestic', url: 'https://b' },
    ])).toBe('Proxy,https://a;Domestic,https://b');
  });

  it('round-trips', () => {
    const rows = [
      { group: 'Proxy', url: 'https://a' },
      { group: 'Domestic', url: 'https://b' },
    ];
    expect(parseExtRulesetRows(serializeExtRulesetRows(rows))).toEqual(rows);
  });
});

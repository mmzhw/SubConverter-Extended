import { describe, expect, it } from 'vitest';
import {
  MATCH_TYPE_OPTIONS,
  descriptionForMatchType,
  exampleForMatchType,
  parseInlineRuleLines,
  parseInlineRuleRows,
  placeholderForMatchType,
  serializeInlineRuleLines,
  serializeInlineRuleRows,
  type InlineRuleRow,
} from './inline-rules';

describe('parseInlineRuleRows', () => {
  it('splits multiple group sections', () => {
    expect(parseInlineRuleRows(
      'Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar;'
      + 'Proxy:IP-CIDR,10.0.0.0/8',
    )).toEqual([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: 'DOMAIN-KEYWORD', value: 'bar', group: 'Domestic' },
      { type: 'IP-CIDR', value: '10.0.0.0/8', group: 'Proxy' },
    ]);
  });

  it('ignores empty sections and # comments', () => {
    expect(parseInlineRuleRows(
      '# heading\n;Domestic:DOMAIN-SUFFIX,foo.com;;# another',
    )).toEqual([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
    ]);
  });

  it('drops rules whose value is empty', () => {
    expect(parseInlineRuleRows(
      'Proxy:DOMAIN-SUFFIX,foo.com|DOMAIN-SUFFIX,',
    )).toEqual([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Proxy' },
    ]);
  });

  it('drops sections whose group header is empty', () => {
    expect(parseInlineRuleRows(':DOMAIN-SUFFIX,foo.com')).toEqual([]);
  });

  it('drops rules missing the type/value comma', () => {
    expect(parseInlineRuleRows(
      'Proxy:BOGUS_NO_COMMA|DOMAIN-SUFFIX,foo.com',
    )).toEqual([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Proxy' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseInlineRuleRows('')).toEqual([]);
    expect(parseInlineRuleRows('   ')).toEqual([]);
  });
});

describe('serializeInlineRuleRows', () => {
  it('joins rows with the wire separators', () => {
    const rows: InlineRuleRow[] = [
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: 'DOMAIN-KEYWORD', value: 'bar', group: 'Domestic' },
      { type: 'IP-CIDR', value: '10.0.0.0/8', group: 'Proxy' },
    ];
    expect(serializeInlineRuleRows(rows)).toBe(
      'Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar;'
      + 'Proxy:IP-CIDR,10.0.0.0/8',
    );
  });

  it('drops rows where any of type/value/group is empty', () => {
    expect(serializeInlineRuleRows([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: '', value: 'foo.com', group: 'Domestic' },
      { type: 'DOMAIN-SUFFIX', value: '', group: 'Domestic' },
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: '' },
    ])).toBe('Domestic:DOMAIN-SUFFIX,foo.com');
  });

  it('round-trips a populated row set exactly', () => {
    const rows: InlineRuleRow[] = [
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: 'DOMAIN-KEYWORD', value: 'bar', group: 'Domestic' },
      { type: 'IP-CIDR', value: '10.0.0.0/8', group: 'Proxy' },
      { type: 'GEOIP', value: 'CN', group: 'Direct' },
    ];
    expect(parseInlineRuleRows(serializeInlineRuleRows(rows))).toEqual(rows);
  });

  it('groups consecutive rows with the same group under one section', () => {
    const rows: InlineRuleRow[] = [
      { type: 'DOMAIN-SUFFIX', value: 'a.com', group: 'Domestic' },
      { type: 'DOMAIN-SUFFIX', value: 'b.com', group: 'Proxy' },
      { type: 'DOMAIN-SUFFIX', value: 'c.com', group: 'Domestic' },
    ];
    expect(serializeInlineRuleRows(rows)).toBe(
      'Domestic:DOMAIN-SUFFIX,a.com;'
      + 'Proxy:DOMAIN-SUFFIX,b.com;'
      + 'Domestic:DOMAIN-SUFFIX,c.com',
    );
  });
});

describe('placeholderForMatchType', () => {
  it('returns the placeholder for known match types', () => {
    expect(placeholderForMatchType('DOMAIN-SUFFIX')).toBe('example.com');
    expect(placeholderForMatchType('IP-CIDR')).toBe('192.168.0.0/16');
    expect(placeholderForMatchType('GEOIP')).toBe('CN');
  });

  it('returns empty string for unknown match types', () => {
    expect(placeholderForMatchType('UNKNOWN-TYPE')).toBe('');
  });
});

describe('MATCH_TYPE_OPTIONS metadata', () => {
  it('exposes only curated types and skips MATCH/FINAL', () => {
    const values = MATCH_TYPE_OPTIONS.map((opt) => opt.value);
    expect(values).not.toContain('MATCH');
    expect(values).not.toContain('FINAL');
    for (const opt of MATCH_TYPE_OPTIONS) {
      expect(opt.description.en.length).toBeGreaterThan(0);
      expect(opt.description.zh.length).toBeGreaterThan(0);
      expect(opt.example.length).toBeGreaterThan(0);
    }
  });

  it('descriptionForMatchType returns bilingual text per type', () => {
    const desc = descriptionForMatchType('DOMAIN-SUFFIX');
    expect(desc.en.toLowerCase()).toContain('subdomains');
    expect(desc.zh).toContain('子域');
  });

  it('descriptionForMatchType falls back to empty object for unknown types', () => {
    expect(descriptionForMatchType('UNKNOWN-TYPE')).toEqual({ en: '', zh: '' });
  });

  it('exampleForMatchType returns the documented example', () => {
    expect(exampleForMatchType('IP-CIDR')).toBe('192.168.0.0/16');
    expect(exampleForMatchType('GEOIP')).toBe('CN / US / JP');
    expect(exampleForMatchType('UNKNOWN-TYPE')).toBe('');
  });
});

describe('parseInlineRuleLines', () => {
  it('reads one TYPE,value,Group rule per line', () => {
    const parsed = parseInlineRuleLines(
      'DOMAIN-SUFFIX,foo.com,Domestic\nIP-CIDR,10.0.0.0/8,Proxy',
    );
    expect(parsed.rows).toEqual([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: 'IP-CIDR', value: '10.0.0.0/8', group: 'Proxy' },
    ]);
    expect(parsed.invalidLines).toBe(0);
  });

  it('keeps a value that contains commas intact', () => {
    const parsed = parseInlineRuleLines('DOMAIN-REGEX,^a,b$,Domestic');
    expect(parsed.rows).toEqual([
      { type: 'DOMAIN-REGEX', value: '^a,b$', group: 'Domestic' },
    ]);
    expect(parsed.invalidLines).toBe(0);
  });

  it('counts a line missing the group as invalid', () => {
    const parsed = parseInlineRuleLines(
      'DOMAIN-SUFFIX,foo.com\nIP-CIDR,10.0.0.0/8,Proxy',
    );
    expect(parsed.rows).toEqual([
      { type: 'IP-CIDR', value: '10.0.0.0/8', group: 'Proxy' },
    ]);
    expect(parsed.invalidLines).toBe(1);
  });

  it('counts a line with an empty field as invalid', () => {
    const parsed = parseInlineRuleLines(
      'DOMAIN-SUFFIX,,Domestic\n,foo.com,Domestic\nDOMAIN,foo.com,',
    );
    expect(parsed.rows).toEqual([]);
    expect(parsed.invalidLines).toBe(3);
  });

  it('skips blank lines and comments without counting them as invalid', () => {
    const parsed = parseInlineRuleLines(
      '\n# a note\nDOMAIN-SUFFIX,foo.com,Domestic\n\n   \n# trailing',
    );
    expect(parsed.rows).toEqual([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
    ]);
    expect(parsed.invalidLines).toBe(0);
  });

  it('trims surrounding whitespace on every field', () => {
    const parsed = parseInlineRuleLines(
      '  DOMAIN-SUFFIX , foo.com , Domestic  ',
    );
    expect(parsed.rows).toEqual([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
    ]);
  });

  it('round-trips through serializeInlineRuleLines', () => {
    const rows: InlineRuleRow[] = [
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: 'DOMAIN-REGEX', value: '^a,b$', group: 'Domestic' },
      { type: 'IP-CIDR', value: '10.0.0.0/8', group: 'Proxy' },
    ];
    const parsed = parseInlineRuleLines(serializeInlineRuleLines(rows));
    expect(parsed.rows).toEqual(rows);
    expect(parsed.invalidLines).toBe(0);
  });
});

describe('serializeInlineRuleLines', () => {
  it('writes one rule per line in TYPE,value,Group form', () => {
    expect(serializeInlineRuleLines([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: 'IP-CIDR', value: '10.0.0.0/8', group: 'Proxy' },
    ])).toBe('DOMAIN-SUFFIX,foo.com,Domestic\nIP-CIDR,10.0.0.0/8,Proxy');
  });

  it('drops rows with an empty field, like the row editor does', () => {
    expect(serializeInlineRuleLines([
      { type: 'DOMAIN-SUFFIX', value: 'foo.com', group: 'Domestic' },
      { type: 'DOMAIN', value: '', group: 'Domestic' },
      { type: '', value: 'foo.com', group: 'Domestic' },
      { type: 'DOMAIN', value: 'foo.com', group: '' },
    ])).toBe('DOMAIN-SUFFIX,foo.com,Domestic');
  });

  it('returns an empty string for no rows', () => {
    expect(serializeInlineRuleLines([])).toBe('');
  });
});

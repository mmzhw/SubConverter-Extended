import { describe, it, expect } from 'vitest';
import { OPTION_DEFS, TARGET_FORMATS } from './options';

describe('TARGET_FORMATS', () => {
  it('contains clash, mihomo and singbox', () => {
    const values = TARGET_FORMATS.map((t) => t.value);
    expect(values).toEqual(expect.arrayContaining(['clash', 'mihomo', 'singbox']));
  });
  it('has unique values with bilingual labels', () => {
    const values = TARGET_FORMATS.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
    for (const t of TARGET_FORMATS) {
      expect(t.label.en.length).toBeGreaterThan(0);
      expect(t.label.zh.length).toBeGreaterThan(0);
    }
  });
});

describe('OPTION_DEFS', () => {
  it('has unique keys with complete metadata', () => {
    const keys = OPTION_DEFS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const def of OPTION_DEFS) {
      expect(def.label.en.length).toBeGreaterThan(0);
      expect(def.label.zh.length).toBeGreaterThan(0);
      expect(['node', 'rule', 'advanced']).toContain(def.group);
      expect(['boolean', 'string', 'enum', 'number']).toContain(def.type);
      if (def.type === 'enum') expect(def.enumValues?.length).toBeGreaterThan(0);
      expect(def.defaultValue !== undefined).toBe(true);
      if (def.type === 'boolean') expect(typeof def.defaultValue).toBe('boolean');
    }
  });
  it('includes the deprecated-node filter option', () => {
    expect(OPTION_DEFS.map((d) => d.key)).toContain('fdn');
  });
  it('includes the project provider override', () => {
    expect(OPTION_DEFS.map((d) => d.key)).toContain('provider');
  });
  it('includes the README-documented list param', () => {
    expect(OPTION_DEFS.map((d) => d.key)).toContain('list');
  });
});

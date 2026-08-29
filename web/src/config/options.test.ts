import { describe, it, expect } from 'vitest';
import { DEFAULT_EXCLUDE_REMARKS, OPTION_DEFS, REMOTE_CONFIG_PRESETS, TARGET_FORMATS } from './options';

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
      expect(def.description.en.length).toBeGreaterThan(0);
      expect(def.description.zh.length).toBeGreaterThan(0);
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
  it('includes request-level node filters and update interval', () => {
    const include = OPTION_DEFS.find((d) => d.key === 'include');
    const exclude = OPTION_DEFS.find((d) => d.key === 'exclude');
    const interval = OPTION_DEFS.find((d) => d.key === 'interval');
    expect(include?.type).toBe('string');
    expect(exclude?.type).toBe('string');
    expect(include?.placeholder?.zh).toContain('添加关键词');
    expect(exclude?.description.zh).toContain('排除');
    expect(exclude?.defaultValue).toBe(DEFAULT_EXCLUDE_REMARKS);
    expect(interval?.type).toBe('number');
    expect(interval?.description.zh).toContain('按“天”输入');
    expect(interval?.placeholder?.zh).toContain('单位天');
    expect(interval?.min).toBe(0);
    expect(interval?.step).toBe(1);
  });
  it('includes the project provider override', () => {
    const provider = OPTION_DEFS.find((d) => d.key === 'provider');
    expect(provider?.type).toBe('boolean');
    expect(provider?.defaultValue).toBe(true);
  });
  it('includes the README-documented list param', () => {
    expect(OPTION_DEFS.map((d) => d.key)).toContain('list');
  });
  it('includes remote config presets that can accept custom URLs', () => {
    const config = OPTION_DEFS.find((d) => d.key === 'config');
    expect(config?.type).toBe('enum');
    expect(config?.allowCustom).toBe(true);
    expect(REMOTE_CONFIG_PRESETS.map((p) => p.value)).toContain(
      'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/ACL4SSR_Online.ini',
    );
    expect(REMOTE_CONFIG_PRESETS.map((p) => p.value)).toContain(
      'https://raw.githubusercontent.com/Aethersailor/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash.ini',
    );
    expect(REMOTE_CONFIG_PRESETS.map((p) => p.value)).toContain(
      'https://raw.githubusercontent.com/Aethersailor/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash_Full_Fallback.ini',
    );
  });
});

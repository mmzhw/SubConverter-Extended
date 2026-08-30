import { describe, it, expect } from 'vitest';
import { DEFAULT_EXCLUDE_REMARKS, OPTION_DEFS, REMOTE_CONFIG_PRESETS, TARGET_FORMATS } from './options';

describe('TARGET_FORMATS', () => {
  it('contains all backend-supported target values', () => {
    const values = TARGET_FORMATS.map((t) => t.value);
    expect(values).toEqual([
      'clash',
      'clashr',
      'surge',
      'quan',
      'quanx',
      'loon',
      'surfboard',
      'stash',
      'mellow',
      'singbox',
      'ss',
      'ssd',
      'ssr',
      'sssub',
      'v2ray',
      'v2rayn',
      'v2rayng',
      'shadowrocket',
      'trojan',
      'vless',
      'hysteria2',
      'mixed',
    ]);
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
    const fdn = OPTION_DEFS.find((d) => d.key === 'fdn');
    expect(fdn?.type).toBe('boolean');
    expect(fdn?.initialValue).toBe(true);
  });
  it('enables recommended node cleanup options initially', () => {
    const emoji = OPTION_DEFS.find((d) => d.key === 'emoji');
    const sort = OPTION_DEFS.find((d) => d.key === 'sort');
    expect(emoji?.initialValue).toBe(true);
    expect(sort?.initialValue).toBe(true);
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
    expect(interval?.description.zh).toContain('天 / 时 / 分 / 秒');
    expect(interval?.placeholder?.zh).toContain('例如：1');
    expect(interval?.min).toBe(0);
    expect(interval?.step).toBe(1);
  });
  it('includes a Clash DNS template switch that explains it is not the airport DNS', () => {
    const dns = OPTION_DEFS.find((d) => d.key === 'clash.dns');
    expect(dns?.type).toBe('boolean');
    expect(dns?.label.zh).toBe('DNS 配置');
    expect(dns?.description.zh).toContain('内置模板');
    expect(dns?.description.zh).toContain('不会读取机场订阅里的 DNS');
    expect(dns?.defaultValue).toBe(false);
  });
  it('includes the project provider override', () => {
    const provider = OPTION_DEFS.find((d) => d.key === 'provider');
    expect(provider?.type).toBe('boolean');
    expect(provider?.defaultValue).toBe(true);
    expect(provider?.initialValue).toBe(false);
  });
  it('includes the README-documented list param', () => {
    expect(OPTION_DEFS.map((d) => d.key)).toContain('list');
  });
  it('does not expose ignored request compatibility parameters', () => {
    expect(OPTION_DEFS.map((d) => d.key)).not.toContain('ruleset');
  });
  it('describes protocol tagging and ruleset expansion clearly', () => {
    const appendType = OPTION_DEFS.find((d) => d.key === 'append_type');
    const expand = OPTION_DEFS.find((d) => d.key === 'expand');
    const provider = OPTION_DEFS.find((d) => d.key === 'provider');
    const keys = OPTION_DEFS.map((d) => d.key);
    expect(appendType?.label.zh).toBe('节点类型标记');
    expect(appendType?.description.zh).toContain('代理协议类型');
    expect(appendType?.initialValue).toBe(true);
    expect(expand?.label.zh).toBe('规则展开');
    expect(expand?.description.zh).toContain('远程规则集');
    expect(expand?.description.zh).toContain('可以和 Provider 模式同时开启');
    expect(expand?.description.zh).toContain('只输出节点列表');
    expect(expand?.description.zh).not.toContain('短链');
    expect(expand?.defaultValue).toBe(false);
    expect(expand?.initialValue).toBe(true);
    expect(provider?.description.zh).toContain('不控制规则');
    expect(provider?.description.zh).toContain('规则展开');
    expect(keys.indexOf('append_type')).toBeLessThan(keys.indexOf('expand'));
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

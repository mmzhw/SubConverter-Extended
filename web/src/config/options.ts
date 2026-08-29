export interface BilingualText { en: string; zh: string; }

export type OptionType = 'boolean' | 'string' | 'enum' | 'number';
export type OptionGroup = 'node' | 'rule' | 'advanced';

export interface OptionDef {
  key: string;
  type: OptionType;
  label: BilingualText;
  group: OptionGroup;
  defaultValue?: string | number | boolean;
  enumValues?: { value: string; label: BilingualText }[];
}

export interface TargetFormat { value: string; label: BilingualText; }

export const TARGET_FORMATS: TargetFormat[] = [
  { value: 'clash', label: { en: 'Clash', zh: 'Clash' } },
  { value: 'mihomo', label: { en: 'Mihomo', zh: 'Mihomo' } },
  { value: 'singbox', label: { en: 'sing-box', zh: 'sing-box' } },
  { value: 'surge', label: { en: 'Surge', zh: 'Surge' } },
  { value: 'surfboard', label: { en: 'Surfboard', zh: 'Surfboard' } },
  { value: 'loon', label: { en: 'Loon', zh: 'Loon' } },
  { value: 'quanx', label: { en: 'Quantumult X', zh: 'Quantumult X' } },
  { value: 'v2ray', label: { en: 'V2Ray', zh: 'V2Ray' } },
  { value: 'mixed', label: { en: 'Mixed', zh: '混合' } },
];

export const OPTION_DEFS: OptionDef[] = [
  { key: 'emoji', type: 'boolean', label: { en: 'Emoji', zh: '节点 Emoji' }, group: 'node', defaultValue: false },
  { key: 'tfo', type: 'boolean', label: { en: 'TCP Fast Open', zh: 'TCP 快速打开' }, group: 'node', defaultValue: false },
  { key: 'udp', type: 'boolean', label: { en: 'UDP', zh: 'UDP 支持' }, group: 'node', defaultValue: true },
  { key: 'scv', type: 'boolean', label: { en: 'Skip cert verify', zh: '跳过证书校验' }, group: 'node', defaultValue: false },
  { key: 'sort', type: 'boolean', label: { en: 'Sort nodes', zh: '节点排序' }, group: 'node', defaultValue: false },
  { key: 'rename', type: 'string', label: { en: 'Rename', zh: '节点重命名' }, group: 'node', defaultValue: '' },
  { key: 'ruleset', type: 'string', label: { en: 'External ruleset URL', zh: '外部规则集' }, group: 'rule', defaultValue: '' },
  { key: 'list', type: 'boolean', label: { en: 'Plain node list', zh: '纯节点列表' }, group: 'advanced', defaultValue: false },
  { key: 'expand', type: 'boolean', label: { en: 'Expand short links', zh: '展开短链' }, group: 'advanced', defaultValue: true },
  { key: 'append_type', type: 'boolean', label: { en: 'Append type tag', zh: '附加类型标记' }, group: 'advanced', defaultValue: false },
  { key: 'provider', type: 'string', label: { en: 'Provider override', zh: 'Provider 覆盖' }, group: 'advanced', defaultValue: '' },
];

export interface BilingualText { en: string; zh: string; }

export type OptionType = 'boolean' | 'string' | 'enum' | 'number';
export type OptionGroup = 'node' | 'rule' | 'advanced';

export interface OptionDef {
  key: string;
  type: OptionType;
  label: BilingualText;
  description: BilingualText;
  group: OptionGroup;
  defaultValue?: string | number | boolean;
  initialValue?: string | number | boolean;
  enumValues?: { value: string; label: BilingualText }[];
  allowCustom?: boolean;
  placeholder?: BilingualText;
  min?: number;
  step?: number;
}

export interface TargetFormat { value: string; label: BilingualText; }

export const DEFAULT_EXCLUDE_REMARKS = '流量|官网|TG群|套餐|剩余|测试|官网|更新|代表|永久|地址|订阅|com';

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

const ACL4SSR_CONFIG_BASE = 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/config/';
const acl4ssrConfig = (name: string) => `${ACL4SSR_CONFIG_BASE}${name}`;
const AETHERSAILOR_CONFIG_BASE =
  'https://raw.githubusercontent.com/Aethersailor/Custom_OpenClash_Rules/refs/heads/main/cfg/';
const aethersailorConfig = (name: string) => `${AETHERSAILOR_CONFIG_BASE}${name}`;

export const REMOTE_CONFIG_PRESETS = [
  {
    value: '',
    label: { en: 'Backend default', zh: '后端默认配置' },
  },
  {
    value: aethersailorConfig('Custom_Clash.ini'),
    label: { en: 'Aethersailor Standard', zh: 'Aethersailor 标准版' },
  },
  {
    value: aethersailorConfig('Custom_Clash_Fallback.ini'),
    label: { en: 'Aethersailor Standard Fallback', zh: 'Aethersailor 标准故障转移版' },
  },
  {
    value: aethersailorConfig('Custom_Clash_Lite.ini'),
    label: { en: 'Aethersailor Lite', zh: 'Aethersailor 轻量版' },
  },
  {
    value: aethersailorConfig('Custom_Clash_Lite_Fallback.ini'),
    label: { en: 'Aethersailor Lite Fallback', zh: 'Aethersailor 轻量故障转移版' },
  },
  {
    value: aethersailorConfig('Custom_Clash_GFW.ini'),
    label: { en: 'Aethersailor GFW Minimal', zh: 'Aethersailor 极简 GFW 版' },
  },
  {
    value: aethersailorConfig('Custom_Clash_GFW_Fallback.ini'),
    label: { en: 'Aethersailor GFW Minimal Fallback', zh: 'Aethersailor 极简 GFW 故障转移版' },
  },
  {
    value: aethersailorConfig('Custom_Clash_Full.ini'),
    label: { en: 'Aethersailor Full', zh: 'Aethersailor 重度分流版' },
  },
  {
    value: aethersailorConfig('Custom_Clash_Full_Fallback.ini'),
    label: { en: 'Aethersailor Full Fallback', zh: 'Aethersailor 重度分流故障转移版' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online.ini'),
    label: { en: 'ACL4SSR Online', zh: 'ACL4SSR 在线版' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_NoAuto.ini'),
    label: { en: 'ACL4SSR Online No Auto', zh: 'ACL4SSR 在线版 无自动测速' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_NoReject.ini'),
    label: { en: 'ACL4SSR Online No Reject', zh: 'ACL4SSR 在线版 无拦截' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_AdblockPlus.ini'),
    label: { en: 'ACL4SSR Online Adblock Plus', zh: 'ACL4SSR 在线版 增强去广告' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Mini.ini'),
    label: { en: 'ACL4SSR Mini', zh: 'ACL4SSR 精简版' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Mini_AdblockPlus.ini'),
    label: { en: 'ACL4SSR Mini Adblock Plus', zh: 'ACL4SSR 精简版 增强去广告' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Mini_Fallback.ini'),
    label: { en: 'ACL4SSR Mini Fallback', zh: 'ACL4SSR 精简版 故障转移' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Mini_MultiMode.ini'),
    label: { en: 'ACL4SSR Mini Multi Mode', zh: 'ACL4SSR 精简版 多模式' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Full.ini'),
    label: { en: 'ACL4SSR Full', zh: 'ACL4SSR 全分组版' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Full_AdblockPlus.ini'),
    label: { en: 'ACL4SSR Full Adblock Plus', zh: 'ACL4SSR 全分组版 增强去广告' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Full_Google.ini'),
    label: { en: 'ACL4SSR Full Google', zh: 'ACL4SSR 全分组版 谷歌细分' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Full_MultiMode.ini'),
    label: { en: 'ACL4SSR Full Multi Mode', zh: 'ACL4SSR 全分组版 多模式' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Full_Netflix.ini'),
    label: { en: 'ACL4SSR Full Netflix', zh: 'ACL4SSR 全分组版 Netflix' },
  },
  {
    value: acl4ssrConfig('ACL4SSR_Online_Full_NoAuto.ini'),
    label: { en: 'ACL4SSR Full No Auto', zh: 'ACL4SSR 全分组版 无自动测速' },
  },
] satisfies { value: string; label: BilingualText }[];

export const OPTION_DEFS: OptionDef[] = [
  {
    key: 'emoji',
    type: 'boolean',
    label: { en: 'Emoji', zh: '节点 Emoji' },
    description: {
      en: 'Adds emoji or region markers to node names, making regions easier to scan. It may change the final displayed node names.',
      zh: '给节点名称添加表情或地区标记，方便快速识别地区。开启后最终节点名称可能会发生变化。',
    },
    group: 'node',
    defaultValue: false,
  },
  {
    key: 'tfo',
    type: 'boolean',
    label: { en: 'TCP Fast Open', zh: 'TCP 快速打开' },
    description: {
      en: 'Writes TCP Fast Open related options into supported client configs. It only helps when the client, system, and network all support it.',
      zh: '为支持的客户端写入 TCP Fast Open 相关配置。只有客户端、系统和网络链路都支持时才可能改善建连速度。',
    },
    group: 'node',
    defaultValue: false,
  },
  {
    key: 'udp',
    type: 'boolean',
    label: { en: 'UDP', zh: 'UDP 支持' },
    description: {
      en: 'Keeps UDP relay support in generated nodes. Useful for DNS, games, voice calls, and QUIC traffic; unsupported clients may ignore it.',
      zh: '在生成的节点中保留 UDP 转发支持。DNS、游戏、语音和 QUIC 流量常会用到；不支持的客户端通常会忽略。',
    },
    group: 'node',
    defaultValue: true,
  },
  {
    key: 'scv',
    type: 'boolean',
    label: { en: 'Skip cert verify', zh: '跳过证书校验' },
    description: {
      en: 'Allows supported clients to skip TLS certificate verification for nodes. Use only for self-signed or known test endpoints because it reduces TLS trust checks.',
      zh: '让支持的客户端跳过节点的 TLS 证书校验。只建议用于自签证书或确认可信的测试节点，因为它会降低 TLS 校验安全性。',
    },
    group: 'node',
    defaultValue: false,
  },
  {
    key: 'sort',
    type: 'boolean',
    label: { en: 'Sort nodes', zh: '节点排序' },
    description: {
      en: 'Asks the backend to sort generated nodes for a steadier output order. Useful when you want cleaner lists, but it may change provider ordering.',
      zh: '让后端对生成节点排序，输出顺序更稳定、列表更好扫读。开启后可能改变机场原始节点顺序。',
    },
    group: 'node',
    defaultValue: false,
  },
  {
    key: 'fdn',
    type: 'boolean',
    label: { en: 'Filter deprecated nodes', zh: '过滤废弃节点' },
    description: {
      en: 'Filters nodes that the backend recognizes as deprecated or invalid. Enable it when old or unavailable nodes keep appearing in the source subscription.',
      zh: '过滤后端识别为废弃或无效的节点。订阅里经常混入过期、不可用节点时可以开启。',
    },
    group: 'node',
    defaultValue: false,
  },
  {
    key: 'rename',
    type: 'string',
    label: { en: 'Rename', zh: '节点重命名' },
    description: {
      en: 'Passes a rename rule to the backend to rewrite node names. Leave it blank if you do not know the rename syntax; an incorrect rule may produce unexpected names.',
      zh: '把节点重命名规则传给后端，用来改写节点名称。不熟悉重命名语法时建议留空，规则写错可能导致名称不符合预期。',
    },
    group: 'node',
    defaultValue: '',
  },
  {
    key: 'include',
    type: 'string',
    label: { en: 'Include nodes', zh: '包含节点' },
    description: {
      en: 'Keeps only nodes whose names match this regular expression. For example, HK|Hong Kong keeps Hong Kong nodes; leave blank to keep all nodes unless excluded below.',
      zh: '只保留名称命中这个正则表达式的节点。例如 HK|Hong Kong 会只保留香港相关节点；留空表示不过滤，除非下面的“排除节点”命中。',
    },
    group: 'node',
    defaultValue: '',
    placeholder: {
      en: 'Add keywords, for example: HK',
      zh: '添加关键词，例如：香港',
    },
  },
  {
    key: 'exclude',
    type: 'string',
    label: { en: 'Exclude nodes', zh: '排除节点' },
    description: {
      en: 'Removes nodes whose names match this regular expression. It is useful for filtering expired, traffic, website, or low-quality nodes before generating the final config.',
      zh: '排除名称命中这个正则表达式的节点。常用于过滤“到期、剩余流量、官网、套餐、测试”等不想出现在客户端里的节点。',
    },
    group: 'node',
    defaultValue: DEFAULT_EXCLUDE_REMARKS,
    placeholder: {
      en: 'Add keywords, for example: Expired',
      zh: '添加关键词，例如：到期',
    },
  },
  {
    key: 'config',
    type: 'enum',
    label: { en: 'Remote config', zh: '远程配置' },
    description: {
      en: 'Adds config=<source>. The backend loads this external template before conversion, so its rulesets, proxy groups, rename rules, emoji rules, and base templates can shape the final config. Choose an Aethersailor or ACL4SSR preset, or paste a public .ini URL.',
      zh: '生成 config=<来源>。后端会先加载这份外部模板，再转换订阅；模板里的 ruleset、策略组、重命名、Emoji 和基础模板都会影响最终配置。可选择 Aethersailor、ACL4SSR 预设，也可粘贴公开 .ini 地址。',
    },
    group: 'rule',
    defaultValue: '',
    enumValues: REMOTE_CONFIG_PRESETS,
    allowCustom: true,
    placeholder: {
      en: 'Select a preset or paste a remote .ini URL',
      zh: '选择预设或粘贴远程 .ini 地址',
    },
  },
  {
    key: 'ruleset',
    type: 'string',
    label: { en: 'Ruleset parameter', zh: '规则集参数' },
    description: {
      en: 'Compatibility field for ruleset=... strings. Current /sub explain marks request ruleset as not consumed, so prefer Remote config for real rule presets. Use only when you are testing backend compatibility.',
      zh: '兼容保留的 ruleset=... 字段。当前 /sub 的 explain 标记请求 ruleset 为 not consumed，因此真正要套规则预设请优先使用“远程配置”。仅在测试后端兼容行为时使用。',
    },
    group: 'rule',
    defaultValue: '',
  },
  {
    key: 'list',
    type: 'boolean',
    label: { en: 'Output node list only', zh: '只输出节点列表' },
    description: {
      en: 'Generates only converted proxy nodes, without remote config templates, rules, or proxy groups. Keep it off if you want a ready-to-import Clash/Mihomo profile.',
      zh: '只输出转换后的节点，不生成远程配置模板、规则和策略组。如果你想得到可直接导入 Clash/Mihomo 的完整配置，通常保持关闭。',
    },
    group: 'advanced',
    defaultValue: false,
  },
  {
    key: 'interval',
    type: 'number',
    label: { en: 'Update interval', zh: '更新间隔' },
    description: {
      en: 'Enter days in the UI; the generated URL converts it to seconds for interval=<seconds>. For Clash/Mihomo proxy-provider node refresh, use the source URL prefix format interval:21600,https://example.com/sub.',
      zh: '界面按“天”输入，生成链接时会自动换算成 interval=<秒数>。注意 Clash/Mihomo 的 proxy-provider 节点刷新间隔通常写在订阅源前缀里，例如 interval:21600,https://example.com/sub。',
    },
    group: 'advanced',
    defaultValue: '',
    placeholder: {
      en: 'Days, for example: 1',
      zh: '单位天，例如：1',
    },
    min: 0,
    step: 1,
  },
  {
    key: 'expand',
    type: 'boolean',
    label: { en: 'Expand short links', zh: '展开短链' },
    description: {
      en: 'Lets the backend expand supported short links before conversion. Keep it on for mixed subscriptions; turn it off when you need to preserve the original source links.',
      zh: '让后端在转换前展开支持的短链。混合订阅通常建议开启；如果需要保留原始订阅链接形态，可以关闭。',
    },
    group: 'advanced',
    defaultValue: true,
  },
  {
    key: 'append_type',
    type: 'boolean',
    label: { en: 'Append type tag', zh: '附加类型标记' },
    description: {
      en: 'Appends the proxy protocol type to node names, such as VMess or Trojan. Useful for debugging mixed sources, but it makes names longer.',
      zh: '在节点名称后附加协议类型，例如 VMess、Trojan。排查混合订阅时很有用，但会让节点名称更长。',
    },
    group: 'advanced',
    defaultValue: false,
  },
  {
    key: 'provider',
    type: 'boolean',
    label: { en: 'Provider mode', zh: 'Provider 模式' },
    description: {
      en: 'Controls proxy-provider mode for this request. On lets supported Clash/Mihomo configs reference the remote subscription as a provider; off sends provider=false and makes the backend fetch and inline nodes.',
      zh: '控制本次请求是否使用 proxy-provider 模式。开启时支持的 Clash/Mihomo 配置会引用远程订阅作为 Provider；关闭时生成 provider=false，后端会代抓订阅并内联节点。',
    },
    group: 'advanced',
    defaultValue: true,
    initialValue: false,
  },
];

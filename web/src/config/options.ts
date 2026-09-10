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
  /**
   * Render as <el-input type="textarea" :rows="5"/> instead of a
   * single-line text input. Only honored when `type === 'string'`.
   */
  multiline?: boolean;
}

export interface TargetFormat { value: string; label: BilingualText; }

export const DEFAULT_EXCLUDE_REMARKS = '流量|官网|TG群|套餐|剩余|测试|官网|更新|代表|永久|地址|订阅|com';

export const TARGET_FORMATS: TargetFormat[] = [
  { value: 'clash', label: { en: 'Clash / Mihomo', zh: 'Clash / Mihomo' } },
  { value: 'clashr', label: { en: 'ClashR', zh: 'ClashR' } },
  { value: 'surge', label: { en: 'Surge', zh: 'Surge' } },
  { value: 'quan', label: { en: 'Quantumult', zh: 'Quantumult' } },
  { value: 'quanx', label: { en: 'Quantumult X', zh: 'Quantumult X' } },
  { value: 'loon', label: { en: 'Loon', zh: 'Loon' } },
  { value: 'surfboard', label: { en: 'Surfboard', zh: 'Surfboard' } },
  { value: 'stash', label: { en: 'Stash', zh: 'Stash' } },
  { value: 'mellow', label: { en: 'Mellow', zh: 'Mellow' } },
  { value: 'singbox', label: { en: 'sing-box', zh: 'sing-box' } },
  { value: 'ss', label: { en: 'Shadowsocks', zh: 'Shadowsocks' } },
  { value: 'ssd', label: { en: 'SSD', zh: 'SSD' } },
  { value: 'ssr', label: { en: 'ShadowsocksR', zh: 'ShadowsocksR' } },
  { value: 'sssub', label: { en: 'SSSub', zh: 'SSSub' } },
  { value: 'v2ray', label: { en: 'V2Ray', zh: 'V2Ray' } },
  { value: 'v2rayn', label: { en: 'v2rayN', zh: 'v2rayN' } },
  { value: 'v2rayng', label: { en: 'v2rayNG', zh: 'v2rayNG' } },
  { value: 'shadowrocket', label: { en: 'Shadowrocket', zh: 'Shadowrocket' } },
  { value: 'trojan', label: { en: 'Trojan', zh: 'Trojan' } },
  { value: 'vless', label: { en: 'VLESS', zh: 'VLESS' } },
  { value: 'hysteria2', label: { en: 'Hysteria2', zh: 'Hysteria2' } },
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
    initialValue: true,
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
    initialValue: true,
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
    initialValue: true,
  },
  {
    key: 'rename',
    type: 'string',
    label: { en: 'Node rename rules', zh: '节点重命名规则' },
    description: {
      en: 'Rewrites generated node names with backend rename rules in regex@replacement format. This does not change the subscription profile name; use Subscription name for that.',
      zh: '用后端重命名规则改写生成后的节点名称，格式是 正则@替换文本。它不会修改 Clash 里的订阅配置名；要改订阅名请填写上面的“订阅名称”。',
    },
    group: 'node',
    defaultValue: '',
    placeholder: { en: 'For example HK@(Hong Kong)', zh: '例如 HK@香港' },
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
    key: 'ext_ruleset',
    type: 'string',
    multiline: true,
    label: { en: 'Extra rulesets', zh: '额外规则集' },
    description: {
      en: 'Add remote rule sources to existing groups of the chosen preset. Pick the group from the dropdown (auto-loaded from the preset) and paste the ruleset URL. The row format is handled by the UI.',
      zh: '把远程规则源追加到所选 preset 的已有策略组。从下拉框选择组名（自动从 preset 加载），粘贴规则集 URL；无需手动拼写格式。',
    },
    group: 'rule',
    defaultValue: '',
    placeholder: {
      en: 'Proxy,https://...\nDomestic,https://...',
      zh: 'Proxy,https://...\nDomestic,https://...',
    },
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
      en: 'Choose days / hours / minutes / seconds in the UI; the generated URL converts it to interval=<seconds>. For Clash/Mihomo proxy-provider node refresh, use the source URL prefix format interval:21600,https://example.com/sub.',
      zh: '界面可选择天 / 时 / 分 / 秒，生成链接时会自动换算成 interval=<秒数>。注意 Clash/Mihomo 的 proxy-provider 节点刷新间隔通常写在订阅源前缀里，例如 interval:21600,https://example.com/sub。',
    },
    group: 'advanced',
    defaultValue: '',
    placeholder: {
      en: 'For example: 1',
      zh: '例如：1',
    },
    min: 0,
    step: 1,
  },
  {
    key: 'clash.dns',
    type: 'boolean',
    label: { en: 'DNS config', zh: 'DNS 配置' },
    description: {
      en: 'Adds clash.dns=1 and emits the built-in template DNS block for Clash/Mihomo output. It does not read or inherit DNS settings from the airport subscription.',
      zh: '追加 clash.dns=1，并在 Clash/Mihomo 输出里写入项目内置模板的 DNS 段。它不会读取机场订阅里的 DNS，也不会继承机场原始配置的私有 DNS。',
    },
    group: 'advanced',
    defaultValue: false,
  },
  {
    key: 'append_type',
    type: 'boolean',
    label: { en: 'Show node protocol', zh: '节点类型标记' },
    description: {
      en: 'Adds the proxy protocol type to each node name, such as SS, VMess, VLESS, Trojan, or Hysteria2. Useful when one subscription mixes many protocols, but it makes node names longer.',
      zh: '在节点名称里标注代理协议类型，例如 SS、VMess、VLESS、Trojan、Hysteria2。一个订阅混合多种协议时方便识别，但会让节点名称变长。',
    },
    group: 'advanced',
    defaultValue: false,
    initialValue: true,
  },
  {
    key: 'expand',
    type: 'boolean',
    label: { en: 'Expand rulesets', zh: '规则展开' },
    description: {
      en: 'Controls rules, not proxy nodes. On writes remote rulesets as concrete rule lines into the generated config; off keeps managed rule-provider/rule-set references when the target supports them. It can be enabled together with Provider mode because Provider mode only controls node output. Output node list only skips full config and rule generation.',
      zh: '控制“规则”怎么输出，不控制节点。开启后把远程规则集展开成一条条具体规则写进最终配置；关闭时，在目标客户端支持的情况下保留 rule-provider/rule-set 这类规则引用。可以和 Provider 模式同时开启，因为 Provider 模式只管节点输出；开启“只输出节点列表”时则不会生成完整配置和规则。',
    },
    group: 'advanced',
    defaultValue: false,
    initialValue: true,
  },
  {
    key: 'provider',
    type: 'boolean',
    label: { en: 'Provider mode', zh: 'Provider 模式' },
    description: {
      en: 'Controls proxy nodes, not rules or ruleset expansion. On lets supported Clash/Mihomo configs reference the remote subscription as a proxy-provider; off sends provider=false so the backend fetches the subscription and writes proxy nodes directly into the config.',
      zh: '控制“节点”怎么输出，不控制规则，也不控制规则展开。开启时，支持的 Clash/Mihomo 配置会把订阅源作为 proxy-provider 引用；关闭时生成 provider=false，后端会代抓订阅并把节点直接写进配置。',
    },
    group: 'advanced',
    defaultValue: true,
    initialValue: false,
  },
];

export interface InlineRuleRow {
  type: string;
  value: string;
  group: string;
}

export interface MatchTypeOption {
  value: string;
  label: string;
  description: BilingualText;
  example: string;
}

interface BilingualText { en: string; zh: string }

/**
 * Curated Clash rule types the inline rule editor exposes in its
 * dropdown. Mirrors the backend's `ClashRuleTypes` minus `MATCH` and
 * `FINAL`, which `parseExternalClashRules` rejects (terminal rules must
 * not enter via the rule-list pipeline).
 *
 * Each entry carries a bilingual description and a concrete example so
 * the dropdown panel can render label + one-line meaning next to each
 * option — no hover-tooltip needed.
 */
export const MATCH_TYPE_OPTIONS: MatchTypeOption[] = [
  {
    value: 'DOMAIN',
    label: 'DOMAIN',
    description: {
      en: 'Exact host match. The value must be a full domain.',
      zh: '精确匹配完整主机名，不会包含子域。',
    },
    example: 'www.example.com ≠ example.com',
  },
  {
    value: 'DOMAIN-SUFFIX',
    label: 'DOMAIN-SUFFIX',
    description: {
      en: 'Match the domain and all its subdomains.',
      zh: '匹配该域名及其所有子域（最常用）。',
    },
    example: 'example.com → a.example.com',
  },
  {
    value: 'DOMAIN-KEYWORD',
    label: 'DOMAIN-KEYWORD',
    description: {
      en: 'Substring match anywhere in the host.',
      zh: '在主机名任意位置子串匹配（容易误伤，慎用）。',
    },
    example: 'google → google.com, accounts.google.com',
  },
  {
    value: 'DOMAIN-REGEX',
    label: 'DOMAIN-REGEX',
    description: {
      en: 'Regular expression matched against the full host.',
      zh: '对完整主机名做正则匹配。',
    },
    example: '^.*\\.example\\.com$',
  },
  {
    value: 'GEOIP',
    label: 'GEOIP',
    description: {
      en: 'Match by country code (MaxMind database, IP only).',
      zh: '按 IP 归属国家代码匹配（依赖 MaxMind 数据库）。',
    },
    example: 'CN / US / JP',
  },
  {
    value: 'GEOSITE',
    label: 'GEOSITE',
    description: {
      en: 'Match by domain category (Loyalsoldier/v2ray site database).',
      zh: '按 Loyalsoldier/v2ray 站点分类匹配（域名，不是 IP）。',
    },
    example: 'google / category-ads-cn / cn',
  },
  {
    value: 'IP-CIDR',
    label: 'IP-CIDR',
    description: {
      en: 'Match IPv4 CIDR range.',
      zh: '匹配 IPv4 CIDR 网段。',
    },
    example: '192.168.0.0/16',
  },
  {
    value: 'IP-CIDR6',
    label: 'IP-CIDR6',
    description: {
      en: 'Match IPv6 CIDR range.',
      zh: '匹配 IPv6 CIDR 网段。',
    },
    example: '2001:db8::/32',
  },
  {
    value: 'SRC-IP-CIDR',
    label: 'SRC-IP-CIDR',
    description: {
      en: 'Match the *source* IP CIDR (who initiated the connection).',
      zh: '匹配发起连接的源 IP 网段（而非目标 IP）。',
    },
    example: '10.0.0.0/8',
  },
];

/**
 * Per-match-type placeholder hint for the value input. Keeps the form
 * self-documenting when the user picks a non-domain match type.
 */
export const MATCH_TYPE_PLACEHOLDERS: Record<string, string> = {
  'DOMAIN': 'www.example.com',
  'DOMAIN-SUFFIX': 'example.com',
  'DOMAIN-KEYWORD': 'google',
  'DOMAIN-REGEX': '^example\\.',
  'GEOIP': 'CN',
  'GEOSITE': 'google',
  'IP-CIDR': '192.168.0.0/16',
  'IP-CIDR6': '2001:db8::/32',
  'SRC-IP-CIDR': '10.0.0.0/8',
};

const DEFAULT_PLACEHOLDER = '';

/**
 * Looks up the description object for a match type, falling back to
 * an empty object so callers can render whatever they have without
 * null-checking every field.
 */
export function descriptionForMatchType(type: string): BilingualText {
  return MATCH_TYPE_OPTIONS.find((opt) => opt.value === type)?.description
    ?? { en: '', zh: '' };
}

/**
 * Looks up the example string for a match type, falling back to ''.
 */
export function exampleForMatchType(type: string): string {
  return MATCH_TYPE_OPTIONS.find((opt) => opt.value === type)?.example ?? '';
}

/**
 * Parses the inline_rules URL-parameter value into ordered rows.
 *
 * Wire format: `Group:TYPE,value|TYPE,value;Group2:TYPE,value`.
 *   ';' separates group sections.
 *   ':' (first occurrence in a section) splits the group header from
 *   its rule list.
 *   '|' separates rules within a group.
 *
 * Rows whose type or value or group is empty are dropped here so the
 * UI never echoes half-typed edits back into the URL. Round-tripping
 * a fully-populated row set is exact.
 */
export function parseInlineRuleRows(value: string): InlineRuleRow[] {
  const rows: InlineRuleRow[] = [];
  if (!value) return rows;
  for (const section of value.split(';')) {
    const trimmed = section.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon < 0) continue;
    const group = trimmed.slice(0, colon).trim();
    if (!group) continue;
    const rulesBlob = trimmed.slice(colon + 1);
    if (!rulesBlob) continue;
    for (const rule of rulesBlob.split('|')) {
      const ruleTrimmed = rule.trim();
      if (!ruleTrimmed || ruleTrimmed.startsWith('#')) continue;
      const comma = ruleTrimmed.indexOf(',');
      if (comma < 0) continue;
      const type = ruleTrimmed.slice(0, comma).trim();
      const valuePart = ruleTrimmed.slice(comma + 1).trim();
      if (!type || !valuePart) continue;
      rows.push({ type, value: valuePart, group });
    }
  }
  return rows;
}

/**
 * Serializes rows back into the inline_rules URL-parameter value.
 * Rows where any of type / value / group is empty are dropped so the
 * emitted value never contains partial edits. Consecutive rows with
 * the same group are folded into a single section so the wire form
 * matches what the user sees in the form (one group → one section).
 * The order of sections and rules follows the input row order.
 */
export function serializeInlineRuleRows(rows: InlineRuleRow[]): string {
  const sections: string[] = [];
  let currentGroup = '';
  let currentRules: string[] = [];
  const flush = () => {
    if (currentGroup && currentRules.length) {
      sections.push(`${currentGroup}:${currentRules.join('|')}`);
    }
    currentGroup = '';
    currentRules = [];
  };
  for (const row of rows) {
    const type = row.type.trim();
    const value = row.value.trim();
    const group = row.group.trim();
    if (!type || !value || !group) continue;
    if (group !== currentGroup) {
      flush();
      currentGroup = group;
    }
    currentRules.push(`${type},${value}`);
  }
  flush();
  return sections.join(';');
}

/**
 * Returns the placeholder string for a given match type, falling back
 * to a generic default. Used by the value input to give the user a
 * hint about what to type for each match type.
 */
export function placeholderForMatchType(type: string): string {
  return MATCH_TYPE_PLACEHOLDERS[type] ?? DEFAULT_PLACEHOLDER;
}

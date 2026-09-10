export interface ExtRulesetRow {
  group: string;
  url: string;
}

/** Parses the ext_ruleset value ("Group,URL" entries separated by ';'
 *  or newlines) into rows. Blank entries, '#'-prefixed entries, and
 *  entries without a comma are ignored; whitespace is trimmed. */
export function parseExtRulesetRows(value: string): ExtRulesetRow[] {
  const rows: ExtRulesetRow[] = [];
  for (const entry of value.split(/[;\r\n]/)) {
    const trimmed = entry.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const comma = trimmed.indexOf(',');
    if (comma < 0) continue;
    const group = trimmed.slice(0, comma).trim();
    const url = trimmed.slice(comma + 1).trim();
    if (!group || !url) continue;
    rows.push({ group, url });
  }
  return rows;
}

/** Serializes rows back into the ext_ruleset URL-parameter value.
 *  Rows whose group AND url are both empty are dropped. */
export function serializeExtRulesetRows(rows: ExtRulesetRow[]): string {
  return rows
    .map((row) => ({
      group: row.group.trim(),
      url: row.url.trim(),
    }))
    .filter((row) => row.group || row.url)
    .map((row) => `${row.group},${row.url}`)
    .join(';');
}

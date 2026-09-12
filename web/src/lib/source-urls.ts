/**
 * Subscription source list handling.
 *
 * `url=` accepts several subscription sources separated by `|`. A comma in
 * that parameter separates a single source's prefix options from its URL
 * (`interval:21600,https://example.com/sub`), so a comma is NOT a source
 * separator -- feeding comma-joined URLs makes the backend treat the whole
 * string as one address.
 *
 * The form keeps the human-readable form: one source per line. The wire form
 * is produced and consumed at the URL boundary only.
 */

/** Splits the textarea content into individual source URLs. */
export function splitSourceUrls(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Renders the textarea content as the `url=` parameter value. Returns '' for
 * an empty list, so callers can omit the parameter.
 */
export function joinSourceUrlsForWire(text: string): string {
  return splitSourceUrls(text).join('|');
}

/** Renders a `url=` parameter value as one source per line. */
export function wireToSourceUrls(wire: string): string {
  return splitSourceUrls(wire.replace(/\|/g, '\n')).join('\n');
}

/**
 * True when a line looks like several URLs joined by commas.
 *
 * A comma counts as a mistake only when a complete URL precedes it AND what
 * follows starts a new URL. That keeps per-source prefixes
 * (`interval:21600,https://...`) and commas inside a single URL
 * (`https://a/x?fields=a,b`) from being reported.
 */
export function hasCommaSeparatedSources(text: string): boolean {
  for (const line of splitSourceUrls(text)) {
    for (let at = line.indexOf(','); at >= 0; at = line.indexOf(',', at + 1)) {
      const before = line.slice(0, at);
      const after = line.slice(at + 1).trim();
      if (before.includes('://') && /^https?:\/\//i.test(after)) return true;
    }
  }
  return false;
}

/**
 * Splits the textarea content into per-source entries for validation, keeping
 * the line index so an error can point at the right one.
 */
export function sourceUrlEntries(text: string): { line: number; value: string }[] {
  const entries: { line: number; value: string }[] = [];
  text.split(/\r?\n/).forEach((raw, index) => {
    const value = raw.trim();
    if (value) entries.push({ line: index + 1, value });
  });
  return entries;
}

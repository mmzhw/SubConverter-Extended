import { describe, expect, it } from 'vitest';
import {
  hasCommaSeparatedSources,
  joinSourceUrlsForWire,
  sourceUrlEntries,
  splitSourceUrls,
  wireToSourceUrls,
} from './source-urls';

describe('splitSourceUrls', () => {
  it('splits one source per line', () => {
    expect(splitSourceUrls('https://a.example/sub\nhttps://b.example/sub'))
      .toEqual(['https://a.example/sub', 'https://b.example/sub']);
  });

  it('drops blank lines and trims each entry', () => {
    expect(splitSourceUrls('  https://a.example/sub \n\n\t\n https://b.example/sub'))
      .toEqual(['https://a.example/sub', 'https://b.example/sub']);
  });

  it('handles CRLF line endings', () => {
    expect(splitSourceUrls('https://a.example/sub\r\nhttps://b.example/sub'))
      .toEqual(['https://a.example/sub', 'https://b.example/sub']);
  });

  it('returns an empty list for empty input', () => {
    expect(splitSourceUrls('')).toEqual([]);
    expect(splitSourceUrls('   \n  ')).toEqual([]);
  });

  it('keeps a comma inside a single line untouched', () => {
    expect(splitSourceUrls('interval:21600,https://a.example/sub'))
      .toEqual(['interval:21600,https://a.example/sub']);
  });
});

describe('joinSourceUrlsForWire', () => {
  it('joins sources with a pipe', () => {
    expect(joinSourceUrlsForWire('https://a.example/sub\nhttps://b.example/sub'))
      .toBe('https://a.example/sub|https://b.example/sub');
  });

  it('never emits an empty segment for blank lines', () => {
    expect(joinSourceUrlsForWire('https://a.example/sub\n\n\nhttps://b.example/sub'))
      .toBe('https://a.example/sub|https://b.example/sub');
  });

  it('passes a single source through unchanged', () => {
    expect(joinSourceUrlsForWire('https://a.example/sub'))
      .toBe('https://a.example/sub');
  });

  it('returns an empty string when there is nothing to join', () => {
    expect(joinSourceUrlsForWire('')).toBe('');
  });
});

describe('wireToSourceUrls', () => {
  it('turns the pipe form into one source per line', () => {
    expect(wireToSourceUrls('https://a.example/sub|https://b.example/sub'))
      .toBe('https://a.example/sub\nhttps://b.example/sub');
  });

  it('drops empty segments', () => {
    expect(wireToSourceUrls('https://a.example/sub||https://b.example/sub'))
      .toBe('https://a.example/sub\nhttps://b.example/sub');
  });

  it('keeps a per-source prefix intact', () => {
    expect(wireToSourceUrls('interval:21600,https://a.example/sub|https://b.example/sub'))
      .toBe('interval:21600,https://a.example/sub\nhttps://b.example/sub');
  });
});

describe('wire round trip', () => {
  // Importing a link and generating it again must not change the parameter,
  // otherwise every edit silently rewrites the user's subscription.
  it('is stable through wire -> state -> wire', () => {
    const wire = 'https://a.example/sub|https://b.example/sub';
    expect(joinSourceUrlsForWire(wireToSourceUrls(wire))).toBe(wire);
  });

  it('is stable with three sources', () => {
    const wire = 'https://a.example/sub|https://b.example/sub|https://c.example/sub';
    expect(joinSourceUrlsForWire(wireToSourceUrls(wire))).toBe(wire);
  });

  it('is stable when values carry their own query strings', () => {
    const wire = 'https://a.example/s?x=1&sub=clash&clash=1|https://b.example/s';
    expect(joinSourceUrlsForWire(wireToSourceUrls(wire))).toBe(wire);
  });
});

describe('hasCommaSeparatedSources', () => {
  it('reports the reported mistake of comma-joined sources', () => {
    expect(hasCommaSeparatedSources(
      'https://bsub.example/abc?x=1&sub=clash,https://m1.example/oosaka/def',
    )).toBe(true);
  });

  it('reports three sources joined by commas', () => {
    expect(hasCommaSeparatedSources(
      'https://a.example/s,https://b.example/s,https://c.example/s',
    )).toBe(true);
  });

  it('does not report a per-source prefix comma', () => {
    // interval:21600,https://... is the documented prefix syntax.
    expect(hasCommaSeparatedSources('interval:21600,https://a.example/sub'))
      .toBe(false);
  });

  it('does not report a comma inside a single URL query', () => {
    expect(hasCommaSeparatedSources('https://a.example/sub?fields=a,b'))
      .toBe(false);
  });

  it('does not report a plain list of sources', () => {
    expect(hasCommaSeparatedSources('https://a.example/sub\nhttps://b.example/sub'))
      .toBe(false);
  });

  it('is false for empty input', () => {
    expect(hasCommaSeparatedSources('')).toBe(false);
  });
});

describe('sourceUrlEntries', () => {
  it('reports the 1-based line number of each entry', () => {
    expect(sourceUrlEntries('https://a.example/sub\n\nhttps://b.example/sub'))
      .toEqual([
        { line: 1, value: 'https://a.example/sub' },
        { line: 3, value: 'https://b.example/sub' },
      ]);
  });
});

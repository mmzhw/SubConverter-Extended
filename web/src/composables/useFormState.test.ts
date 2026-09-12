import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_EXCLUDE_REMARKS } from '../config/options';

async function freshFormState() {
  vi.resetModules();
  return import('./useFormState');
}

describe('useFormState', () => {
  it('generates the URL only when requested', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    expect(form.builtUrl.value).toBe('');
    form.state.sourceUrl = 'https://sub.example.com/';
    form.state.subscriptionName = '我的订阅';
    expect(form.builtUrl.value).toBe('');
    expect(form.generateUrl()).toBe(true);
    expect(form.builtUrl.value).toContain('/sub?target=clash&url=https%3A%2F%2Fsub.example.com%2F');
    expect(form.builtUrl.value).toContain('filename=%E6%88%91%E7%9A%84%E8%AE%A2%E9%98%85');
    expect(decodeURIComponent(form.builtUrl.value)).toContain(`exclude=${DEFAULT_EXCLUDE_REMARKS}`);
    expect(form.builtUrl.value).toContain('provider=false');
    expect(form.builtUrl.value).toContain('emoji=true');
    expect(form.builtUrl.value).toContain('sort=true');
    expect(form.builtUrl.value).toContain('fdn=true');
    expect(form.builtUrl.value).toContain('append_type=true');
    expect(form.builtUrl.value).toContain('expand=true');
  });

  it('validates the source URL on demand', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'not a url';
    expect(form.validateSource()).toBe(false);
    expect(form.sourceError.value).toBe('invalid:1');
    form.state.sourceUrl = 'https://ok.example.com';
    expect(form.validateSource()).toBe(true);
    expect(form.sourceError.value).toBe('');
  });

  it('applyParsed overwrites state, clears sourceError, and generates from the parsed link', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'not a url';
    form.validateSource();
    expect(form.sourceError.value).toBe('invalid:1');
    form.applyParsed({ target: 'clashr', sourceUrl: 'https://parsed.example.com', subscriptionName: 'Parsed Name', backendBase: '', options: { emoji: true } });
    expect(form.sourceError.value).toBe('');
    expect(form.state.target).toBe('clashr');
    expect(form.state.sourceUrl).toBe('https://parsed.example.com');
    expect(form.state.subscriptionName).toBe('Parsed Name');
    expect(form.state.options).toEqual({ emoji: true });
    expect(form.builtUrl.value).toBe('http://localhost:3000/sub?target=clashr&url=https%3A%2F%2Fparsed.example.com&filename=Parsed+Name&emoji=true');
  });

  it('applyGenerated restores a historical state and its exact generated URL', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'https://current.example.com';
    form.generateUrl();

    form.applyGenerated({
      target: 'singbox',
      sourceUrl: 'https://history.example.com',
      subscriptionName: 'History',
      backendBase: 'https://backend.example.com',
      options: { sort: true },
    }, 'https://backend.example.com/sub?target=singbox&url=https%3A%2F%2Fhistory.example.com&filename=History&sort=true');

    expect(form.state.target).toBe('singbox');
    expect(form.state.sourceUrl).toBe('https://history.example.com');
    expect(form.state.subscriptionName).toBe('History');
    expect(form.builtUrl.value).toBe('https://backend.example.com/sub?target=singbox&url=https%3A%2F%2Fhistory.example.com&filename=History&sort=true');
  });

  it('validateSource on an empty source returns true and clears a pre-existing error', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'not a url';
    form.validateSource();
    expect(form.sourceError.value).toBe('invalid:1');
    form.state.sourceUrl = '';
    expect(form.validateSource()).toBe(true);
    expect(form.sourceError.value).toBe('');
  });

  it('validateSource rejects a non-http(s) protocol', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'ftp://example.com/x';
    expect(form.validateSource()).toBe(false);
    expect(form.sourceError.value).toBe('invalid:1');
  });

  it('prepends a custom backend base when generating', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.target = 'clash';
    form.state.options = {};
    form.state.sourceUrl = 'https://s';
    form.state.subscriptionName = '';
    form.state.backendBase = 'http://127.0.0.1:25500/';
    expect(form.builtUrl.value).toBe('');
    expect(form.generateUrl()).toBe(true);
    expect(form.builtUrl.value).toBe('http://127.0.0.1:25500/sub?target=clash&url=https%3A%2F%2Fs');
  });

  it('clears the generated URL when the current form changes', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'https://valid.example.com';
    expect(form.generateUrl()).toBe(true);

    form.state.sourceUrl = 'https://changed.example.com';

    expect(form.builtUrl.value).toBe('');
  });

  it('clears the generated URL when validation fails', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'https://valid.example.com';
    expect(form.generateUrl()).toBe(true);

    form.state.sourceUrl = 'not a url';
    expect(form.generateUrl()).toBe(false);

    expect(form.sourceError.value).toBe('invalid:1');
    expect(form.builtUrl.value).toBe('');
  });

  it('is a module-level singleton: two calls share the same state', async () => {
    const { useFormState } = await freshFormState();
    const a = useFormState();
    const b = useFormState();
    expect(a.state).toBe(b.state);
    a.state.sourceUrl = 'https://shared.example.com';
    a.generateUrl();
    expect(b.builtUrl.value).toContain('https%3A%2F%2Fshared.example.com');
  });

  it('joins several sources with | in the generated url parameter', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.target = 'clash';
    form.state.options = {};
    form.state.subscriptionName = '';
    form.state.backendBase = 'http://127.0.0.1:25500';
    form.state.sourceUrl = 'https://a.example/sub\nhttps://b.example/sub';
    expect(form.validateSource()).toBe(true);
    expect(form.generateUrl()).toBe(true);
    const url = new URL(form.builtUrl.value);
    // One parameter, two sources, no newline: the backend splits on '|'.
    expect(url.searchParams.get('url')).toBe('https://a.example/sub|https://b.example/sub');
  });

  it('ignores blank lines between sources', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.target = 'clash';
    form.state.options = {};
    form.state.subscriptionName = '';
    form.state.backendBase = 'http://127.0.0.1:25500';
    form.state.sourceUrl = 'https://a.example/sub\n\n   \nhttps://b.example/sub';
    form.generateUrl();
    expect(new URL(form.builtUrl.value).searchParams.get('url'))
      .toBe('https://a.example/sub|https://b.example/sub');
  });

  it('flags comma-joined sources instead of accepting them', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    // This passes `new URL()` because commas are legal in a path, which is
    // exactly how it used to slip through as a single unusable source.
    form.state.sourceUrl = 'https://a.example/sub,https://b.example/sub';
    expect(form.validateSource()).toBe(false);
    expect(form.sourceError.value).toBe('comma');
  });

  it('reports which line of a multi-line source list is invalid', async () => {
    const { useFormState } = await freshFormState();
    const form = useFormState();
    form.state.sourceUrl = 'https://ok.example/sub\nnot a url';
    expect(form.validateSource()).toBe(false);
    expect(form.sourceError.value).toBe('invalid:2');
  });
});

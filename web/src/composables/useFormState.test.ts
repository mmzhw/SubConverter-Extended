import { describe, it, expect } from 'vitest';
import { DEFAULT_EXCLUDE_REMARKS } from '../config/options';
import { useFormState } from './useFormState';

describe('useFormState', () => {
  it('builds the URL reactively from state', () => {
    const form = useFormState();
    expect(form.builtUrl.value).toBe('');
    form.state.sourceUrl = 'https://sub.example.com/';
    form.state.subscriptionName = '我的订阅';
    expect(form.builtUrl.value).toContain('/sub?target=clash&url=https%3A%2F%2Fsub.example.com%2F');
    expect(form.builtUrl.value).toContain('filename=%E6%88%91%E7%9A%84%E8%AE%A2%E9%98%85');
    expect(decodeURIComponent(form.builtUrl.value)).toContain(`exclude=${DEFAULT_EXCLUDE_REMARKS}`);
    expect(form.builtUrl.value).toContain('provider=false');
    expect(form.builtUrl.value).toContain('emoji=true');
    expect(form.builtUrl.value).toContain('sort=true');
    expect(form.builtUrl.value).toContain('fdn=true');
    expect(form.builtUrl.value).toContain('append_type=true');
  });

  it('validates the source URL on demand', () => {
    const form = useFormState();
    form.state.sourceUrl = 'not a url';
    expect(form.validateSource()).toBe(false);
    expect(form.sourceError.value).toBe('invalid');
    form.state.sourceUrl = 'https://ok.example.com';
    expect(form.validateSource()).toBe(true);
    expect(form.sourceError.value).toBe('');
  });

  it('applyParsed overwrites state and clears sourceError', () => {
    const form = useFormState();
    form.state.sourceUrl = 'not a url';
    form.validateSource();
    expect(form.sourceError.value).toBe('invalid');
    form.applyParsed({ target: 'clashr', sourceUrl: 'https://parsed.example.com', subscriptionName: 'Parsed Name', backendBase: '', options: { emoji: true } });
    expect(form.sourceError.value).toBe('');
    expect(form.state.target).toBe('clashr');
    expect(form.state.sourceUrl).toBe('https://parsed.example.com');
    expect(form.state.subscriptionName).toBe('Parsed Name');
    expect(form.state.options).toEqual({ emoji: true });
    expect(form.builtUrl.value).toBe('http://localhost:3000/sub?target=clashr&url=https%3A%2F%2Fparsed.example.com&filename=Parsed+Name&emoji=true');
  });

  it('validateSource on an empty source returns true and clears a pre-existing error', () => {
    const form = useFormState();
    form.state.sourceUrl = 'not a url';
    form.validateSource();
    expect(form.sourceError.value).toBe('invalid');
    form.state.sourceUrl = '';
    expect(form.validateSource()).toBe(true);
    expect(form.sourceError.value).toBe('');
  });

  it('validateSource rejects a non-http(s) protocol', () => {
    const form = useFormState();
    form.state.sourceUrl = 'ftp://example.com/x';
    expect(form.validateSource()).toBe(false);
    expect(form.sourceError.value).toBe('invalid');
  });

  it('prepends a custom backend base reactively', () => {
    const form = useFormState();
    form.state.target = 'clash';
    form.state.options = {};
    form.state.sourceUrl = 'https://s';
    form.state.subscriptionName = '';
    form.state.backendBase = 'http://127.0.0.1:25500/';
    expect(form.builtUrl.value).toBe('http://127.0.0.1:25500/sub?target=clash&url=https%3A%2F%2Fs');
  });

  it('is a module-level singleton: two calls share the same state', () => {
    const a = useFormState();
    const b = useFormState();
    expect(a.state).toBe(b.state);
    a.state.sourceUrl = 'https://shared.example.com';
    expect(b.builtUrl.value).toContain('https%3A%2F%2Fshared.example.com');
  });
});

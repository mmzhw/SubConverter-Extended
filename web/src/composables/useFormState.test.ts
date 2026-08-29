import { describe, it, expect } from 'vitest';
import { useFormState } from './useFormState';

describe('useFormState', () => {
  it('builds the URL reactively from state', () => {
    const form = useFormState();
    expect(form.builtUrl.value).toBe('');
    form.state.sourceUrl = 'https://sub.example.com/';
    expect(form.builtUrl.value).toBe('/sub?target=clash&url=https%3A%2F%2Fsub.example.com%2F');
    form.state.options.emoji = true;
    expect(form.builtUrl.value).toContain('emoji=true');
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
});

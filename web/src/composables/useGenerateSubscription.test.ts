import { beforeEach, describe, expect, it, vi } from 'vitest';

async function freshGenerateSubscription() {
  vi.resetModules();
  return import('./useGenerateSubscription');
}

describe('useGenerateSubscription', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates the current URL and records it in history', async () => {
    const { useGenerateSubscription } = await freshGenerateSubscription();
    const { generate, form, generated } = useGenerateSubscription();

    form.state.sourceUrl = 'https://sub.example.com/a';
    form.state.subscriptionName = '测试订阅';

    expect(generate()).toBe(true);
    expect(form.builtUrl.value).toContain('filename=%E6%B5%8B%E8%AF%95%E8%AE%A2%E9%98%85');
    expect(generated.links.value).toHaveLength(1);
    expect(generated.links.value[0].url).toBe(form.builtUrl.value);
    expect(generated.links.value[0].title).toBe('测试订阅');
  });

  it('does not record history when generation fails', async () => {
    const { useGenerateSubscription } = await freshGenerateSubscription();
    const { generate, form, generated } = useGenerateSubscription();

    form.state.sourceUrl = 'not a url';

    expect(generate()).toBe(false);
    expect(form.builtUrl.value).toBe('');
    expect(generated.links.value).toHaveLength(0);
  });
});

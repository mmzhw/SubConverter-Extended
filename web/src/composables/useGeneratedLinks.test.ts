import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormState } from '../lib/url-builder';

function state(overrides: Partial<FormState> = {}): FormState {
  return {
    target: 'clash',
    sourceUrl: 'https://sub.example.com/a',
    subscriptionName: '',
    backendBase: '',
    githubProxy: '',
    customGithubProxy: '',
    options: { emoji: true },
    ...overrides,
  };
}

async function freshGeneratedLinks() {
  vi.resetModules();
  return import('./useGeneratedLinks');
}

describe('useGeneratedLinks', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('records a generated link with a subscription title and cloned state', async () => {
    const { useGeneratedLinks } = await freshGeneratedLinks();
    const generated = useGeneratedLinks();
    const formState = state({ subscriptionName: '我的订阅' });

    generated.record('http://localhost:5173/sub?target=clash', formState);
    formState.options.emoji = false;

    expect(generated.links.value).toHaveLength(1);
    expect(generated.links.value[0].title).toBe('我的订阅');
    expect(generated.links.value[0].state.options.emoji).toBe(true);
  });

  it('uses the source host as the title when subscription name is blank', async () => {
    const { useGeneratedLinks } = await freshGeneratedLinks();
    const generated = useGeneratedLinks();

    generated.record('http://localhost:5173/sub?target=clash', state());

    expect(generated.links.value[0].title).toBe('sub.example.com');
  });

  it('deduplicates by generated URL and keeps the latest state first', async () => {
    const { useGeneratedLinks } = await freshGeneratedLinks();
    const generated = useGeneratedLinks();
    const url = 'http://localhost:5173/sub?target=clash';

    generated.record(url, state({ subscriptionName: '旧名称' }));
    generated.record(url, state({ subscriptionName: '新名称' }));

    expect(generated.links.value).toHaveLength(1);
    expect(generated.links.value[0].title).toBe('新名称');
  });

  it('keeps at most twelve records', async () => {
    const { MAX_GENERATED_LINKS, useGeneratedLinks } = await freshGeneratedLinks();
    const generated = useGeneratedLinks();

    for (let index = 0; index < MAX_GENERATED_LINKS + 2; index += 1) {
      generated.record(`http://localhost:5173/sub?i=${index}`, state({ subscriptionName: `sub-${index}` }));
    }

    expect(generated.links.value).toHaveLength(MAX_GENERATED_LINKS);
    expect(generated.links.value[0].title).toBe('sub-13');
    expect(generated.links.value[generated.links.value.length - 1]?.title).toBe('sub-2');
  });

  it('ignores empty generated URLs and blank source URLs', async () => {
    const { useGeneratedLinks } = await freshGeneratedLinks();
    const generated = useGeneratedLinks();

    generated.record('', state());
    generated.record('http://localhost:5173/sub', state({ sourceUrl: '   ' }));

    expect(generated.links.value).toHaveLength(0);
  });

  it('loads existing records from browser storage', async () => {
    const { GENERATED_LINKS_KEY } = await freshGeneratedLinks();
    localStorage.setItem(GENERATED_LINKS_KEY, JSON.stringify([
      {
        id: 'saved',
        url: 'http://localhost:5173/sub?target=clash',
        title: 'Saved',
        target: 'clash',
        sourceUrl: 'https://sub.example.com/a',
        subscriptionName: 'Saved',
        createdAt: 1,
        state: state({ subscriptionName: 'Saved' }),
      },
    ]));

    const { useGeneratedLinks } = await freshGeneratedLinks();

    expect(useGeneratedLinks().links.value[0].title).toBe('Saved');
  });

  it('drops stored records with invalid state shape', async () => {
    const { GENERATED_LINKS_KEY } = await freshGeneratedLinks();
    localStorage.setItem(GENERATED_LINKS_KEY, JSON.stringify([
      {
        id: 'broken',
        url: 'http://localhost:5173/sub?target=clash',
        title: 'Broken',
        target: 'clash',
        sourceUrl: 'https://sub.example.com/a',
        subscriptionName: 'Broken',
        createdAt: 1,
        state: { target: undefined, sourceUrl: undefined, options: undefined },
      },
    ]));

    const { useGeneratedLinks } = await freshGeneratedLinks();

    expect(useGeneratedLinks().links.value).toHaveLength(0);
  });

  it('can clear stored records', async () => {
    const { GENERATED_LINKS_KEY, useGeneratedLinks } = await freshGeneratedLinks();
    const generated = useGeneratedLinks();

    generated.record('http://localhost:5173/sub?target=clash', state());
    generated.clear();

    expect(generated.links.value).toHaveLength(0);
    expect(localStorage.getItem(GENERATED_LINKS_KEY)).toBe('[]');
  });
});

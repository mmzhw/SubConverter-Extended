import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { useGroupNames, FALLBACK_GROUP_NAMES } from './useGroupNames';

describe('useGroupNames', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
    (fetch as unknown as ReturnType<typeof vi.fn>).mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function respondWith(groups: string[]) {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ groups }),
    });
  }

  it('returns fallback groups without a request when configUrl is empty', () => {
    const state = useGroupNames(() => '');
    state.refresh();
    expect(state.groups.value).toEqual(FALLBACK_GROUP_NAMES);
    expect(state.error.value).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('debounces and fetches group names', async () => {
    respondWith(['Proxy', 'Direct', 'GLOBAL', 'REJECT', 'MyGroup']);
    const state = useGroupNames(() => 'https://c/preset.ini');
    state.refresh();
    await vi.advanceTimersByTimeAsync(299);
    expect(fetch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await nextTick();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/getgroupnames?config=');
    expect(state.groups.value).toContain('MyGroup');
    expect(state.error.value).toBe(false);
  });

  it('caches by configUrl', async () => {
    respondWith(['Proxy', 'Direct', 'GLOBAL', 'REJECT']);
    const state = useGroupNames(() => 'https://c/preset.ini');
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sets error on failure and clears groups instead of guessing', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: ['MyGroup'] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 400 });
    let configUrl = 'https://c/preset.ini';
    const state = useGroupNames(() => configUrl);
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(state.groups.value).toEqual(['MyGroup']);
    configUrl = 'https://c/other.ini';
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(state.error.value).toBe(true);
    // The previously loaded groups belong to a different config, and the
    // fallback names would be a guess. Neither may be offered, because a
    // wrong group name yields a config the client refuses to load.
    expect(state.groups.value).toEqual([]);
  });

  it('clears groups when the config declares none, rather than falling back', async () => {
    respondWith([]);
    const state = useGroupNames(() => 'https://c/preset.ini');
    expect(state.groups.value).toEqual(FALLBACK_GROUP_NAMES);
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(state.error.value).toBe(false);
    expect(state.groups.value).toEqual([]);
  });

  it('does not leave fallback names on screen when the first load fails', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });
    const state = useGroupNames(() => 'https://c/preset.ini');
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(state.error.value).toBe(true);
    expect(state.groups.value).not.toEqual(FALLBACK_GROUP_NAMES);
    expect(state.groups.value).toEqual([]);
  });

  it('rewrites the config URL through the GitHub proxy before fetching', async () => {
    respondWith(['Proxy']);
    const state = useGroupNames(
      () => 'https://raw.githubusercontent.com/Aethersailor/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash.ini',
      '',
      () => 'https://gh-proxy.com/',
      () => '',
    );
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    const sentConfig = new URL(String(url)).searchParams.get('config');
    expect(sentConfig).toBe(
      'https://gh-proxy.com/https://raw.githubusercontent.com/Aethersailor/Custom_OpenClash_Rules/refs/heads/main/cfg/Custom_Clash.ini',
    );
  });

  it('caches the rewritten URL, not the raw one', async () => {
    respondWith(['Proxy']);
    const state = useGroupNames(
      () => 'https://raw.githubusercontent.com/A/B/c.ini',
      '',
      () => 'https://gh-proxy.com/',
      () => '',
    );
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(fetch).toHaveBeenCalledTimes(1);
    // Same raw URL, same proxy — should hit cache, no second fetch.
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('surfaces error and stops loading when the fetch times out', async () => {
    // Simulate a fetch that respects the AbortSignal (real fetch does).
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, init?: RequestInit) => new Promise((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      }),
    );
    const state = useGroupNames(() => 'https://c/preset.ini');
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(state.loading.value).toBe(true);
    // Advance past the 8s fetch timeout.
    await vi.advanceTimersByTimeAsync(8100);
    await nextTick();
    expect(state.loading.value).toBe(false);
    expect(state.error.value).toBe(true);
  });
});

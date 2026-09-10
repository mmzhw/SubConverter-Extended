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

  it('sets error on failure and keeps last groups', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: ['Proxy', 'Direct', 'GLOBAL', 'REJECT', 'MyGroup'] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 400 });
    let configUrl = 'https://c/preset.ini';
    const state = useGroupNames(() => configUrl);
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    configUrl = 'https://c/other.ini';
    state.refresh();
    await vi.advanceTimersByTimeAsync(300);
    await nextTick();
    expect(state.error.value).toBe(true);
    expect(state.groups.value).toEqual(['Proxy', 'Direct', 'GLOBAL', 'REJECT', 'MyGroup']);
  });
});

import { computed, ref } from 'vue';
import { backendBaseForState } from '../lib/url-builder';

export const FALLBACK_GROUP_NAMES = ['Direct', 'GLOBAL', 'Proxy', 'REJECT'];

/** Loads the valid ext_ruleset group names for a remote config URL.
 *  - empty configUrl -> fallback groups, no request
 *  - 300ms debounce, in-memory cache keyed by configUrl (per composable instance)
 *  - failure keeps the last known groups and sets error
 *  - backendBase overrides the backend origin (default: page origin)
 */
export function useGroupNames(configUrl: () => string, backendBase: string = '') {
  const cache = new Map<string, string[]>();
  const groups = ref<string[]>([...FALLBACK_GROUP_NAMES]);
  const loading = ref(false);
  const error = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function refresh() {
    const url = configUrl();
    if (!url) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      loading.value = false;
      groups.value = [...FALLBACK_GROUP_NAMES];
      error.value = false;
      return;
    }
    if (cache.has(url)) {
      groups.value = cache.get(url)!;
      error.value = false;
      return;
    }
    if (timer) clearTimeout(timer);
    loading.value = true;
    timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ config: url });
        const response = await fetch(
          `${backendBaseForState({ backendBase })}/getgroupnames?${params}`,
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { groups?: string[] };
        const list = payload.groups && payload.groups.length
          ? payload.groups
          : [...FALLBACK_GROUP_NAMES];
        cache.set(url, list);
        groups.value = list;
        error.value = false;
      } catch {
        error.value = true;
      } finally {
        loading.value = false;
        timer = null;
      }
    }, 300);
  }

  const ready = computed(() => !loading.value && !error.value);
  return { groups, loading, error, ready, refresh };
}

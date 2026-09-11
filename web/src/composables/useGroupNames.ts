import { computed, ref } from 'vue';
import { backendBaseForState } from '../lib/url-builder';
import { applyGitHubProxy, githubProxyPrefixFor } from '../lib/github-proxy';

export const FALLBACK_GROUP_NAMES = ['Direct', 'GLOBAL', 'Proxy', 'REJECT'];

/** How long to wait for `/getgroupnames` before giving up and
 *  surfacing the failure to the UI. Mirrors what nginx upstream
 *  timeout eventually returns, but keeps the user from staring at a
 *  spinner for the full upstream deadline when the network is just
 *  blocked. */
const FETCH_TIMEOUT_MS = 8000;

/** Loads the valid ext_ruleset group names for a remote config URL.
 *  - empty configUrl -> fallback groups, no request
 *  - 300ms debounce, in-memory cache keyed by configUrl (per composable instance)
 *  - failure keeps the last known groups and sets error
 *  - backendBase overrides the backend origin (default: page origin)
 *  - githubProxy/customGithubProxy rewrite the config URL the same way
 *    buildSubUrl does for the subscription URL, so /getgroupnames can
 *    reach configs hosted behind a CDN/proxy when raw GitHub is blocked.
 *    Cache key is the *rewritten* URL so two pages with different
 *    proxies don't share state.
 */
export function useGroupNames(
  configUrl: () => string,
  backendBase: string = '',
  githubProxy: () => string | undefined = () => '',
  customGithubProxy: () => string | undefined = () => '',
) {
  const cache = new Map<string, string[]>();
  const groups = ref<string[]>([...FALLBACK_GROUP_NAMES]);
  const loading = ref(false);
  const error = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inflight: AbortController | null = null;

  function refresh() {
    const rawUrl = configUrl();
    if (!rawUrl) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (inflight) {
        inflight.abort();
        inflight = null;
      }
      loading.value = false;
      groups.value = [...FALLBACK_GROUP_NAMES];
      error.value = false;
      return;
    }
    const proxyPrefix = githubProxyPrefixFor(githubProxy(), customGithubProxy());
    const rewrittenUrl = applyGitHubProxy(rawUrl, proxyPrefix);
    if (cache.has(rewrittenUrl)) {
      groups.value = cache.get(rewrittenUrl)!;
      error.value = false;
      return;
    }
    if (timer) clearTimeout(timer);
    if (inflight) {
      inflight.abort();
      inflight = null;
    }
    loading.value = true;
    timer = setTimeout(async () => {
      const controller = new AbortController();
      inflight = controller;
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const params = new URLSearchParams({ config: rewrittenUrl });
        const response = await fetch(
          `${backendBaseForState({ backendBase })}/getgroupnames?${params}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { groups?: string[] };
        const list = payload.groups && payload.groups.length
          ? payload.groups
          : [...FALLBACK_GROUP_NAMES];
        cache.set(rewrittenUrl, list);
        groups.value = list;
        error.value = false;
      } catch {
        error.value = true;
      } finally {
        clearTimeout(timeoutId);
        loading.value = false;
        if (inflight === controller) inflight = null;
        timer = null;
      }
    }, 300);
  }

  const ready = computed(() => !loading.value && !error.value);
  return { groups, loading, error, ready, refresh };
}

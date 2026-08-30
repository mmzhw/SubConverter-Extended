export type ProxyLatencySource = 'server' | 'browser';
export type ProxyLatencyStatus = 'idle' | 'testing' | 'ok' | 'timeout' | 'error';

export interface ProxyLatency {
  status: ProxyLatencyStatus;
  ms?: number;
  source?: ProxyLatencySource;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response | { ok: boolean; json?: () => Promise<unknown> }>;

export interface PreferredLatencyOptions {
  backendBase: string;
  url: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  now?: () => number;
}

const defaultTimeoutMs = 6000;

export function buildServerLatencyUrl(backendBase: string, url: string, timeoutMs?: number): string {
  const base = backendBase.replace(/\/+$/, '');
  const params = new URLSearchParams({ url });
  if (timeoutMs !== undefined) params.set('timeout_ms', String(timeoutMs));
  return `${base}/api/github-proxy-latency?${params.toString()}`;
}

function normalizeServerStatus(value: unknown): ProxyLatencyStatus {
  return value === 'ok' || value === 'timeout' || value === 'error' ? value : 'error';
}

export async function measureServerProxyLatency(
  backendBase: string,
  url: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs?: number,
): Promise<ProxyLatency> {
  const response = await fetchImpl(buildServerLatencyUrl(backendBase, url, timeoutMs), {
    method: 'GET',
    cache: 'no-store',
  });
  if (!response.ok || typeof response.json !== 'function') {
    throw new Error('server-latency-unavailable');
  }
  const body = await response.json() as { status?: unknown; ms?: unknown };
  const status = normalizeServerStatus(body.status);
  return {
    status,
    ms: status === 'ok' && typeof body.ms === 'number' ? body.ms : undefined,
    source: 'server',
  };
}

export async function measureBrowserProxyLatency(
  url: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = defaultTimeoutMs,
  now: () => number = () => performance.now(),
): Promise<ProxyLatency> {
  const start = now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetchImpl(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    return { status: 'ok', ms: Math.max(0, Math.round(now() - start)), source: 'browser' };
  } catch (error) {
    return {
      status: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'error',
      source: 'browser',
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export async function measurePreferredProxyLatency({
  backendBase,
  url,
  fetchImpl = fetch,
  timeoutMs = defaultTimeoutMs,
  now,
}: PreferredLatencyOptions): Promise<ProxyLatency> {
  try {
    return await measureServerProxyLatency(backendBase, url, fetchImpl, timeoutMs);
  } catch {
    return measureBrowserProxyLatency(url, fetchImpl, timeoutMs, now);
  }
}

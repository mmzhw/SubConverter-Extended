import { normalizeBackendBase } from './url-builder';

export interface DnsTemplatePayload {
  id?: string;
  content: string;
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response | { ok: boolean; json?: () => Promise<unknown> }>;

function dnsTemplateUrl(backendBase: string, id?: string) {
  const base = normalizeBackendBase(backendBase);
  if (!id) return `${base}/api/dns-template`;
  return `${base}/api/dns-template?id=${encodeURIComponent(id)}`;
}

function normalizePayload(body: unknown): DnsTemplatePayload {
  if (!body || typeof body !== 'object' || typeof (body as { content?: unknown }).content !== 'string') {
    throw new Error('invalid-dns-template-response');
  }
  const payload = body as { id?: unknown; content: string };
  return {
    id: typeof payload.id === 'string' ? payload.id : undefined,
    content: payload.content,
  };
}

export async function loadDnsTemplate(
  backendBase: string,
  id = '',
  fetcher: FetchLike = fetch,
): Promise<DnsTemplatePayload> {
  const response = await fetcher(dnsTemplateUrl(backendBase, id), {
    method: 'GET',
    cache: 'no-store',
  });
  if (!response.ok || typeof response.json !== 'function') throw new Error('dns-template-load-failed');
  return normalizePayload(await response.json());
}

export async function saveDnsTemplate(
  backendBase: string,
  content: string,
  fetcher: FetchLike = fetch,
): Promise<DnsTemplatePayload> {
  const response = await fetcher(dnsTemplateUrl(backendBase), {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok || typeof response.json !== 'function') throw new Error('dns-template-save-failed');
  return normalizePayload(await response.json());
}

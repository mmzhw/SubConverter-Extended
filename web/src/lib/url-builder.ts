export interface FormState {
  target: string;
  sourceUrl: string;
  backendBase: string;
  options: Record<string, string | number | boolean | undefined>;
}

export function buildSubUrl(state: FormState): string {
  const params = new URLSearchParams();
  params.set('target', state.target);
  params.set('url', state.sourceUrl);
  for (const [key, value] of Object.entries(state.options)) {
    if (value === undefined || value === false || value === '') continue;
    params.set(key, value === true ? 'true' : String(value));
  }
  const base = state.backendBase ? state.backendBase.replace(/\/+$/, '') : '';
  return `${base}/sub?${params.toString()}`;
}

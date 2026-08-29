import { computed, ref } from 'vue';
import type { FormState } from '../lib/url-builder';

export interface GeneratedLink {
  id: string;
  url: string;
  title: string;
  target: string;
  sourceUrl: string;
  subscriptionName: string;
  createdAt: number;
  state: FormState;
}

export const GENERATED_LINKS_KEY = 'sce-generated-links-v1';
export const MAX_GENERATED_LINKS = 12;

function cloneState(state: FormState): FormState {
  return {
    target: state.target,
    sourceUrl: state.sourceUrl,
    subscriptionName: state.subscriptionName,
    backendBase: state.backendBase,
    githubProxy: state.githubProxy,
    customGithubProxy: state.customGithubProxy,
    options: { ...state.options },
  };
}

function sourceHost(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return sourceUrl.trim();
  }
}

function titleFor(state: FormState): string {
  const name = state.subscriptionName.trim();
  if (name) return name;
  const host = sourceHost(state.sourceUrl);
  return host || state.target;
}

function normalizeParsed(value: unknown): GeneratedLink[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GeneratedLink => (
    !!item &&
    typeof item === 'object' &&
    typeof (item as GeneratedLink).id === 'string' &&
    typeof (item as GeneratedLink).url === 'string' &&
    typeof (item as GeneratedLink).title === 'string' &&
    typeof (item as GeneratedLink).createdAt === 'number' &&
    !!(item as GeneratedLink).state &&
    typeof (item as GeneratedLink).state === 'object'
  )).slice(0, MAX_GENERATED_LINKS);
}

function browserStorage(): Storage | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  return localStorage;
}

function loadFromStorage(storage: Storage | undefined = browserStorage()): GeneratedLink[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(GENERATED_LINKS_KEY);
    if (!raw) return [];
    return normalizeParsed(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveToStorage(items: GeneratedLink[], storage: Storage | undefined = browserStorage()) {
  if (!storage) return;
  try {
    storage.setItem(GENERATED_LINKS_KEY, JSON.stringify(items));
  } catch {
    // Ignore unavailable storage; the in-memory list still works for this tab.
  }
}

const links = ref<GeneratedLink[]>(loadFromStorage());

function record(url: string, state: FormState) {
  const trimmed = url.trim();
  if (!trimmed || !state.sourceUrl.trim()) return;
  const now = Date.now();
  const item: GeneratedLink = {
    id: `${now}-${trimmed.length}`,
    url: trimmed,
    title: titleFor(state),
    target: state.target,
    sourceUrl: state.sourceUrl,
    subscriptionName: state.subscriptionName,
    createdAt: now,
    state: cloneState(state),
  };
  links.value = [item, ...links.value.filter((existing) => existing.url !== trimmed)]
    .slice(0, MAX_GENERATED_LINKS);
  saveToStorage(links.value);
}

function remove(id: string) {
  links.value = links.value.filter((item) => item.id !== id);
  saveToStorage(links.value);
}

function clear() {
  links.value = [];
  saveToStorage(links.value);
}

export function useGeneratedLinks() {
  return {
    links: computed(() => links.value),
    record,
    remove,
    clear,
  };
}

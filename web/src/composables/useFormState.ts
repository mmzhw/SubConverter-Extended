import { computed, reactive, ref } from 'vue';
import { OPTION_DEFS } from '../config/options';
import { buildSubUrl, FormState } from '../lib/url-builder';

function defaultOptions(): FormState['options'] {
  return Object.fromEntries(
    OPTION_DEFS
      .filter((def) => def.initialValue !== undefined || (def.type !== 'boolean' && def.defaultValue !== undefined && def.defaultValue !== ''))
      .map((def) => [def.key, def.initialValue ?? def.defaultValue]),
  );
}

const state = reactive<FormState>({
  target: 'clash',
  sourceUrl: '',
  subscriptionName: '',
  backendBase: '',
  githubProxy: '',
  customGithubProxy: '',
  options: defaultOptions(),
});
const builtUrl = computed(() => {
  if (!state.sourceUrl) return '';
  return buildSubUrl({
    target: state.target,
    sourceUrl: state.sourceUrl,
    subscriptionName: state.subscriptionName,
    backendBase: state.backendBase,
    githubProxy: state.githubProxy,
    customGithubProxy: state.customGithubProxy,
    options: { ...state.options },
  });
});
const sourceError = ref('');

function validateSource(): boolean {
  if (!state.sourceUrl) { sourceError.value = ''; return true; }
  try {
    const u = new URL(state.sourceUrl);
    const valid = u.protocol === 'http:' || u.protocol === 'https:';
    sourceError.value = valid ? '' : 'invalid';
    return valid;
  } catch {
    sourceError.value = 'invalid';
    return false;
  }
}

function applyParsed(next: FormState) {
  sourceError.value = '';
  state.target = next.target;
  state.sourceUrl = next.sourceUrl;
  state.subscriptionName = next.subscriptionName || '';
  state.backendBase = next.backendBase;
  state.githubProxy = next.githubProxy || '';
  state.customGithubProxy = next.customGithubProxy || '';
  state.options = { ...next.options };
}

export function useFormState() {
  return { state, builtUrl, sourceError, validateSource, applyParsed };
}

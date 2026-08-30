import { computed, reactive, ref } from 'vue';
import { OPTION_DEFS } from '../config/options';
import { buildSubUrl, type FormState } from '../lib/url-builder';

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
  dnsTemplateId: '',
  backendBase: '',
  githubProxy: '',
  customGithubProxy: '',
  options: defaultOptions(),
});

const generatedUrl = ref('');
const generatedSignature = ref('');

function currentState(): FormState {
  return {
    target: state.target,
    sourceUrl: state.sourceUrl,
    subscriptionName: state.subscriptionName,
    dnsTemplateId: state.dnsTemplateId,
    backendBase: state.backendBase,
    githubProxy: state.githubProxy,
    customGithubProxy: state.customGithubProxy,
    options: { ...state.options },
  };
}

function signatureFor(next: FormState) {
  return JSON.stringify(next);
}

const builtUrl = computed(() => {
  const snapshot = currentState();
  if (!generatedUrl.value || generatedSignature.value !== signatureFor(snapshot)) return '';
  return generatedUrl.value;
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
  state.dnsTemplateId = next.dnsTemplateId || '';
  state.backendBase = next.backendBase;
  state.githubProxy = next.githubProxy || '';
  state.customGithubProxy = next.customGithubProxy || '';
  state.options = { ...next.options };
  const snapshot = currentState();
  generatedUrl.value = next.sourceUrl ? buildSubUrl(snapshot) : '';
  generatedSignature.value = generatedUrl.value ? signatureFor(snapshot) : '';
}

function applyGenerated(next: FormState, url: string) {
  sourceError.value = '';
  state.target = next.target;
  state.sourceUrl = next.sourceUrl;
  state.subscriptionName = next.subscriptionName || '';
  state.dnsTemplateId = next.dnsTemplateId || '';
  state.backendBase = next.backendBase;
  state.githubProxy = next.githubProxy || '';
  state.customGithubProxy = next.customGithubProxy || '';
  state.options = { ...next.options };
  generatedUrl.value = url;
  generatedSignature.value = signatureFor(currentState());
}

function generateUrl(): boolean {
  if (!state.sourceUrl.trim()) {
    sourceError.value = '';
    generatedUrl.value = '';
    generatedSignature.value = '';
    return false;
  }
  if (!validateSource()) {
    generatedUrl.value = '';
    generatedSignature.value = '';
    return false;
  }
  const snapshot = currentState();
  generatedUrl.value = buildSubUrl(snapshot);
  generatedSignature.value = signatureFor(snapshot);
  return true;
}

export function useFormState() {
  return { state, builtUrl, sourceError, validateSource, applyParsed, applyGenerated, generateUrl };
}

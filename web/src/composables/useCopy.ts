import { ref } from 'vue';
import { copyText } from '../lib/clipboard';

export type CopyState = 'idle' | 'loading' | 'copied' | 'error';

export function useCopy() {
  const state = ref<CopyState>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;
  async function copy(value: string) {
    if (!value || state.value === 'loading') return;
    state.value = 'loading';
    const res = await copyText(value);
    state.value = res.ok ? 'copied' : 'error';
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { state.value = 'idle'; }, 2000);
  }
  return { state, copy };
}

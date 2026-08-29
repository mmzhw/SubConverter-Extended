<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useFormState } from '../composables/useFormState';
import { useCopy } from '../composables/useCopy';

const { t } = useI18n();
const form = useFormState();
const { state: copyState, copy } = useCopy();

function scrollToQr() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('qr-target')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}
</script>

<template>
  <div class="bottom-bar">
    <el-button class="grow" type="primary" size="large" :loading="copyState === 'loading'" @click="copy(form.builtUrl.value)">
      {{ copyState === 'copied' ? t('preview.copied') : copyState === 'error' ? t('preview.copyFailed') : t('preview.copy') }}
    </el-button>
    <el-button size="large" @click="scrollToQr">{{ t('preview.qr') }}</el-button>
  </div>
</template>

<style scoped>
.bottom-bar { display: none; }
@media (max-width: 767px) {
  .bottom-bar {
    display: flex; gap: 8px; position: fixed; left: 0; right: 0; bottom: 0;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--surface-strong); border-top: 1px solid var(--surface-border); z-index: 100;
  }
  .grow { flex: 1; }
  .bottom-bar :deep(.el-button) { min-height: 44px; }
}
</style>

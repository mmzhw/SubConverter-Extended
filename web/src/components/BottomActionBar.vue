<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { CopyDocument, Grid, MagicStick } from '@element-plus/icons-vue';
import { useCopy } from '../composables/useCopy';
import { useGenerateSubscription } from '../composables/useGenerateSubscription';

const { t } = useI18n();
const { form, generate } = useGenerateSubscription();
const { state: copyState, copy } = useCopy();
const copyLabel = computed(() => {
  if (copyState.value === 'copied') return t('preview.copied');
  if (copyState.value === 'error') return t('preview.copyFailed');
  return t('preview.copy');
});
const isCopying = computed(() => copyState.value === 'loading');

function scrollToQr() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('qr-target')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
}
</script>

<template>
  <div class="bottom-bar">
    <el-button class="grow" type="primary" size="large" :icon="MagicStick" @click="generate">
      {{ t('preview.generate') }}
    </el-button>
    <el-button size="large" :icon="CopyDocument" :loading="isCopying" :disabled="!form.builtUrl.value" @click="copy(form.builtUrl.value)">
      {{ copyLabel }}
    </el-button>
    <el-button size="large" :icon="Grid" :disabled="!form.builtUrl.value" @click="scrollToQr">{{ t('preview.qr') }}</el-button>
  </div>
</template>

<style scoped>
.bottom-bar { display: none; }
@media (max-width: 767px) {
  .bottom-bar {
    display: flex; gap: 8px; position: fixed; left: 0; right: 0; bottom: 0;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--surface-strong);
    border-top: 1px solid var(--surface-border);
    box-shadow: 0 -16px 36px rgba(15, 23, 42, 0.12);
    z-index: 100;
  }
  .grow { flex: 1; }
  .bottom-bar :deep(.el-button) {
    min-height: 46px;
    margin-left: 0;
  }
}
</style>

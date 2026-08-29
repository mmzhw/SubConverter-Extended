<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import QRCode from 'qrcode';
import { useFormState } from '../composables/useFormState';
import { useCopy } from '../composables/useCopy';
import ImportDialog from './ImportDialog.vue';
import PresetBar from './PresetBar.vue';

const { t } = useI18n();
const form = useFormState();
const { state: copyState, copy } = useCopy();
const qrDataUrl = ref('');
const importVisible = ref(false);

watch(
  () => form.builtUrl.value,
  async (url) => {
    if (!url) { qrDataUrl.value = ''; return; }
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, { margin: 1, width: 240 });
    } catch {
      qrDataUrl.value = '';
    }
  },
  { immediate: true },
);

const copyLabel = computed(() => {
  if (copyState.value === 'copied') return t('preview.copied');
  if (copyState.value === 'error') return t('preview.copyFailed');
  return t('preview.copy');
});
</script>

<template>
  <div class="preview">
    <div class="preview-title">{{ t('preview.title') }}</div>
    <code class="url-code">{{ form.builtUrl.value || '-' }}</code>
    <div class="preview-actions">
      <el-button type="primary" :loading="copyState === 'loading'" @click="copy(form.builtUrl.value)">
        {{ copyLabel }}
      </el-button>
      <el-button @click="importVisible = true">{{ t('form.importLink') }}</el-button>
    </div>
    <div id="qr-target" class="qr-wrap">
      <img v-if="qrDataUrl" :src="qrDataUrl" :alt="t('preview.qr')" width="240" height="240" />
    </div>
    <PresetBar />
    <ImportDialog v-model="importVisible" />
  </div>
</template>

<style scoped>
.preview { background: var(--surface); border: 1px solid var(--surface-border); border-radius: 28px; padding: 20px; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
.preview-title { font-weight: 700; font-size: 0.95rem; margin-bottom: 10px; }
.url-code { display: block; padding: 12px; border-radius: 12px; background: var(--control-bg); border: 1px solid var(--surface-border); word-break: break-all; font-size: 0.82rem; line-height: 1.6; }
.preview-actions { display: flex; gap: 10px; margin-top: 12px; }
.qr-wrap { margin-top: 14px; text-align: center; }
</style>

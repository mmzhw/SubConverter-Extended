<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { CopyDocument, Download, Upload } from '@element-plus/icons-vue';
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
      const data = await QRCode.toDataURL(url, { margin: 1, width: 240 });
      // 丢弃过期响应：URL 已在生成期间变化时不覆盖当前结果
      if (url === form.builtUrl.value) qrDataUrl.value = data;
    } catch {
      if (url === form.builtUrl.value) qrDataUrl.value = '';
    }
  },
  { immediate: true },
);

const copyLabel = computed(() => {
  if (copyState.value === 'copied') return t('preview.copied');
  if (copyState.value === 'error') return t('preview.copyFailed');
  return t('preview.copy');
});
const isCopying = computed(() => copyState.value === 'loading');
</script>

<template>
  <div class="preview">
    <div class="preview-head">
      <div>
        <div class="preview-kicker">{{ t('preview.kicker') }}</div>
        <div class="preview-title">{{ t('preview.title') }}</div>
      </div>
      <el-tag class="preview-tag" :type="form.builtUrl.value ? 'success' : 'info'" effect="plain">
        {{ form.builtUrl.value ? t('preview.ready') : t('preview.emptyState') }}
      </el-tag>
    </div>

    <code class="url-code" :class="{ empty: !form.builtUrl.value }">{{ form.builtUrl.value || '-' }}</code>

    <div class="preview-actions">
      <el-button type="primary" :icon="CopyDocument" :loading="isCopying" @click="copy(form.builtUrl.value)">
        {{ copyLabel }}
      </el-button>
      <el-button :icon="Upload" @click="importVisible = true">{{ t('form.importLink') }}</el-button>
    </div>

    <div id="qr-target" class="qr-wrap" :class="{ visible: !!qrDataUrl }">
      <img v-if="qrDataUrl" :src="qrDataUrl" :alt="t('preview.qr')" width="240" height="240" />
      <div v-else class="qr-empty">
        <el-icon><Download /></el-icon>
        <span>{{ t('preview.qrEmpty') }}</span>
      </div>
    </div>

    <PresetBar />
    <ImportDialog v-model="importVisible" />
  </div>
</template>

<style scoped>
.preview {
  padding: 22px;
  border: 1px solid var(--surface-border);
  border-radius: 24px;
  background: var(--surface-strong);
  box-shadow: var(--shadow-md);
}

.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.preview-kicker {
  color: var(--accent);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0;
}

.preview-title {
  margin-top: 4px;
  font-weight: 850;
  font-size: 1.2rem;
  line-height: 1.2;
}

.preview-tag {
  flex: 0 0 auto;
  border-radius: 999px;
}

.url-code {
  display: block;
  min-height: 132px;
  max-height: 240px;
  overflow: auto;
  padding: 14px;
  border: 1px solid var(--surface-border);
  border-radius: 16px;
  background: var(--code-bg);
  color: var(--text-primary);
  word-break: break-all;
  font-size: 0.82rem;
  line-height: 1.65;
}

.url-code.empty {
  color: var(--text-muted);
}

.preview-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.preview-actions :deep(.el-button) {
  min-height: 42px;
  margin-left: 0;
}

.qr-wrap {
  display: grid;
  place-items: center;
  min-height: 168px;
  margin: 18px 0;
  border: 1px dashed var(--surface-border);
  border-radius: 18px;
  background: var(--control-bg);
  text-align: center;
}

.qr-wrap.visible {
  border-style: solid;
  background: #fff;
}

.qr-wrap img {
  width: min(220px, 72vw);
  height: auto;
}

.qr-empty {
  display: grid;
  justify-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 700;
}

.qr-empty .el-icon {
  font-size: 1.4rem;
}

@media (max-width: 767px) {
  .preview {
    padding: 18px;
    border-radius: 20px;
  }

  .preview-head {
    align-items: stretch;
    flex-direction: column;
  }

  .preview-actions {
    grid-template-columns: 1fr;
  }
}
</style>

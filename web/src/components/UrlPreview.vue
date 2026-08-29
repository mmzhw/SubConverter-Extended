<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Clock, Close, CopyDocument, Download, MagicStick, Upload } from '@element-plus/icons-vue';
import QRCode from 'qrcode';
import { useCopy } from '../composables/useCopy';
import { GeneratedLink } from '../composables/useGeneratedLinks';
import { useGenerateSubscription } from '../composables/useGenerateSubscription';
import ImportDialog from './ImportDialog.vue';

const { t } = useI18n();
const { form, generated, generate } = useGenerateSubscription();
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

function loadGenerated(item: GeneratedLink) {
  form.applyGenerated(item.state, item.url);
}

function generatedTime(item: GeneratedLink) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(item.createdAt);
}
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
      <el-button type="primary" :icon="MagicStick" @click="generate">
        {{ t('preview.generate') }}
      </el-button>
      <el-button :icon="CopyDocument" :loading="isCopying" :disabled="!form.builtUrl.value" @click="copy(form.builtUrl.value)">
        {{ copyLabel }}
      </el-button>
      <el-button :icon="Upload" @click="importVisible = true">{{ t('form.importLink') }}</el-button>
    </div>

    <div class="generated-history">
      <div class="history-head">
        <span>
          <el-icon><Clock /></el-icon>
          {{ t('history.title') }}
        </span>
        <el-button v-if="generated.links.value.length" link :icon="Close" @click="generated.clear">
          {{ t('history.clear') }}
        </el-button>
      </div>
      <div v-if="!generated.links.value.length" class="history-empty">{{ t('history.empty') }}</div>
      <button
        v-for="item in generated.links.value"
        :key="item.id"
        class="history-row"
        type="button"
        @click="loadGenerated(item)"
      >
        <span class="history-title">{{ item.title }}</span>
        <span class="history-meta">
          <span>{{ item.target }}</span>
          <span>{{ generatedTime(item) }}</span>
        </span>
      </button>
    </div>

    <div id="qr-target" class="qr-wrap" :class="{ visible: !!qrDataUrl }">
      <img v-if="qrDataUrl" :src="qrDataUrl" :alt="t('preview.qr')" width="240" height="240" />
      <div v-else class="qr-empty">
        <el-icon><Download /></el-icon>
        <span>{{ t('preview.qrEmpty') }}</span>
      </div>
    </div>

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
  grid-template-columns: 1.15fr 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}

.preview-actions :deep(.el-button) {
  min-height: 42px;
  margin-left: 0;
}

.generated-history {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--surface-border);
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 850;
}

.history-head > span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.history-empty {
  padding: 10px 0 2px;
  color: var(--text-muted);
  font-size: 0.86rem;
  font-weight: 650;
}

.history-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 42px;
  padding: 8px 0;
  border: 0;
  border-bottom: 1px solid var(--surface-border-subtle);
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.history-row:hover .history-title,
.history-row:focus-visible .history-title {
  color: var(--accent);
}

.history-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.history-title {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 750;
  white-space: nowrap;
}

.qr-wrap {
  display: grid;
  place-items: center;
  min-height: 168px;
  margin: 16px 0 18px;
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

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Clock, Close, CopyDocument, Delete, Download, EditPen, Lock, MagicStick, Refresh, Upload } from '@element-plus/icons-vue';
import QRCode from 'qrcode';
import { ElMessage } from 'element-plus';
import { useCopy } from '../composables/useCopy';
import { GeneratedLink } from '../composables/useGeneratedLinks';
import { useGenerateSubscription } from '../composables/useGenerateSubscription';
import { useShortLink } from '../composables/useShortLink';
import { useShortLinksManager, type ServerShortLink } from '../composables/useShortLinksManager';
import { backendBaseForState } from '../lib/url-builder';
import { parseSubUrl } from '../lib/url-parser';
import ImportDialog from './ImportDialog.vue';

const { t } = useI18n();
const { form, generated, generate } = useGenerateSubscription();
const shortLink = useShortLink();
const { state: copyState, copy } = useCopy();
const qrDataUrl = ref('');
const importVisible = ref(false);
const managerTab = ref('history');
const editingShortLink = ref<ServerShortLink | null>(null);
const updatingShortLink = ref(false);
const serverShortLinkPassword = ref(localStorage.getItem('sce.shortLinkPassword') || '');
const serverBackendBase = computed(() => {
  try {
    return form.builtUrl.value ? new URL(form.builtUrl.value).origin : backendBaseForState(form.state);
  } catch {
    return backendBaseForState(form.state);
  }
});
const shortManager = useShortLinksManager(serverBackendBase, serverShortLinkPassword);

watch(
  () => form.builtUrl.value,
  async (url) => {
    shortLink.reset();
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

function loadServerShortLink(item: ServerShortLink) {
  try {
    form.applyParsed(parseSubUrl(item.url).state);
  } catch {
    copy(item.url);
  }
}

/**
 * Loads the short link's current parameters into the form and enters
 * edit mode. The user then edits with the normal controls, hits
 * Generate, and saves the result back onto the same code.
 */
function startEditShortLink(item: ServerShortLink) {
  loadServerShortLink(item);
  editingShortLink.value = item;
}

function cancelEditShortLink() {
  editingShortLink.value = null;
}

async function updateEditingShortLink() {
  const target = editingShortLink.value;
  const url = form.builtUrl.value;
  // builtUrl is empty until the form is generated, and it goes empty
  // again as soon as an option changes, so this also guards against
  // writing back a stale URL.
  if (!target || !url || updatingShortLink.value) return;
  updatingShortLink.value = true;
  try {
    const ok = await shortManager.update(
      target.code, url, form.state.subscriptionName,
    );
    if (!ok) {
      ElMessage.error(t('history.updateFailed'));
      return;
    }
    editingShortLink.value = null;
    ElMessage.success(t('history.updateSuccess'));
  } finally {
    updatingShortLink.value = false;
  }
}

async function removeServerShortLink(item: ServerShortLink) {
  const ok = await shortManager.remove(item.code);
  // Leaving edit mode pointing at a deleted link would let the next
  // "update" silently recreate nothing.
  if (ok && editingShortLink.value?.code === item.code) {
    editingShortLink.value = null;
  }
}

async function createShortLink() {
  const ok = await shortLink.create(form.builtUrl.value, form.state.subscriptionName);
  if (ok && managerTab.value === 'short-links') void shortManager.refresh();
}

function generatedTime(item: GeneratedLink) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(item.createdAt);
}

function shortLinkTime(value: number) {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(value);
}

watch(managerTab, (tab) => {
  if (tab === 'short-links') void shortManager.refresh();
});

watch(serverShortLinkPassword, (value) => {
  localStorage.setItem('sce.shortLinkPassword', value);
});
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
      <el-button :loading="shortLink.status.value === 'loading'" :disabled="!form.builtUrl.value" @click="createShortLink">
        {{ t('preview.shortLink') }}
      </el-button>
      <el-button :icon="Upload" @click="importVisible = true">{{ t('form.importLink') }}</el-button>
    </div>

    <div v-if="shortLink.url.value || shortLink.status.value === 'error'" class="short-link-box">
      <code v-if="shortLink.url.value" class="short-code">{{ shortLink.url.value }}</code>
      <span v-else class="short-error">{{ t('preview.shortLinkFailed') }}</span>
      <el-button v-if="shortLink.url.value" link :icon="CopyDocument" @click="copy(shortLink.url.value)">
        {{ t('preview.copyShortLink') }}
      </el-button>
    </div>

    <div id="qr-target" class="qr-wrap" :class="{ visible: !!qrDataUrl }">
      <img v-if="qrDataUrl" :src="qrDataUrl" :alt="t('preview.qr')" width="240" height="240" />
      <div v-else class="qr-empty">
        <el-icon><Download /></el-icon>
        <span>{{ t('preview.qrEmpty') }}</span>
      </div>
    </div>

    <div class="link-management">
      <el-tabs v-model="managerTab" class="management-tabs">
        <el-tab-pane :label="t('history.local')" name="history">
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
        </el-tab-pane>
        <el-tab-pane :label="t('history.serverShortLinks')" name="short-links">
          <div class="history-head">
            <span>
              <el-icon><Clock /></el-icon>
              {{ t('history.serverShortLinks') }}
            </span>
            <el-button link :icon="Refresh" :loading="shortManager.loading.value" @click="shortManager.refresh">
              {{ t('history.refresh') }}
            </el-button>
          </div>
          <div class="server-auth-row">
            <el-input
              v-model="serverShortLinkPassword"
              :prefix-icon="Lock"
              type="password"
              show-password
              clearable
              :placeholder="t('history.serverPasswordPlaceholder')"
              @keyup.enter="shortManager.refresh"
            />
          </div>
          <div v-if="shortManager.error.value" class="history-empty danger">
            {{ shortManager.error.value === 'unauthorized' ? t('history.serverUnauthorized') : t('history.serverLoadFailed') }}
          </div>
          <div v-else-if="!shortManager.items.value.length" class="history-empty">{{ t('history.serverEmpty') }}</div>
          <div v-if="editingShortLink" class="short-edit-banner">
            <div class="short-edit-info">
              <el-icon><EditPen /></el-icon>
              <span class="short-edit-title">{{ t('history.editing', { code: editingShortLink.code }) }}</span>
              <span class="short-edit-target">{{ editingShortLink.maskedShortUrl }}</span>
              <span class="short-edit-hint">
                {{ form.builtUrl.value ? t('history.editReady') : t('history.generateFirst') }}
              </span>
            </div>
            <div class="short-edit-actions">
              <el-button
                type="primary"
                size="small"
                :disabled="!form.builtUrl.value"
                :loading="updatingShortLink"
                @click="updateEditingShortLink"
              >
                {{ t('history.updateShortLink') }}
              </el-button>
              <el-button size="small" @click="cancelEditShortLink">{{ t('history.cancelEdit') }}</el-button>
            </div>
          </div>
          <div
            v-for="item in shortManager.items.value"
            :key="item.code"
            class="server-link-row"
            :class="{ 'is-editing': editingShortLink?.code === item.code }"
          >
            <button class="server-link-main" type="button" @click="loadServerShortLink(item)">
              <span class="history-title">{{ item.name || item.code }}</span>
              <span class="server-link-url">{{ item.maskedShortUrl }}</span>
              <span class="history-meta">
                <span>{{ t('history.createdAt') }} {{ shortLinkTime(item.createdAt) }}</span>
                <span>{{ t('history.lastAccessAt') }} {{ shortLinkTime(item.lastAccessAt) }}</span>
                <span v-if="item.updatedAt">{{ t('history.updatedAt') }} {{ shortLinkTime(item.updatedAt) }}</span>
              </span>
            </button>
            <div class="server-link-actions">
              <el-button link :icon="CopyDocument" @click="copy(item.shortUrl)">{{ t('preview.copyShortLink') }}</el-button>
              <el-button link :icon="EditPen" @click="startEditShortLink(item)">{{ t('history.edit') }}</el-button>
              <el-button link type="danger" :icon="Delete" @click="removeServerShortLink(item)">{{ t('history.delete') }}</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.preview-actions :deep(.el-button) {
  min-height: 42px;
  margin-left: 0;
  padding-inline: 12px;
  white-space: normal;
}

.preview-actions :deep(.el-button > span) {
  min-width: 0;
  justify-content: center;
  line-height: 1.2;
  text-align: center;
}

.short-link-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid var(--surface-border);
  border-radius: 12px;
  background: var(--control-bg);
}

.short-code {
  min-width: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.short-error {
  color: var(--danger);
  font-size: 0.84rem;
  font-weight: 700;
}

.link-management {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--surface-border);
}

.management-tabs :deep(.el-tabs__header) {
  margin: 0 0 10px;
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

.history-empty.danger {
  color: var(--danger);
}

.server-auth-row {
  margin-bottom: 10px;
}

.server-auth-row :deep(.el-input__wrapper) {
  min-height: 42px;
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

.server-link-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid var(--surface-border-subtle);
}

.server-link-main {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.server-link-main:hover .history-title,
.server-link-main:focus-visible .history-title {
  color: var(--accent);
}

.server-link-main:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.server-link-url {
  min-width: 0;
  overflow: hidden;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server-link-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.server-link-actions :deep(.el-button) {
  margin-left: 0;
}

.short-edit-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 10px 0;
  padding: 10px 12px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--control-bg);
}

.short-edit-info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.short-edit-info .el-icon {
  color: var(--accent);
}

.short-edit-title {
  font-weight: 750;
  font-size: 0.88rem;
  font-family: 'JetBrains Mono', monospace;
}

.short-edit-target {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.76rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.short-edit-hint {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.short-edit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.short-edit-actions :deep(.el-button) {
  margin-left: 0;
}

.server-link-row.is-editing {
  border-left: 2px solid var(--accent);
  padding-left: 8px;
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

  .short-link-box {
    grid-template-columns: 1fr;
  }
}
</style>

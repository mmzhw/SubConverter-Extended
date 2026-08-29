<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Delete, FolderOpened, Plus, RefreshRight } from '@element-plus/icons-vue';
import { loadPresets, savePreset, deletePreset, Preset, PresetsResult } from '../lib/presets';
import { useFormState } from '../composables/useFormState';

const { t } = useI18n();
const form = useFormState();
const initial = loadPresets();
const result = ref<PresetsResult>(initial);
const name = ref('');
const notice = ref(initial.ok ? '' : t('presets.storageUnavailable'));

function presets(): Preset[] { return result.value.ok ? result.value.presets : []; }
function save() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  const res = savePreset(trimmed, { ...form.state, options: { ...form.state.options } });
  if (res.ok) {
    result.value = res;
    notice.value = t('presets.saved');
    name.value = '';
  } else {
    notice.value = t('presets.storageUnavailable');
  }
}
function load(p: Preset) { form.applyParsed(p.state); }
function remove(nameToDelete: string) {
  const res = deletePreset(nameToDelete);
  if (res.ok) {
    result.value = res;
    notice.value = '';
  } else {
    notice.value = t('presets.storageUnavailable');
  }
}
</script>

<template>
  <div class="preset-bar">
    <div class="preset-head">
      <span>{{ t('presets.title') }}</span>
      <el-icon><FolderOpened /></el-icon>
    </div>

    <div v-if="!presets().length" class="preset-empty">{{ t('presets.empty') }}</div>
    <div v-for="p in presets()" :key="p.name" class="preset-row">
      <span class="preset-name">{{ p.name }}</span>
      <el-button size="small" :icon="RefreshRight" @click="load(p)">{{ t('presets.load') }}</el-button>
      <el-button size="small" :icon="Delete" @click="remove(p.name)">{{ t('presets.delete') }}</el-button>
    </div>

    <div class="preset-save">
      <el-input v-model="name" size="small" :placeholder="t('presets.savePrompt')" />
      <el-button size="small" type="primary" :icon="Plus" @click="save">{{ t('form.savePreset') }}</el-button>
    </div>

    <div v-if="notice" class="preset-notice" role="status">{{ notice }}</div>
  </div>
</template>

<style scoped>
.preset-bar {
  padding-top: 18px;
  border-top: 1px solid var(--surface-border);
}

.preset-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
  font-weight: 850;
  font-size: 1rem;
}

.preset-head .el-icon {
  color: var(--text-muted);
}

.preset-empty {
  padding: 12px 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 650;
}

.preset-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--surface-border-subtle);
}

.preset-name {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-save {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 12px;
}

.preset-save :deep(.el-button) {
  margin-left: 0;
}

.preset-notice {
  margin-top: 10px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 650;
}

@media (max-width: 420px) {
  .preset-row,
  .preset-save {
    grid-template-columns: 1fr;
  }
}
</style>

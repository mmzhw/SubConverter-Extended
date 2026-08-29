<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
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
  result.value = res;
  if (res.ok) {
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
    <div class="preset-head">{{ t('presets.title') }}</div>
    <div v-if="!presets().length" class="preset-empty">{{ t('presets.empty') }}</div>
    <div v-for="p in presets()" :key="p.name" class="preset-row">
      <span class="preset-name">{{ p.name }}</span>
      <el-button size="small" @click="load(p)">{{ t('presets.load') }}</el-button>
      <el-button size="small" @click="remove(p.name)">{{ t('presets.delete') }}</el-button>
    </div>
    <div class="preset-save">
      <el-input v-model="name" size="small" :placeholder="t('presets.savePrompt')" />
      <el-button size="small" type="primary" @click="save">{{ t('form.savePreset') }}</el-button>
    </div>
    <div v-if="notice" class="preset-notice" role="status">{{ notice }}</div>
  </div>
</template>

<style scoped>
.preset-head { font-weight: 700; font-size: 0.95rem; margin-bottom: 8px; }
.preset-empty { color: var(--text-secondary); font-size: 0.85rem; }
.preset-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.preset-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preset-save { display: flex; gap: 8px; margin-top: 10px; }
.preset-notice { margin-top: 8px; color: var(--text-secondary); font-size: 0.84rem; }
</style>

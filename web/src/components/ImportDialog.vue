<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { parseSubUrl } from '../lib/url-parser';
import { useFormState } from '../composables/useFormState';

const { t } = useI18n();
const form = useFormState();
const visible = defineModel<boolean>('visible', { default: false });
const input = ref('');
const error = ref('');
const errorEl = ref<HTMLElement | null>(null);
const kept = ref<Record<string, string>>({});

// 关闭对话框或输入变化时清空未知参数标签，避免上次成功导入的标签残留
watch(visible, (v) => {
  if (!v) kept.value = {};
});
watch(input, () => {
  kept.value = {};
});

function submit() {
  error.value = '';
  kept.value = {};
  try {
    const parsed = parseSubUrl(input.value);
    form.applyParsed(parsed.state);
    kept.value = parsed.unknown;
    input.value = '';
    visible.value = false;
  } catch {
    error.value = t('import.invalid');
    void nextTick(() => errorEl.value?.focus());
  }
}
</script>

<template>
  <el-dialog :model-value="visible" @update:model-value="(v: boolean) => (visible = v)"
             :title="t('import.title')" width="min(520px, 92vw)">
    <el-input v-model="input" type="textarea" :rows="3" :placeholder="t('import.placeholder')" />
    <div v-if="error" ref="errorEl" role="alert" tabindex="-1" class="import-error">{{ error }}</div>
    <div v-if="Object.keys(kept).length" class="import-kept">
      {{ t('import.unknownKept') }}：
      <el-tag v-for="(v, k) in kept" :key="k" size="small" class="kept-tag">{{ k }}={{ v }}</el-tag>
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" @click="submit">{{ t('common.confirm') }}</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.import-error { margin-top: 10px; color: var(--el-color-danger); font-size: 0.86rem; font-weight: 600; }
.import-kept { margin-top: 10px; font-size: 0.86rem; color: var(--text-secondary); }
.kept-tag { margin: 2px 4px 2px 0; font-family: 'JetBrains Mono', monospace; }
</style>

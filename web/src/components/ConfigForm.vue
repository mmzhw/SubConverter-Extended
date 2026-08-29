<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { TARGET_FORMATS, OPTION_DEFS, OptionDef } from '../config/options';
import { useFormState } from '../composables/useFormState';

const { t, locale } = useI18n();
const form = useFormState();
const openGroups = ref(['node']);

const groups = [
  { key: 'node', labelKey: 'form.groups.node' },
  { key: 'rule', labelKey: 'form.groups.rule' },
  { key: 'advanced', labelKey: 'form.groups.advanced' },
] as const;

function isZh() { return locale.value.startsWith('zh'); }
function labelOf(def: OptionDef) { return isZh() ? def.label.zh : def.label.en; }
function optionValue(key: string): string | number | boolean {
  const def = OPTION_DEFS.find((d) => d.key === key);
  const v = form.state.options[key];
  if (def?.type === 'boolean') return v === true;
  return v === undefined ? (def?.type === 'number' ? 0 : '') : v;
}
function setOption(key: string, value: string | number | boolean) {
  form.state.options[key] = value;
}
function defsOf(group: string) { return OPTION_DEFS.filter((d) => d.group === group); }
</script>

<template>
  <el-form label-position="top" @submit.prevent>
    <el-form-item :label="t('form.target')">
      <el-select :model-value="form.state.target" style="width: 100%"
                 @update:model-value="(v: string | number | boolean | object) => (form.state.target = String(v))">
        <el-option v-for="tgt in TARGET_FORMATS" :key="tgt.value" :value="tgt.value"
                   :label="isZh() ? tgt.label.zh : tgt.label.en" />
      </el-select>
    </el-form-item>
    <el-form-item :label="t('form.sourceUrl')" :error="form.sourceError ? t('form.sourceUrlInvalid') : ''">
      <el-input :model-value="form.state.sourceUrl" :placeholder="t('form.sourceUrlPlaceholder')"
                @update:model-value="(v: string) => (form.state.sourceUrl = v)"
                @blur="form.validateSource()" />
    </el-form-item>
    <el-collapse v-model="openGroups">
      <el-collapse-item v-for="g in groups" :key="g.key" :name="g.key" :title="t(g.labelKey)">
        <div v-for="def in defsOf(g.key)" :key="def.key" class="option-row">
          <span class="option-label">{{ labelOf(def) }}</span>
          <el-switch v-if="def.type === 'boolean'" :model-value="optionValue(def.key) === true"
                     @update:model-value="(v: boolean | string | number) => setOption(def.key, !!v)" />
          <el-select v-else-if="def.type === 'enum'" :model-value="String(optionValue(def.key))"
                     @update:model-value="(v: string) => setOption(def.key, v)" style="width: 200px">
            <el-option v-for="opt in def.enumValues" :key="opt.value" :value="opt.value"
                       :label="isZh() ? opt.label.zh : opt.label.en" />
          </el-select>
          <el-input v-else :model-value="String(optionValue(def.key))"
                    @update:model-value="(v: string) => setOption(def.key, v)" style="width: 200px" />
        </div>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>

<style scoped>
.option-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0; }
.option-label { flex: 1; color: var(--text-secondary); font-size: 0.9rem; font-weight: 600; }
</style>

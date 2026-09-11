<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Delete } from '@element-plus/icons-vue';
import {
  parseExtRulesetRows,
  serializeExtRulesetRows,
  type ExtRulesetRow,
} from '../lib/ext-rulesets';
import { useGroupNames } from '../composables/useGroupNames';
import { useFormState } from '../composables/useFormState';

const props = defineProps<{
  modelValue: string;
  configUrl: string;
  backendBase: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const { locale } = useI18n();
const form = useFormState();

const rows = ref<ExtRulesetRow[]>(parseExtRulesetRows(props.modelValue));
const { groups, loading, error, refresh } = useGroupNames(
  () => props.configUrl,
  props.backendBase,
  () => form.state.githubProxy,
  () => form.state.customGithubProxy,
);

watch(() => props.modelValue, (value) => {
  const parsed = parseExtRulesetRows(value);
  // A row only counts when BOTH fields are filled; the emitted value never
  // contains partial rows, so compare the external value against the current
  // complete rows. This avoids clobbering an in-progress edit when the
  // serialized forms agree (e.g. the echo of our own emit).
  const complete = rows.value.filter((row) => row.group.trim() && row.url.trim());
  if (serializeExtRulesetRows(parsed) !== serializeExtRulesetRows(complete)) {
    rows.value = parsed;
  }
});

watch(() => props.configUrl, () => refresh());
onMounted(refresh);

function isZh() { return locale.value.startsWith('zh'); }

function updateRows() {
  // A row only counts when BOTH fields are filled; partially filled rows
  // are dropped (matches backend parse behavior which ignores them).
  const complete = rows.value.filter((row) => row.group.trim() && row.url.trim());
  emit('update:modelValue', serializeExtRulesetRows(complete));
}

function updateGroup(row: ExtRulesetRow, value: string) {
  row.group = value;
  updateRows();
}

function updateUrl(row: ExtRulesetRow, value: string) {
  row.url = value;
  updateRows();
}

function addRow() {
  rows.value.push({ group: '', url: '' });
}

function removeRow(index: number) {
  if (rows.value.length > 1) {
    rows.value.splice(index, 1);
  } else {
    rows.value = [{ group: '', url: '' }];
  }
  updateRows();
}

const groupOptions = computed(() => {
  const seen = new Set<string>(groups.value);
  for (const row of rows.value) {
    if (row.group.trim() && !seen.has(row.group.trim())) seen.add(row.group.trim());
  }
  return [...seen].map((name) => ({ value: name, label: name }));
});

const hasConfig = computed(() => Boolean(props.configUrl.trim()));
const groupPlaceholder = computed(() => (hasConfig.value
  ? (isZh() ? '选择组名' : 'Select group')
  : (isZh() ? '组名' : 'Group name')));
</script>

<template>
  <div class="ext-rulesets-control">
    <div v-for="(row, index) in rows" :key="index" class="ext-rulesets-row">
      <el-select
        :model-value="row.group"
        filterable
        allow-create
        default-first-option
        :loading="loading"
        :placeholder="groupPlaceholder"
        class="ext-rulesets-group"
        @update:model-value="updateGroup(row, $event)"
      >
        <el-option v-for="opt in groupOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
      </el-select>
      <el-input
        :model-value="row.url"
        class="ext-rulesets-url"
        :placeholder="isZh() ? 'https://规则集地址.list' : 'https://ruleset.example.com/list'"
        clearable
        @update:model-value="updateUrl(row, $event)"
      />
      <el-button
        :icon="Delete"
        circle
        plain
        size="small"
        :aria-label="isZh() ? '删除规则' : 'Delete rule'"
        @click="removeRow(index)"
      />
    </div>
    <div class="ext-rulesets-meta">
      <el-button size="small" plain @click="addRow">{{ isZh() ? '＋ 添加规则' : '＋ Add rule' }}</el-button>
      <span v-if="error" class="ext-rulesets-hint">{{ isZh() ? '组名加载失败，可手动输入' : 'Failed to load group names, you can type manually' }}</span>
      <span v-else-if="!hasConfig" class="ext-rulesets-hint">{{ isZh() ? '选择远程配置后自动加载组名' : 'Group names load automatically after selecting a remote config' }}</span>
    </div>
  </div>
</template>

<style scoped>
.ext-rulesets-control { display: grid; gap: 8px; }
.ext-rulesets-row {
  display: grid;
  grid-template-columns: minmax(120px, 200px) 1fr auto;
  gap: 8px;
  align-items: center;
}
.ext-rulesets-meta { display: flex; align-items: center; gap: 10px; }
.ext-rulesets-hint { color: var(--el-text-color-secondary); font-size: 0.8rem; }
</style>

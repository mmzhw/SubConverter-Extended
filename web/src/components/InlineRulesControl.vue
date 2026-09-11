<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Delete, Document, List } from '@element-plus/icons-vue';
import {
  MATCH_TYPE_OPTIONS,
  descriptionForMatchType,
  exampleForMatchType,
  parseInlineRuleLines,
  parseInlineRuleRows,
  placeholderForMatchType,
  serializeInlineRuleLines,
  serializeInlineRuleRows,
  type InlineRuleRow,
} from '../lib/inline-rules';
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

const { t, locale } = useI18n();
const form = useFormState();

const rows = ref<InlineRuleRow[]>(parseInlineRuleRows(props.modelValue));
/**
 * 'rows' is the per-field editor, 'text' is the bulk editor. Both modes
 * share `rows`; the text editor parses its content into `rows` on every
 * edit, so half-filled rows behave identically in both modes.
 */
const mode = ref<'rows' | 'text'>('rows');
/** Raw textarea content. Kept as typed so unparsable lines are not lost
 *  while the user is fixing them. */
const textValue = ref('');
const invalidLines = ref(0);
const { groups, loading, error, refresh } = useGroupNames(
  () => props.configUrl,
  props.backendBase,
  () => form.state.githubProxy,
  () => form.state.customGithubProxy,
);

function syncTextFromRows() {
  textValue.value = serializeInlineRuleLines(rows.value);
  invalidLines.value = 0;
}

watch(() => props.modelValue, (value) => {
  const parsed = parseInlineRuleRows(value);
  // A row only counts when all three fields are filled; the emitted
  // value never contains partial rows. Compare against the current
  // complete rows to avoid clobbering an in-progress edit whose
  // serialized form agrees with the echo of our own emit.
  const complete = rows.value.filter(
    (row) => row.type.trim() && row.value.trim() && row.group.trim(),
  );
  if (serializeInlineRuleRows(parsed) !== serializeInlineRuleRows(complete)) {
    rows.value = parsed;
    // An external change (importing a link, loading a preset) must also
    // refresh the text editor when it is the active mode.
    if (mode.value === 'text') syncTextFromRows();
  }
});

watch(() => props.configUrl, () => refresh());
onMounted(refresh);

function isZh() { return locale.value.startsWith('zh'); }

function switchMode(next: 'rows' | 'text') {
  if (next === mode.value) return;
  if (next === 'text') {
    // Rows -> text: render the current rules for bulk editing. Unparsable
    // lines cannot exist yet, so the counter resets.
    syncTextFromRows();
  } else {
    // Text -> rows: keep only what parsed. Unparsable lines are dropped
    // here; the hint in text mode says so.
    rows.value = parseInlineRuleLines(textValue.value).rows;
    invalidLines.value = 0;
  }
  mode.value = next;
}

function onTextInput(value: string) {
  textValue.value = value;
  const parsed = parseInlineRuleLines(value);
  invalidLines.value = parsed.invalidLines;
  rows.value = parsed.rows;
  updateRows();
}

function updateRows() {
  // Only fully-filled rows survive serialization; partially-typed rows
  // are dropped (matches the backend parseInlineRules semantics).
  const complete = rows.value.filter(
    (row) => row.type.trim() && row.value.trim() && row.group.trim(),
  );
  emit('update:modelValue', serializeInlineRuleRows(complete));
}

function updateType(row: InlineRuleRow, value: string) {
  row.type = value;
  updateRows();
}

function updateValue(row: InlineRuleRow, value: string) {
  row.value = value;
  updateRows();
}

function updateGroup(row: InlineRuleRow, value: string) {
  row.group = value;
  updateRows();
}

function addRow() {
  rows.value.push({ type: '', value: '', group: '' });
}

function removeRow(index: number) {
  if (rows.value.length > 1) {
    rows.value.splice(index, 1);
  } else {
    rows.value = [{ type: '', value: '', group: '' }];
  }
  updateRows();
}

const groupOptions = computed(() => {
  const seen = new Set<string>(groups.value);
  for (const row of rows.value) {
    const trimmed = row.group.trim();
    if (trimmed && !seen.has(trimmed)) seen.add(trimmed);
  }
  return [...seen].map((name) => ({ value: name, label: name }));
});

const hasConfig = computed(() => Boolean(props.configUrl.trim()));
const groupPlaceholder = computed(() => (hasConfig.value
  ? (isZh() ? '选择组名' : 'Select group')
  : (isZh() ? '组名' : 'Group name')));
const typePlaceholder = computed(() => (isZh() ? '匹配模式' : 'Match type'));
const textPlaceholder = computed(() => (isZh()
  ? '每行一条规则，格式：匹配模式,值,组名\n例如：DOMAIN-SUFFIX,foo.com,Domestic\n以 # 开头的行会被忽略'
  : 'One rule per line: TYPE,value,Group\nFor example: DOMAIN-SUFFIX,foo.com,Domestic\nLines starting with # are ignored'));

function typeDescription(row: InlineRuleRow): string {
  const desc = descriptionForMatchType(row.type);
  return isZh() ? desc.zh : desc.en;
}
function typeExample(row: InlineRuleRow): string {
  return exampleForMatchType(row.type);
}
</script>

<template>
  <div class="inline-rules-control">
    <template v-if="mode === 'rows'">
      <div v-for="(row, index) in rows" :key="index" class="inline-rules-item">
        <div class="inline-rules-row">
          <el-select
            :model-value="row.type"
            filterable
            popper-class="inline-rules-type-popper"
            :placeholder="typePlaceholder"
            class="inline-rules-type"
            @update:model-value="updateType(row, $event)"
          >
            <el-option
              v-for="opt in MATCH_TYPE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            >
              <div class="inline-rules-option">
                <span class="inline-rules-option-label">{{ opt.label }}</span>
                <span class="inline-rules-option-desc">{{ isZh() ? opt.description.zh : opt.description.en }}</span>
                <span class="inline-rules-option-example">{{ opt.example }}</span>
              </div>
            </el-option>
          </el-select>
          <el-input
            :model-value="row.value"
            class="inline-rules-value"
            :placeholder="placeholderForMatchType(row.type) || (isZh() ? '值' : 'value')"
            clearable
            @update:model-value="updateValue(row, $event)"
          />
          <el-select
            :model-value="row.group"
            filterable
            allow-create
            default-first-option
            :loading="loading"
            :placeholder="groupPlaceholder"
            class="inline-rules-group"
            @update:model-value="updateGroup(row, $event)"
          >
            <el-option v-for="opt in groupOptions" :key="opt.value" :value="opt.value" :label="opt.label" />
          </el-select>
          <el-button
            :icon="Delete"
            circle
            plain
            size="small"
            :aria-label="isZh() ? '删除规则' : 'Delete rule'"
            @click="removeRow(index)"
          />
        </div>
        <div v-if="row.type" class="inline-rules-type-hint">
          <span class="inline-rules-type-hint-desc">{{ typeDescription(row) }}</span>
          <span v-if="typeExample(row)" class="inline-rules-type-hint-example">
            {{ isZh() ? '示例' : 'e.g.' }}: <code>{{ typeExample(row) }}</code>
          </span>
        </div>
      </div>
    </template>
    <template v-else>
      <el-input
        :model-value="textValue"
        class="inline-rules-text"
        type="textarea"
        :rows="8"
        resize="vertical"
        spellcheck="false"
        :placeholder="textPlaceholder"
        @update:model-value="onTextInput"
      />
      <span v-if="invalidLines > 0" class="inline-rules-hint inline-rules-hint-warn">
        {{ t('form.inlineRulesInvalidLines', { count: invalidLines }) }}
      </span>
    </template>
    <div class="inline-rules-meta">
      <el-button v-if="mode === 'rows'" size="small" plain @click="addRow">{{ isZh() ? '＋ 添加规则' : '＋ Add rule' }}</el-button>
      <span v-if="error" class="inline-rules-hint">{{ isZh() ? '组名加载失败，可手动输入' : 'Failed to load group names, you can type manually' }}</span>
      <span v-else-if="!hasConfig" class="inline-rules-hint">{{ isZh() ? '选择远程配置后自动加载组名' : 'Group names load automatically after selecting a remote config' }}</span>
      <el-button
        class="inline-rules-mode-toggle"
        link
        size="small"
        :icon="mode === 'rows' ? Document : List"
        @click="switchMode(mode === 'rows' ? 'text' : 'rows')"
      >
        {{ mode === 'rows' ? t('form.inlineRulesToText') : t('form.inlineRulesToRows') }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.inline-rules-control { display: grid; gap: 10px; }
.inline-rules-item { display: grid; gap: 4px; }
.inline-rules-row {
  display: grid;
  grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(120px, 180px) auto;
  gap: 8px;
  align-items: center;
}
.inline-rules-type-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0 4px;
  color: var(--el-text-color-secondary);
  font-size: 0.78rem;
  line-height: 1.45;
}
.inline-rules-type-hint-desc { flex: 1 1 auto; min-width: 0; }
.inline-rules-type-hint-example {
  flex: 0 0 auto;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.74rem;
  color: var(--el-text-color-regular);
}
.inline-rules-type-hint-example code {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--el-fill-color-light);
}
.inline-rules-meta { display: flex; align-items: center; gap: 10px; }
.inline-rules-hint { color: var(--el-text-color-secondary); font-size: 0.8rem; }
.inline-rules-hint-warn { color: var(--el-color-warning); }
/* Pushes the mode toggle to the trailing edge of the meta row. */
.inline-rules-mode-toggle { margin-left: auto; }
.inline-rules-text :deep(.el-textarea__inner) {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.82rem;
  line-height: 1.5;
}
</style>

<style>
/* el-select option content; cannot be scoped because the option body
   renders inside a teleported popper. The popper-class on the type
   <el-select> scopes every rule below to this control so nothing leaks
   into other selects. */
.inline-rules-type-popper .el-select-dropdown__item {
  /* Element Plus pins option rows to 34px with nowrap + ellipsis,
     which clips the three-line label/description/example block down
     to just the type name. Let it grow instead. */
  height: auto;
  line-height: 1.4;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  padding-top: 6px;
  padding-bottom: 6px;
}
.inline-rules-type-popper {
  /* Give the descriptions room to breathe. */
  min-width: 320px;
}
.inline-rules-type-popper .inline-rules-option {
  display: grid;
  gap: 2px;
}
.inline-rules-type-popper .inline-rules-option-label {
  font-weight: 600;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.86rem;
}
.inline-rules-type-popper .inline-rules-option-desc {
  color: var(--el-text-color-regular);
  font-size: 0.78rem;
  line-height: 1.4;
}
.inline-rules-type-popper .inline-rules-option-example {
  color: var(--el-text-color-secondary);
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.74rem;
}
</style>

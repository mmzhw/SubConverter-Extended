<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Connection, EditPen, Finished, MagicStick, QuestionFilled, RefreshRight } from '@element-plus/icons-vue';
import { TARGET_FORMATS, OPTION_DEFS, OptionDef } from '../config/options';
import { useFormState } from '../composables/useFormState';
import ExtraRulesetsControl from './ExtraRulesetsControl.vue';
import InlineRulesControl from './InlineRulesControl.vue';
import {
  applyGitHubProxy,
  GITHUB_PROXY_CUSTOM,
  GITHUB_PROXY_PRESETS,
  githubProxyPrefixFor,
  isGitHubConfigUrl,
} from '../lib/github-proxy';
import { backendBaseForState } from '../lib/url-builder';
import { measurePreferredProxyLatency, ProxyLatency, ProxyLatencySource } from '../lib/github-proxy-latency';
import { loadDnsTemplate, saveDnsTemplate } from '../lib/dns-template';

const { t, locale } = useI18n();
const form = useFormState();
const openGroups = ref(['node', 'rule', 'advanced']);
const tagDelimiter = /[|,，\s]+/;
const latencyTimeoutMs = 6000;
const intervalUnit = ref<IntervalUnit>('day');
const dnsTemplateDialogVisible = ref(false);
const dnsTemplateContent = ref('');
const dnsTemplateLoading = ref(false);
const dnsTemplateSaving = ref(false);

type IntervalUnit = 'day' | 'hour' | 'minute' | 'second';

const groups = [
  { key: 'node', labelKey: 'form.groups.node', icon: Connection },
  { key: 'rule', labelKey: 'form.groups.rule', icon: Finished },
  { key: 'advanced', labelKey: 'form.groups.advanced', icon: MagicStick },
] as const;

const targetOptions = computed(() => TARGET_FORMATS.map((tgt) => ({
  value: tgt.value,
  label: isZh() ? tgt.label.zh : tgt.label.en,
})));
const sourceErrorMessage = computed(() => {
  const code = form.sourceError.value;
  if (!code) return '';
  if (code === 'comma') return t('form.sourceUrlCommaSeparated');
  const line = code.startsWith('invalid:') ? code.slice('invalid:'.length) : '';
  return line ? t('form.sourceUrlInvalidLine', { line }) : t('form.sourceUrlInvalid');
});
const selectedConfigUrl = computed(() => String(optionValue('config') || ''));
const configUsesGitHub = computed(() => isGitHubConfigUrl(selectedConfigUrl.value));
const proxyLatencies = ref<Record<string, ProxyLatency>>({});
const isTestingProxyLatency = ref(false);
const githubProxyOptions = computed(() => GITHUB_PROXY_PRESETS.map((proxy) => ({
  ...proxy,
  displayLabel: `${isZh() ? proxy.label.zh : proxy.label.en}${latencyText(proxy.value)}`,
})));
const githubProxyHelp = computed(() => (isZh()
  ? '作用于远程配置 config= 的 GitHub 地址，并会继承到该配置内的 GitHub 规则集和基础模板地址；不影响订阅源 url=。'
  : 'Applies to GitHub URLs in config= and is inherited by GitHub rulesets and base templates inside that config. The subscription source url= is unchanged.'));
const customGithubProxyPlaceholder = computed(() => (isZh()
  ? '例如 https://example.com/，也支持 https://example.com/{url}'
  : 'For example https://example.com/, or https://example.com/{url}'));
const testProxyText = computed(() => (isZh() ? '测速' : 'Test'));
const intervalDef = computed(() => OPTION_DEFS.find((def) => def.key === 'interval'));
const intervalUnitOptions = computed(() => [
  { value: 'day', label: isZh() ? '天' : 'day' },
  { value: 'hour', label: isZh() ? '时' : 'hour' },
  { value: 'minute', label: isZh() ? '分' : 'minute' },
  { value: 'second', label: isZh() ? '秒' : 'second' },
]);
const intervalValue = computed(() => {
  const value = optionValue('interval');
  if (typeof value !== 'number') return undefined;
  return value / intervalMultiplier(intervalUnit.value);
});
const dnsTemplateButtonText = computed(() => (
  form.state.dnsTemplateId ? t('dnsTemplate.edit') : t('dnsTemplate.configure')
));

function isZh() { return locale.value.startsWith('zh'); }
function labelOf(def: OptionDef) { return isZh() ? def.label.zh : def.label.en; }
function descriptionOf(def: OptionDef) { return isZh() ? def.description.zh : def.description.en; }
function placeholderOf(def: OptionDef) {
  return def.placeholder ? (isZh() ? def.placeholder.zh : def.placeholder.en) : '';
}
function optionValue(key: string): string | number | boolean | undefined {
  const def = OPTION_DEFS.find((d) => d.key === key);
  const v = form.state.options[key];
  if (def?.type === 'boolean') return v === undefined ? def.defaultValue === true : v === true;
  if (def?.type === 'number') {
    if (v === undefined || v === '') return undefined;
    const next = Number(v);
    return Number.isFinite(next) ? next : undefined;
  }
  return v === undefined ? '' : v;
}
function setOption(key: string, value: string | number | boolean | undefined) {
  form.state.options[key] = value;
}
function proxyLatencyKey(value: string) {
  return value === GITHUB_PROXY_CUSTOM ? `${value}:${form.state.customGithubProxy || ''}` : value;
}
function latencyText(value: string) {
  const latency = proxyLatencies.value[proxyLatencyKey(value)];
  if (!latency || latency.status === 'idle') return '';
  const source = latency.source || 'server';
  const sourceLabel = latencySourceLabel(source);
  if (latency.status === 'testing') return isZh() ? ' · 测速中' : ' · testing';
  if (latency.status === 'ok') return ` · ${sourceLabel} ${latency.ms}ms`;
  if (latency.status === 'timeout') return isZh() ? ` · ${sourceLabel} 超时` : ` · ${sourceLabel} timeout`;
  return isZh() ? ` · ${sourceLabel} 失败` : ` · ${sourceLabel} failed`;
}
function latencySourceLabel(source: ProxyLatencySource) {
  if (source === 'server') return isZh() ? '服务端' : 'server';
  return isZh() ? '浏览器' : 'browser';
}
function proxyOptionClass(value: string) {
  return proxyLatencies.value[proxyLatencyKey(value)]?.status || 'idle';
}
function proxiedConfigUrl(value: string) {
  const prefix = githubProxyPrefixFor(value, form.state.customGithubProxy);
  return applyGitHubProxy(selectedConfigUrl.value, prefix);
}
async function testGithubProxyLatency() {
  if (!configUsesGitHub.value || isTestingProxyLatency.value) return;
  const candidates = GITHUB_PROXY_PRESETS.filter((proxy) => (
    proxy.value !== GITHUB_PROXY_CUSTOM || !!form.state.customGithubProxy?.trim()
  ));
  isTestingProxyLatency.value = true;
  proxyLatencies.value = {
    ...proxyLatencies.value,
    ...Object.fromEntries(candidates.map((proxy) => [proxyLatencyKey(proxy.value), { status: 'testing' as const }])),
  };
  await Promise.all(candidates.map(async (proxy) => {
    const key = proxyLatencyKey(proxy.value);
    const result = await measurePreferredProxyLatency({
      backendBase: backendBaseForState(form.state),
      url: proxiedConfigUrl(proxy.value),
      timeoutMs: latencyTimeoutMs,
    });
    proxyLatencies.value = { ...proxyLatencies.value, [key]: result };
  }));
  isTestingProxyLatency.value = false;
  ElMessage.success(isZh() ? 'GitHub 加速测速完成' : 'GitHub proxy test complete');
}
async function openDnsTemplateDialog() {
  setOption('clash.dns', true);
  dnsTemplateDialogVisible.value = true;
  dnsTemplateLoading.value = true;
  try {
    const loaded = await loadDnsTemplate(backendBaseForState(form.state), form.state.dnsTemplateId || '');
    dnsTemplateContent.value = loaded.content;
  } catch {
    dnsTemplateContent.value = '';
    ElMessage.error(t('dnsTemplate.loadFailed'));
  } finally {
    dnsTemplateLoading.value = false;
  }
}
async function resetDnsTemplateDialog() {
  dnsTemplateLoading.value = true;
  try {
    const loaded = await loadDnsTemplate(backendBaseForState(form.state));
    dnsTemplateContent.value = loaded.content;
  } catch {
    ElMessage.error(t('dnsTemplate.loadFailed'));
  } finally {
    dnsTemplateLoading.value = false;
  }
}
async function saveDnsTemplateDialog() {
  dnsTemplateSaving.value = true;
  try {
    const saved = await saveDnsTemplate(backendBaseForState(form.state), dnsTemplateContent.value);
    form.state.dnsTemplateId = saved.id || '';
    dnsTemplateContent.value = saved.content;
    dnsTemplateDialogVisible.value = false;
    ElMessage.success(t('dnsTemplate.saved'));
  } catch {
    ElMessage.error(t('dnsTemplate.saveFailed'));
  } finally {
    dnsTemplateSaving.value = false;
  }
}
function isOptionVisible(def: OptionDef) {
  if (def.key === 'provider' || def.key === 'clash.dns') {
    return form.state.target === 'clash' || form.state.target === 'clashr';
  }
  return true;
}
function defsOf(group: string) {
  return OPTION_DEFS.filter((d) => d.group === group && d.key !== 'interval' && isOptionVisible(d));
}
function isTagInput(def: OptionDef) { return def.key === 'include' || def.key === 'exclude'; }
function regexTags(key: string): string[] {
  const value = optionValue(key);
  if (typeof value !== 'string' || !value) return [];
  return value.split('|').map((item) => item.trim()).filter(Boolean);
}
function setRegexTags(key: string, values?: string[]) {
  const next = [...new Set((values || []).map((item) => item.trim()).filter(Boolean))];
  setOption(key, next.join('|'));
}
function numberValue(def: OptionDef): number | undefined {
  const value = optionValue(def.key);
  if (typeof value !== 'number') return undefined;
  return value;
}
function setNumberOption(def: OptionDef, value?: number) {
  if (value === undefined) {
    setOption(def.key, undefined);
    return;
  }
  setOption(def.key, value);
}
function intervalMultiplier(unit: IntervalUnit) {
  if (unit === 'day') return 86400;
  if (unit === 'hour') return 3600;
  if (unit === 'minute') return 60;
  return 1;
}
function setIntervalValue(value?: number) {
  if (value === undefined || value === null) {
    setOption('interval', undefined);
    return;
  }
  setOption('interval', Math.round(value * intervalMultiplier(intervalUnit.value)));
}
function setIntervalUnit(value: string | number | boolean) {
  if (value === 'day' || value === 'hour' || value === 'minute' || value === 'second') {
    intervalUnit.value = value;
  }
}
function updateSourceUrl(value: string) {
  form.state.sourceUrl = value;
  if (!value || form.sourceError.value) form.validateSource();
}
</script>

<template>
  <el-form class="config-form" label-position="top" @submit.prevent>
    <section class="config-section primary-section">
      <div class="section-head">
        <div>
          <div class="section-kicker">{{ t('form.target') }}</div>
          <h2>{{ t('form.primaryTitle') }}</h2>
        </div>
      </div>

      <el-select
        class="target-control"
        :model-value="form.state.target"
        filterable
        size="large"
        @update:model-value="(v: string | number | boolean) => (form.state.target = String(v))"
      >
        <el-option v-for="option in targetOptions" :key="option.value" :value="option.value" :label="option.label" />
      </el-select>

      <el-form-item class="source-field" :error="sourceErrorMessage">
        <template #label>
          <span class="field-label">
            <span>{{ t('form.sourceUrl') }}</span>
            <el-tooltip :content="t('form.sourceUrlHelp')" placement="top-start" popper-class="option-tooltip">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input
          :model-value="form.state.sourceUrl"
          :placeholder="t('form.sourceUrlPlaceholder')"
          type="textarea"
          :rows="3"
          resize="vertical"
          spellcheck="false"
          class="source-textarea"
          @update:model-value="updateSourceUrl"
          @blur="form.validateSource()"
        />
      </el-form-item>

      <el-form-item class="subscription-name-field">
        <template #label>
          <span class="field-label">
            <span>{{ t('form.subscriptionName') }}</span>
            <el-tooltip :content="t('form.subscriptionNameHelp')" placement="top-start" popper-class="option-tooltip">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <el-input
          :model-value="form.state.subscriptionName"
          :placeholder="t('form.subscriptionNamePlaceholder')"
          size="large"
          clearable
          @update:model-value="(v: string) => (form.state.subscriptionName = v)"
        />
      </el-form-item>

      <el-form-item v-if="intervalDef" class="subscription-interval-field">
        <template #label>
          <span class="field-label">
            <span>{{ labelOf(intervalDef) }}</span>
            <el-tooltip :content="descriptionOf(intervalDef)" placement="top-start" popper-class="option-tooltip">
              <el-icon class="help-icon"><QuestionFilled /></el-icon>
            </el-tooltip>
          </span>
        </template>
        <div class="interval-control">
          <el-input-number
            :model-value="intervalValue"
            :placeholder="placeholderOf(intervalDef)"
            :min="intervalDef.min"
            :step="intervalDef.step || 1"
            :precision="3"
            controls-position="right"
            size="large"
            @update:model-value="setIntervalValue"
          />
          <el-select
            class="interval-unit-select"
            :model-value="intervalUnit"
            size="large"
            @update:model-value="setIntervalUnit"
          >
            <el-option
              v-for="unit in intervalUnitOptions"
              :key="unit.value"
              :value="unit.value"
              :label="unit.label"
            />
          </el-select>
        </div>
      </el-form-item>
    </section>

    <el-collapse v-model="openGroups" class="option-groups">
      <el-collapse-item v-for="g in groups" :key="g.key" :name="g.key">
        <template #title>
          <div class="collapse-title">
            <el-icon><component :is="g.icon" /></el-icon>
            <span>{{ t(g.labelKey) }}</span>
          </div>
        </template>

        <div class="group-body">
          <div v-if="g.key === 'advanced'" class="option-row backend-row">
            <span class="option-label">
              <span>{{ t('form.backendBase') }}</span>
              <el-tooltip :content="t('form.backendBaseHelp')" placement="top-start" popper-class="option-tooltip">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <el-input
              :model-value="form.state.backendBase"
              :placeholder="t('form.backendBasePlaceholder')"
              clearable
              @update:model-value="(v: string) => (form.state.backendBase = v)"
            />
          </div>
          <div
            v-for="def in defsOf(g.key)"
            :key="def.key"
            class="option-row"
            :class="{ 'boolean-option-row': def.type === 'boolean' }"
          >
            <span class="option-label">
              <span>{{ labelOf(def) }}</span>
              <el-tooltip :content="descriptionOf(def)" placement="top-start" popper-class="option-tooltip">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
            <div
              v-if="def.type === 'boolean'"
              class="switch-control"
              :class="{ 'dns-template-actions': def.key === 'clash.dns' }"
            >
              <el-switch
                :model-value="optionValue(def.key) === true"
                @update:model-value="(v: boolean | string | number) => setOption(def.key, !!v)"
              />
              <template v-if="def.key === 'clash.dns'">
                <el-button
                  size="small"
                  :icon="EditPen"
                  :disabled="optionValue(def.key) !== true"
                  @click="openDnsTemplateDialog"
                >
                  {{ dnsTemplateButtonText }}
                </el-button>
                <el-tag v-if="form.state.dnsTemplateId" size="small" effect="plain">ID {{ form.state.dnsTemplateId }}</el-tag>
              </template>
            </div>
            <el-select
              v-else-if="def.type === 'enum' && def.key !== 'config'"
              :model-value="String(optionValue(def.key))"
              :placeholder="placeholderOf(def)"
              filterable
              clearable
              :allow-create="def.allowCustom === true"
              default-first-option
              @update:model-value="(v: string) => setOption(def.key, v)"
            >
              <el-option v-for="opt in def.enumValues" :key="opt.value" :value="opt.value"
                         :label="isZh() ? opt.label.zh : opt.label.en" />
            </el-select>
            <div v-else-if="def.key === 'config'" class="remote-config-control">
              <el-select
                :model-value="String(optionValue(def.key))"
                :placeholder="placeholderOf(def)"
                filterable
                clearable
                :allow-create="def.allowCustom === true"
                default-first-option
                @update:model-value="(v: string) => setOption(def.key, v)"
              >
                <el-option v-for="opt in def.enumValues" :key="opt.value" :value="opt.value"
                           :label="isZh() ? opt.label.zh : opt.label.en" />
              </el-select>
              <div v-if="configUsesGitHub" class="github-proxy-row">
                <span class="proxy-label">
                  <span>GitHub Proxy</span>
                  <el-tooltip :content="githubProxyHelp" placement="top-start" popper-class="option-tooltip">
                    <el-icon class="help-icon"><QuestionFilled /></el-icon>
                  </el-tooltip>
                </span>
                <div class="proxy-controls">
                  <el-select
                    :model-value="form.state.githubProxy || ''"
                    filterable
                    @update:model-value="(v: string) => (form.state.githubProxy = v)"
                  >
                    <el-option
                      v-for="proxy in githubProxyOptions"
                      :key="proxy.value"
                      :value="proxy.value"
                      :label="proxy.displayLabel"
                    >
                      <span class="proxy-option">
                        <span>{{ isZh() ? proxy.label.zh : proxy.label.en }}</span>
                        <span class="proxy-latency" :class="proxyOptionClass(proxy.value)">
                          {{ latencyText(proxy.value).replace(/^ · /, '') }}
                        </span>
                      </span>
                    </el-option>
                  </el-select>
                  <el-button
                    :icon="RefreshRight"
                    :loading="isTestingProxyLatency"
                    @click="testGithubProxyLatency"
                  >
                    {{ testProxyText }}
                  </el-button>
                </div>
                <el-input
                  v-if="form.state.githubProxy === GITHUB_PROXY_CUSTOM"
                  :model-value="form.state.customGithubProxy || ''"
                  :placeholder="customGithubProxyPlaceholder"
                  clearable
                  @update:model-value="(v: string) => (form.state.customGithubProxy = v)"
                />
              </div>
            </div>
            <el-input-tag
              v-else-if="isTagInput(def)"
              :model-value="regexTags(def.key)"
              :placeholder="placeholderOf(def)"
              :delimiter="tagDelimiter"
              clearable
              tag-type="info"
              @update:model-value="(v?: string[]) => setRegexTags(def.key, v)"
            />
            <ExtraRulesetsControl
              v-else-if="def.type === 'string' && def.key === 'ext_ruleset'"
              :model-value="String(optionValue(def.key))"
              :config-url="String(optionValue('config') ?? '')"
              :backend-base="form.state.backendBase"
              @update:model-value="(v: string) => setOption(def.key, v)"
            />
            <InlineRulesControl
              v-else-if="def.type === 'string' && def.key === 'inline_rules'"
              :model-value="String(optionValue(def.key))"
              :config-url="String(optionValue('config') ?? '')"
              :backend-base="form.state.backendBase"
              @update:model-value="(v: string) => setOption(def.key, v)"
            />
            <el-input
              v-else-if="def.type === 'string'"
              :type="def.multiline ? 'textarea' : 'text'"
              :rows="def.multiline ? 5 : undefined"
              :model-value="String(optionValue(def.key))"
              :placeholder="placeholderOf(def)"
              clearable
              @update:model-value="(v: string) => setOption(def.key, v)"
            />
            <div v-else class="number-control">
              <el-input-number
                :model-value="numberValue(def)"
                :placeholder="placeholderOf(def)"
                :min="def.min"
                :step="def.step || 1"
                controls-position="right"
                @update:model-value="(v: number | undefined) => setNumberOption(def, v)"
              />
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <el-dialog
      v-model="dnsTemplateDialogVisible"
      class="dns-template-dialog"
      :title="t('dnsTemplate.title')"
      width="min(720px, calc(100vw - 32px))"
      append-to-body
    >
      <el-input
        v-model="dnsTemplateContent"
        class="dns-template-editor"
        type="textarea"
        :rows="16"
        :disabled="dnsTemplateLoading"
        resize="vertical"
        spellcheck="false"
      />
      <template #footer>
        <div class="dialog-footer">
          <el-button :loading="dnsTemplateLoading" @click="resetDnsTemplateDialog">
            {{ t('dnsTemplate.reset') }}
          </el-button>
          <el-button @click="dnsTemplateDialogVisible = false">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" :loading="dnsTemplateSaving" @click="saveDnsTemplateDialog">
            {{ t('dnsTemplate.save') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-form>
</template>

<style scoped>
.config-form {
  display: grid;
  gap: 18px;
}

.config-section,
.option-groups {
  border: 1px solid var(--surface-border);
  border-radius: 24px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.config-section {
  padding: 22px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.section-kicker {
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
}

h2 {
  margin: 4px 0 0;
  font-size: 1.35rem;
  line-height: 1.2;
  letter-spacing: 0;
}

.target-control {
  width: 100%;
  margin-bottom: 20px;
}

.source-field,
.subscription-name-field,
.subscription-interval-field {
  margin-bottom: 0;
}

.source-field,
.subscription-name-field {
  margin-bottom: 14px;
}

.interval-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px;
  gap: 10px;
}

.interval-control :deep(.el-input-number) {
  width: 100%;
}

.option-groups {
  overflow: hidden;
}

.option-groups :deep(.el-collapse) {
  border: 0;
}

.option-groups :deep(.el-collapse-item__header) {
  height: 58px;
  padding: 0 20px;
  border-bottom-color: var(--surface-border);
  background: transparent;
  font-weight: 800;
}

.option-groups :deep(.el-collapse-item__wrap) {
  border-bottom-color: var(--surface-border);
  background: transparent;
}

.option-groups :deep(.el-collapse-item:last-child .el-collapse-item__wrap),
.option-groups :deep(.el-collapse-item:last-child .el-collapse-item__header) {
  border-bottom: 0;
}

.collapse-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: var(--text-primary);
}

.collapse-title .el-icon {
  color: var(--accent);
}

.group-body {
  padding: 2px 20px 8px;
}

.option-row {
  display: grid;
  grid-template-columns: minmax(112px, 150px) minmax(0, 1fr);
  align-items: start;
  gap: 16px;
  min-height: 44px;
  padding: 8px 0;
  border-bottom: 1px solid var(--surface-border-subtle);
}

.option-row:last-child {
  border-bottom: 0;
}

.option-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding-top: 6px;
  color: var(--text-secondary);
  font-size: 0.92rem;
  font-weight: 700;
}

.field-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-weight: 700;
}

.help-icon {
  flex: 0 0 auto;
  color: var(--text-muted);
  cursor: help;
  font-size: 0.95rem;
}

.help-icon:hover {
  color: var(--accent);
}

.option-label > span:first-child {
  min-width: 0;
}

.option-row :deep(.el-input),
.option-row :deep(.el-select),
.option-row :deep(.el-input-number),
.option-row :deep(.el-input-tag) {
  width: 100%;
  max-width: 100%;
}

.switch-control {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-self: end;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.option-row :deep(.el-switch) {
  justify-self: end;
}

.dns-template-actions {
  width: 100%;
}

.remote-config-control {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.github-proxy-row {
  display: grid;
  grid-template-columns: minmax(104px, 128px) minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--surface-border-subtle);
  border-radius: 8px;
  background: var(--control-bg);
}

.proxy-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 750;
}

.proxy-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  min-width: 0;
}

.github-proxy-row > :deep(.el-input) {
  grid-column: 2;
}

.proxy-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.proxy-latency {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 750;
}

.proxy-latency.ok {
  color: var(--accent-2);
}

.proxy-latency.timeout,
.proxy-latency.error {
  color: var(--danger);
}

.number-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.dns-template-editor :deep(textarea) {
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 0.84rem;
  line-height: 1.55;
}

.dialog-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-footer :deep(.el-button) {
  margin-left: 0;
}

@media (max-width: 767px) {
  .config-section {
    padding: 18px;
    border-radius: 20px;
  }

  .option-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px 0;
  }

  .boolean-option-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
  }

  .boolean-option-row .option-label {
    padding-top: 0;
  }

  .switch-control,
  .option-row :deep(.el-switch) {
    justify-self: end;
  }

  .interval-control {
    grid-template-columns: minmax(0, 1fr) 82px;
  }

  .github-proxy-row {
    grid-template-columns: 1fr;
  }

  .github-proxy-row > :deep(.el-input) {
    grid-column: auto;
  }
}

:global(.option-tooltip) {
  max-width: min(360px, calc(100vw - 32px));
  line-height: 1.55;
}
</style>

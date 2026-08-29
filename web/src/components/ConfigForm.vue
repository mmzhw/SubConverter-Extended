<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { Connection, Finished, MagicStick, QuestionFilled, RefreshRight } from '@element-plus/icons-vue';
import { TARGET_FORMATS, OPTION_DEFS, OptionDef } from '../config/options';
import { useFormState } from '../composables/useFormState';
import {
  applyGitHubProxy,
  GITHUB_PROXY_CUSTOM,
  GITHUB_PROXY_PRESETS,
  githubProxyPrefixFor,
  isGitHubConfigUrl,
} from '../lib/github-proxy';

const { t, locale } = useI18n();
const form = useFormState();
const openGroups = ref(['node', 'rule', 'advanced']);
const tagDelimiter = /[|,，\s]+/;
const secondsPerDay = 86400;
const latencyTimeoutMs = 6000;

type ProxyLatency = { status: 'idle' | 'testing' | 'ok' | 'timeout' | 'error'; ms?: number };

const groups = [
  { key: 'node', labelKey: 'form.groups.node', icon: Connection },
  { key: 'rule', labelKey: 'form.groups.rule', icon: Finished },
  { key: 'advanced', labelKey: 'form.groups.advanced', icon: MagicStick },
] as const;

const targetOptions = computed(() => TARGET_FORMATS.map((tgt) => ({
  value: tgt.value,
  label: isZh() ? tgt.label.zh : tgt.label.en,
})));
const sourceErrorMessage = computed(() => (form.sourceError.value ? t('form.sourceUrlInvalid') : ''));
const selectedConfigUrl = computed(() => String(optionValue('config') || ''));
const configUsesGitHub = computed(() => isGitHubConfigUrl(selectedConfigUrl.value));
const proxyLatencies = ref<Record<string, ProxyLatency>>({});
const isTestingProxyLatency = ref(false);
const githubProxyOptions = computed(() => GITHUB_PROXY_PRESETS.map((proxy) => ({
  ...proxy,
  displayLabel: `${isZh() ? proxy.label.zh : proxy.label.en}${latencyText(proxy.value)}`,
})));
const githubProxyHelp = computed(() => (isZh()
  ? '仅作用于远程配置 config= 的 GitHub 地址。选择代理后，后端拉取规则模板时会请求代理后的地址；不影响订阅源 url=。'
  : 'Only applies to GitHub URLs in config=. The backend will fetch the proxied config URL; the subscription source url= is unchanged.'));
const customGithubProxyPlaceholder = computed(() => (isZh()
  ? '例如 https://example.com/，也支持 https://example.com/{url}'
  : 'For example https://example.com/, or https://example.com/{url}'));
const testProxyText = computed(() => (isZh() ? '测速' : 'Test'));

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
  if (latency.status === 'testing') return isZh() ? ' · 测速中' : ' · testing';
  if (latency.status === 'ok') return ` · ${latency.ms}ms`;
  if (latency.status === 'timeout') return isZh() ? ' · 超时' : ' · timeout';
  return isZh() ? ' · 失败' : ' · failed';
}
function proxyOptionClass(value: string) {
  return proxyLatencies.value[proxyLatencyKey(value)]?.status || 'idle';
}
function proxiedConfigUrl(value: string) {
  const prefix = githubProxyPrefixFor(value, form.state.customGithubProxy);
  return applyGitHubProxy(selectedConfigUrl.value, prefix);
}
async function measureLatency(url: string): Promise<ProxyLatency> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), latencyTimeoutMs);
  try {
    await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    return { status: 'ok', ms: Math.round(performance.now() - start) };
  } catch (error) {
    return { status: error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    window.clearTimeout(timer);
  }
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
    const result = await measureLatency(proxiedConfigUrl(proxy.value));
    proxyLatencies.value = { ...proxyLatencies.value, [key]: result };
  }));
  isTestingProxyLatency.value = false;
  ElMessage.success(isZh() ? 'GitHub 加速测速完成' : 'GitHub proxy test complete');
}
function isOptionVisible(def: OptionDef) {
  return def.key !== 'provider' || form.state.target === 'clash' || form.state.target === 'clashr';
}
function defsOf(group: string) { return OPTION_DEFS.filter((d) => d.group === group && isOptionVisible(d)); }
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
  return def.key === 'interval' ? value / secondsPerDay : value;
}
function setNumberOption(def: OptionDef, value?: number) {
  if (value === undefined) {
    setOption(def.key, undefined);
    return;
  }
  setOption(def.key, def.key === 'interval' ? Math.round(value * secondsPerDay) : value);
}
function numberUnit(def: OptionDef) {
  if (def.key !== 'interval') return '';
  return isZh() ? '天' : 'days';
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
          size="large"
          clearable
          @update:model-value="updateSourceUrl"
          @blur="form.validateSource()"
        >
          <template #prefix>
            <el-icon><Connection /></el-icon>
          </template>
        </el-input>
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
            <el-switch
              v-if="def.type === 'boolean'"
              :model-value="optionValue(def.key) === true"
              @update:model-value="(v: boolean | string | number) => setOption(def.key, !!v)"
            />
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
            <el-input
              v-else-if="def.type === 'string'"
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
              <span v-if="numberUnit(def)" class="number-unit">{{ numberUnit(def) }}</span>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
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
.subscription-name-field {
  margin-bottom: 0;
}

.source-field {
  margin-bottom: 14px;
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

.option-row :deep(.el-switch) {
  justify-self: end;
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

.number-unit {
  color: var(--text-secondary);
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
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

  .option-row :deep(.el-switch) {
    justify-self: end;
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

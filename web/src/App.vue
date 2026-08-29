<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { setLang } from './i18n';

const { t, locale } = useI18n();
function toggleLang() {
  setLang(locale.value.startsWith('zh') ? 'en' : 'zh-CN');
}
</script>

<template>
  <main class="shell">
    <div class="topbar">
      <div class="brand">
        <h1>{{ t('app.title') }}</h1>
        <div class="subtitle">{{ t('app.subtitle') }}</div>
      </div>
      <el-button @click="toggleLang">{{ t('common.lang') }}</el-button>
    </div>
    <div class="layout">
      <section class="form-col" aria-label="form"><slot name="form" /></section>
      <aside class="preview-col" aria-label="preview"><slot name="preview" /></aside>
    </div>
  </main>
</template>

<style scoped>
.shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 42px; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
h1 { margin: 0; font-size: 1.6rem; }
.subtitle { margin-top: 5px; color: var(--text-secondary); font-size: 0.9rem; font-weight: 600; }
.layout { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr); gap: 20px; align-items: start; }
.preview-col { position: sticky; top: 16px; }
@media (max-width: 1023px) {
  .layout { grid-template-columns: 1fr; }
  .preview-col { position: static; }
}
</style>

<style>
@media (max-width: 767px) {
  .shell { padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
}
</style>

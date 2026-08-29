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
  </main>
</template>

<style scoped>
.shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 42px; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
h1 { margin: 0; font-size: 1.6rem; }
.subtitle { margin-top: 5px; color: var(--text-secondary); font-size: 0.9rem; font-weight: 600; }
</style>

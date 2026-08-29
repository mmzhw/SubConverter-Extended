<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Clock, Link, Operation, SwitchButton } from '@element-plus/icons-vue';
import { setLang } from './i18n';
import { useFormState } from './composables/useFormState';
import { useGeneratedLinks } from './composables/useGeneratedLinks';
import ConfigForm from './components/ConfigForm.vue';
import UrlPreview from './components/UrlPreview.vue';
import BottomActionBar from './components/BottomActionBar.vue';

const { t, locale } = useI18n();
const form = useFormState();
const generated = useGeneratedLinks();
const generatedCount = computed(() => generated.links.value.length);

function toggleLang() {
  setLang(locale.value.startsWith('zh') ? 'en' : 'zh-CN');
}
</script>

<template>
  <main class="shell">
    <div class="topbar" aria-label="header">
      <div class="brand">
        <div class="eyebrow">
          <el-icon><SwitchButton /></el-icon>
          <span>{{ t('app.kicker') }}</span>
        </div>
        <h1>{{ t('app.title') }}</h1>
        <div class="subtitle">{{ t('app.subtitle') }}</div>
      </div>
      <div class="top-actions">
        <div class="status-strip" aria-label="status">
          <span class="status-item">
            <el-icon><Operation /></el-icon>
            {{ form.state.target }}
          </span>
          <span class="status-item">
            <el-icon><Clock /></el-icon>
            {{ t('app.generatedCount', { count: generatedCount }) }}
          </span>
          <span class="status-item" :class="{ active: !!form.builtUrl.value }">
            <el-icon><Link /></el-icon>
            {{ form.builtUrl.value ? t('app.ready') : t('app.waiting') }}
          </span>
        </div>
        <el-button class="language-button" @click="toggleLang">{{ t('common.lang') }}</el-button>
      </div>
    </div>

    <div class="layout">
      <section class="form-col" aria-label="form">
        <ConfigForm />
      </section>
      <aside class="preview-col" aria-label="preview">
        <UrlPreview />
      </aside>
    </div>
  </main>
  <BottomActionBar />
</template>

<style scoped>
.shell {
  width: min(1280px, calc(100% - 48px));
  margin: 0 auto;
  padding: 34px 0 48px;
}

.topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--surface-border);
}

.brand {
  min-width: 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.5rem);
  line-height: 0.98;
  letter-spacing: 0;
}

.subtitle {
  max-width: 520px;
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 650;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.status-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid var(--surface-border);
  border-radius: 18px;
  background: var(--surface-strong);
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 0.84rem;
  font-weight: 750;
  text-transform: capitalize;
  white-space: nowrap;
}

.status-item.active {
  color: var(--accent);
  background: var(--accent-soft);
}

.language-button {
  min-height: 46px;
  min-width: 54px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 440px);
  gap: 28px;
  align-items: start;
  padding-top: 28px;
}

.form-col,
.preview-col {
  min-width: 0;
}

.preview-col {
  position: sticky;
  top: 18px;
}

@media (max-width: 1023px) {
  .shell {
    width: min(760px, calc(100% - 32px));
  }

  .topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .top-actions {
    justify-content: flex-start;
    width: 100%;
  }

  .layout {
    grid-template-columns: 1fr;
  }

  .preview-col {
    position: static;
  }
}

@media (max-width: 767px) {
  .shell {
    width: min(100% - 24px, 560px);
    padding: 20px 0 calc(98px + env(safe-area-inset-bottom, 0px));
  }

  .topbar {
    gap: 18px;
    padding-bottom: 18px;
  }

  h1 {
    font-size: 2.05rem;
  }

  .subtitle {
    font-size: 0.94rem;
  }

  .status-strip {
    width: 100%;
    overflow-x: auto;
  }

  .language-button {
    min-height: 40px;
  }

  .layout {
    gap: 18px;
    padding-top: 18px;
  }
}
</style>

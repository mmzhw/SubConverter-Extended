import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import en from './locales/en';

const LANG_KEY = 'sce-config-lang';

function detectLang(): string {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved === 'zh-CN' || saved === 'en') return saved;
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || ''];
  return langs.some((l) => /^zh\b/i.test(l)) ? 'zh-CN' : 'en';
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLang(),
  fallbackLocale: 'en',
  messages: { 'zh-CN': zhCN, en },
});

export function setLang(lang: string) {
  localStorage.setItem(LANG_KEY, lang);
  i18n.global.locale.value = lang as 'zh-CN' | 'en';
  document.documentElement.lang = lang;
}

document.documentElement.lang = i18n.global.locale.value;

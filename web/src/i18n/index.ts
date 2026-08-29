import { createI18n } from 'vue-i18n';
import zhCN from './locales/zh-CN';
import en from './locales/en';

const LANG_KEY = 'sce-config-lang';

const TITLES: Record<string, string> = {
  'zh-CN': 'SubConverter 配置组装',
  en: 'SubConverter Config Builder',
};

function syncTitle(locale: string) {
  document.title = TITLES[locale] ?? TITLES.en;
}

function detectLang(): string {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'zh-CN' || saved === 'en') return saved;
  } catch {
    // 存储不可用：忽略持久化偏好，回退到浏览器语言检测
  }
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
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // 存储不可用：仅本次会话内生效，不持久化
  }
  i18n.global.locale.value = lang as 'zh-CN' | 'en';
  document.documentElement.lang = lang;
  syncTitle(lang);
}

document.documentElement.lang = i18n.global.locale.value;
syncTitle(i18n.global.locale.value);

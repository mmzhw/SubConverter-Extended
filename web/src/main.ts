import { createApp } from 'vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import App from './App.vue';
import { i18n } from './i18n';
import './styles/tokens.css';

function syncDark() {
  document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
}
syncDark();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncDark);

createApp(App).use(ElementPlus).use(i18n).mount('#app');

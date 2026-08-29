import { describe, it, expect, vi, afterEach } from 'vitest';

// 模块为单例（main.ts 构建时引入），此处用动态 import + 抛错 localStorage stub，
// 验证存储不可用时模块仍能导入并回退到浏览器语言检测（stub 作用域限于本测试文件的 jsdom 环境）。
describe('i18n module with unavailable storage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('imports successfully and falls back to a valid locale', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    const mod = await import('./index');
    expect(['en', 'zh-CN']).toContain(mod.i18n.global.locale.value);
  });

  it('setLang still applies the locale when storage writes throw', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    const mod = await import('./index');
    expect(() => mod.setLang('zh-CN')).not.toThrow();
    expect(mod.i18n.global.locale.value).toBe('zh-CN');
    expect(document.documentElement.lang).toBe('zh-CN');
  });
});

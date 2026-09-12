import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));

function componentSource(name: string) {
  return readFileSync(resolve(currentDir, name), 'utf8');
}

function libSource(name: string) {
  return readFileSync(resolve(currentDir, '..', 'lib', name), 'utf8');
}

describe('responsive layout structure', () => {
  it('keeps preview actions in a stable two-column grid', () => {
    const source = componentSource('UrlPreview.vue');

    expect(source).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
  });

  it('renders the product logo as a dedicated component', () => {
    const source = componentSource('../App.vue');

    expect(source).toContain("import BrandLogo from './components/BrandLogo.vue';");
    expect(source).toContain('<BrandLogo />');
  });

  it('uses a single-color cat mark for the product logo', () => {
    const source = componentSource('BrandLogo.vue');

    expect(source).not.toContain('<linearGradient');
    expect(source).not.toContain('logo-route');
    expect(source).not.toContain('accent-2');
    expect(source).not.toContain('M10 36c0-6.4');
    expect(source).toContain('<circle class="logo-cat-base" cx="32" cy="33" r="23" />');
    expect(source).toContain('logo-cat-base');
    expect(source).toContain('logo-cat-face');
  });

  it('exposes the cat logo as the browser favicon', () => {
    const indexSource = readFileSync(resolve(currentDir, '../../index.html'), 'utf8');
    const icoPath = resolve(currentDir, '../../public/favicon.ico');
    const faviconPath = resolve(currentDir, '../../public/favicon.svg');

    expect(indexSource).toContain('<link rel="icon" href="/favicon.ico" sizes="any" />');
    expect(indexSource).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg" />');
    expect(existsSync(icoPath)).toBe(true);
    expect(existsSync(faviconPath)).toBe(true);
    expect(readFileSync(faviconPath, 'utf8')).toContain('logo-cat-base');
    expect(readFileSync(faviconPath, 'utf8')).toContain('<circle class="logo-cat-base" cx="32" cy="33" r="23" />');
  });

  it('marks boolean option rows so mobile switch controls can stay inline', () => {
    const source = componentSource('ConfigForm.vue');

    expect(source).toContain("'boolean-option-row': def.type === 'boolean'");
    expect(source).toContain('.boolean-option-row {');
  });

  it('renders update interval as a primary field with an explicit unit selector', () => {
    const source = componentSource('ConfigForm.vue');

    expect(source).toContain('subscription-interval-field');
    expect(source).toContain('intervalUnitOptions');
    expect(source).toContain('setIntervalUnit');
  });

  it('measures GitHub proxy latency from the backend service first', () => {
    const source = componentSource('ConfigForm.vue');

    expect(source).toContain('measurePreferredProxyLatency');
    expect(source).toContain('backendBaseForState(form.state)');
    expect(source).toContain("'server'");
    expect(source).toContain("'browser'");
  });

  it('offers a per-link DNS template editor beside the DNS switch', () => {
    const source = componentSource('ConfigForm.vue');

    expect(source).toContain('dns-template-dialog');
    expect(source).toContain('openDnsTemplateDialog');
    expect(source).toContain('saveDnsTemplateDialog');
    expect(source).toContain("def.key === 'clash.dns'");
  });

  it('lets the inline-rules match-type dropdown show multi-line descriptions', () => {
    const source = componentSource('InlineRulesControl.vue');

    // The dropdown is teleported to <body>, so the multi-line option
    // content can only be styled through a popper-class + global CSS.
    expect(source).toContain('popper-class="inline-rules-type-popper"');
    expect(source).toContain('.inline-rules-type-popper .el-select-dropdown__item');
    // Element Plus pins items to 34px/nowrap/ellipsis; the override must
    // undo all three or the description collapses back to one line.
    expect(source).toContain('height: auto;');
    expect(source).toContain('white-space: normal;');
    expect(source).toContain('text-overflow: clip;');
  });

  it('offers a row/bulk mode switch for inline rules', () => {
    const source = componentSource('InlineRulesControl.vue');

    // Both editors must sit behind the toggle, and the bulk editor must
    // reuse the shared line parser rather than inventing its own format.
    expect(source).toContain("const mode = ref<'rows' | 'text'>('rows')");
    expect(source).toContain('parseInlineRuleLines(');
    expect(source).toContain('serializeInlineRuleLines(');
    expect(source).toContain('type="textarea"');
    expect(source).toContain('inlineRulesToText');
    expect(source).toContain('inlineRulesToRows');
    // Unparsable lines are surfaced rather than silently dropped.
    expect(source).toContain('inlineRulesInvalidLines');
  });

  it('edits subscription sources as a multi-line list', () => {
    // One source per line, joined with '|' at the URL boundary. A single-line
    // input sent comma-joined sources through as one unusable URL.
    expect(componentSource('ConfigForm.vue')).toContain('source-textarea');
    expect(componentSource('ConfigForm.vue')).toContain('type="textarea"');
    expect(libSource('url-builder.ts')).toContain('joinSourceUrlsForWire(');
    expect(libSource('url-parser.ts')).toContain('wireToSourceUrls(');
    expect(componentSource('ConfigForm.vue')).toContain('form.sourceUrlCommaSeparated');
  });
});

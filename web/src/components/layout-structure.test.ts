import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));

function componentSource(name: string) {
  return readFileSync(resolve(currentDir, name), 'utf8');
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

  it('marks boolean option rows so mobile switch controls can stay inline', () => {
    const source = componentSource('ConfigForm.vue');

    expect(source).toContain("'boolean-option-row': def.type === 'boolean'");
    expect(source).toContain('.boolean-option-row {');
  });
});

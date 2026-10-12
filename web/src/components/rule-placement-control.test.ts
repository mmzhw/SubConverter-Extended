import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * The two rule controls are verified structurally: the repo has no
 * @vue/test-utils, so a component cannot be mounted in a test. Behaviour of
 * the placement switch (content survives a flip, parameter name follows the
 * placement) is covered functionally by `src/lib/rule-placement.test.ts`;
 * what is checked here is that both controls actually expose the switch and
 * that the switch cannot reach the family's content.
 */
const currentDir = dirname(fileURLToPath(import.meta.url));

function componentSource(name: string) {
  return readFileSync(resolve(currentDir, name), 'utf8');
}

describe('rule placement switch', () => {
  for (const [name, prefix] of [
    ['InlineRulesControl.vue', 'inline-rules'],
    ['ExtraRulesetsControl.vue', 'ext-rulesets'],
  ] as const) {
    it(`${name} exposes a controlled placement prop`, () => {
      const source = componentSource(name);

      expect(source).toContain('placement: RulePlacement;');
      expect(source).toContain("(event: 'update:placement', value: RulePlacement): void;");
      expect(source).toContain("import type { RulePlacement } from '../lib/rule-target';");
    });

    it(`${name} renders the two placement choices with the prepend hint`, () => {
      const source = componentSource(name);

      expect(source).toContain('el-radio-group');
      expect(source).toContain('<el-radio-button value="append">');
      expect(source).toContain('<el-radio-button value="prepend">');
      expect(source).toContain("t('form.rulePlacementAppend')");
      expect(source).toContain("t('form.rulePlacementPrepend')");
      // The hint is what warns that prepending outranks the preset's own
      // private-network rules; it shows only for the prepend choice.
      expect(source).toContain(`class="${prefix}-placement-hint"`);
      expect(source).toContain("v-if=\"placement === 'prepend'\"");
      expect(source).toContain("t('form.rulePlacementPrependHint')");
    });

    it(`${name} only emits the placement, never a rewritten rule value`, () => {
      const source = componentSource(name);
      const setter = source.slice(source.indexOf('function setPlacement'));
      const body = setter.slice(0, setter.indexOf('}'));

      expect(body).toContain("emit('update:placement'");
      expect(body).not.toContain('update:modelValue');
      expect(body).not.toContain('rows.value');
    });
  }

  it('keeps the inline-rules switch outside both editor modes', () => {
    const source = componentSource('InlineRulesControl.vue');

    // Recorded before the mode branches, so it stays visible and usable
    // whether the user is in row mode or bulk-text mode.
    expect(source.indexOf("t('form.rulePlacement')"))
      .toBeLessThan(source.indexOf("v-if=\"mode === 'rows'\""));
  });

  it('keeps the extra-rulesets switch above the ruleset rows', () => {
    const source = componentSource('ExtraRulesetsControl.vue');
    const placement = source.indexOf('ext-rulesets-placement');
    const rows = source.indexOf('class="ext-rulesets-row"');

    expect(placement).toBeGreaterThan(-1);
    expect(placement).toBeLessThan(rows);
  });

  it('binds both controls to the shared placement helpers in the form', () => {
    const source = componentSource('ConfigForm.vue');

    expect(source).toContain("import { applyPlacement, placementOf, type RulePlacement } from '../lib/rule-target';");
    // Both rule families read the placement from the shared shadow key and
    // write it back through applyPlacement, which leaves rules untouched.
    expect(source.match(/:placement="placementOf\(form\.state\.options, def\.key\)"/g)).toHaveLength(2);
    expect(source.match(/@update:placement="\(v: RulePlacement\) => applyPlacement\(form\.state\.options, def\.key, v\)"/g))
      .toHaveLength(2);
  });
});

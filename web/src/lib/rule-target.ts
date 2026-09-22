/**
 * Rule placement: which slot of the final Clash rule list a rule family
 * lands in.
 *
 * `append` (the default, and the historical behaviour) is the plain URL
 * parameter: those rules go after the preset's generated rules but before
 * its terminal `MATCH` rule. `prepend` uses the `_prepend` sibling
 * parameter: those rules head the final rule list, ahead of every preset
 * rule — including the remote config's own `[ruleprepend]` block.
 *
 * The chosen placement is UI state, not a backend parameter, so it lives
 * under a shadow key (`${key}_mode`) inside the form's options record. The
 * shadow key must never reach the generated URL; `ruleParamFor` is what
 * turns it into a real parameter name.
 */
export type RulePlacement = 'prepend' | 'append';

/** Rule families that support both placements. */
export const PLACEMENT_KEYS = ['ext_ruleset', 'inline_rules'] as const;

export type PlacementKey = (typeof PLACEMENT_KEYS)[number];

export function isPlacementKey(key: string): key is PlacementKey {
  return (PLACEMENT_KEYS as readonly string[]).includes(key);
}

/** Shadow option key holding a family's placement ("not a wire parameter"). */
export function rulePlacementKey(key: string): string {
  return `${key}_mode`;
}

/** URL parameter carrying a family's rules for the given placement. */
export function ruleParamFor(key: string, placement: RulePlacement): string {
  return placement === 'prepend' ? `${key}_prepend` : key;
}

/** Reads the placement recorded in an options record; defaults to 'append'. */
export function placementOf(
  options: Record<string, string | number | boolean | undefined>,
  key: string,
): RulePlacement {
  return options[rulePlacementKey(key)] === 'prepend' ? 'prepend' : 'append';
}

/**
 * Records a family's placement. The family's own content (`options[key]`) is
 * never touched, so switching placement can never drop rules. 'append' is the
 * default, so it clears the shadow key instead of storing a redundant value.
 */
export function applyPlacement(
  options: Record<string, string | number | boolean | undefined>,
  key: string,
  placement: RulePlacement,
): void {
  if (placement === 'append') {
    delete options[rulePlacementKey(key)];
    return;
  }
  options[rulePlacementKey(key)] = placement;
}

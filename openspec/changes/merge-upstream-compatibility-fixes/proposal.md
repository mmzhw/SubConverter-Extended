## Why

The fork still contains upstream bugs in subscription decoding, provider URL
emission, data URI decoding, ruleset comments and completed fetch retries.
Import the seven audited fixes without migrating the runtime or release system.

## What Changes

- Decode subscription envelopes before URI preprocessing and tolerate invalid
  individual URI nodes while retaining strict native provider validation.
- Preserve provider URL escapes after transport decoding.
- Decode data URI payloads without form-query transformations; retain wrapped
  Base64 compatibility and download limits.
- Preserve literal double slashes in ruleset values.
- Retire completed failed shared fetches so late consumers can retry.
- Add offline regressions while preserving all fork-specific behavior and tests.

## Capabilities

### New Capabilities
- `upstream-compatibility`: Correct decoding, ruleset comments and fetch retries.

### Modified Capabilities
- None. The former main-spec directory was removed before this change;
  this change establishes only the minimal specification for the selected fixes.

## Impact

The Go parser, C++ fetch layer, provider emission and rule conversion change.
No Web UI, dependency upgrades, Docker topology, short-link storage, public
parameter formats, runtime migration or release workflow changes are included.

Upstream sources: fbeb8331, 619c189d, 5694018d, 97019775, 06c3e1cf,
a67b8970 and ecf467a6 in Aethersailor/SubConverter-Extended.

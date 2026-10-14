## Context

The fork is based on upstream v1.8.6 and adds nginx, a Web UI, inline and
external rules, editable short links and per-link DNS templates. Whole-tree
replacement would risk those contracts. Seven upstream patches have been
checked together against a9f39f92 and can be applied without runtime migration.

## Goals / Non-Goals

Goals: preserve input bytes at the correct decoding boundary, prevent ruleset
truncation and allow genuine retries after completed fetch failures. Add
deterministic, offline regressions and preserve existing fork contracts.

Non-goals: new node protocols, Alpha dependency tracking, group health-default
inheritance, async runtime replacement, OpenWrt expansion or formal release.

## Decisions

1. Apply the audited upstream changes as working-tree patches, not a merge or
   cherry-pick commit. Keep dependency pins and deployment configuration intact.
2. Treat native YAML as structured input, Base64 as an envelope and individual
   URI components as the parser's responsibility. Decode a fully encoded URI
   once, and only normalize legacy SS/TUIC userinfo separators explicitly.
3. Keep provider URLs unchanged at generation time. Do not globally change
   urlDecode: existing callers intentionally use query-decoding semantics.
4. Percent-decode data URI content separately. Preserve plus and control bytes
   for ordinary text, remove CR/LF only from Base64 transport text, and enforce
   both encoded/decoded download limits.
5. Use the upstream comment helper across every ruleset conversion path. Free
   text/regex values retain literal slashes; structured rules may strip
   whitespace-delimited comments outside quotes and escapes.
6. Return Retired from completed unsuccessful fetch operations. Replace only
   the matching registry entry; old callbacks still receive their own result.
   Successfully completed operations remain reusable.
7. Use the existing fetch-operation probe to exercise the callback publication
   window deterministically instead of relying on timing-sensitive races.

## Risks / Trade-offs

- URI lists now skip invalid individual nodes; native YAML remains strict and
  all-invalid URI lists still fail. Test both forms explicitly.
- Preserved URL escapes can change emitted provider URLs relative to the buggy
  output. Tests use only example hosts and synthetic credentials.
- Comment handling must cover quoted, escaped, free-text and ordinary rules.
- Tests must not require external subscriptions or public network services.
- Test-server SSH may be unavailable. In that case retain uncompleted build
  tasks and report the missing verification rather than claiming success.

## Migration Plan

No persisted-data migration or parameter migration is required. Existing rules,
short links and DNS templates retain their format. Complete regression checks,
synchronize the minimal main spec, then archive this change when validation is
complete. No tag, push or production deployment is part of this request.

## 1. Implementation
- [x] 1.1 Apply the seven audited upstream fixes without changing dependencies.
- [x] 1.2 Add subscription parsing and preprocessing regression tests.
- [x] 1.3 Add ruleset comment and output regression tests.
- [x] 1.4 Add data URI and provider URL integration regressions.
- [x] 1.5 Add deterministic failed-completion and successful-reuse probes.

## 2. Validation
- [x] 2.1 Validate OpenSpec change and review the diff for fork preservation.
- [x] 2.2 Run Go parser regressions and local isolated C++ logic regressions.
- [ ] 2.3 Build on the test server and run offline integration regressions.
- [ ] 2.4 Run existing inline-rule, external-rule and short-link regressions.
- [ ] 2.5 Record verification results; synchronize the main spec and archive
  only after required validation completes.

## Evidence (2026-10-14)

- `go test -mod=readonly -count=1 ./...` passed using a temporary official Go
  1.26.0 SDK, whose archive matched the official SHA256. Module pins and
  generated parser metadata did not change.
- The standalone `ruleset_comment_test.cpp` compiled with MinGW GCC 16.2.0,
  C++20, `-Wall -Wextra -Werror`; all 22 cases passed.
- Isolated production `dataGet`, linked against the real base64/string
  implementations with settings/logging stubs: 17 cases passed. Original HEAD
  failed the literal-plus case (negative control).
- Isolated production `CacheFetchOperation`, using the real request-context
  header and minimal payload fixtures: 12 cases passed. Original HEAD reused a
  failure during callback delivery (negative control failed as expected).
- Original Go parser/preprocessor failed the new escaped URI, native YAML and
  mixed invalid/valid subscription tests. The updated full Go suite passed.
- Web verification: Vitest 220 passed, `vue-tsc --noEmit` passed, production
  build passed. Vite reported its existing large-chunk warning; no Web source
  or dependency manifests were changed.
- Main spec synchronized with identical requirement names. Strict main-spec
  validation and strict validation of this selected change passed.
  `git diff --check` passed.
- Global `openspec validate --changes --strict` did NOT fully pass: the
  pre-existing tracked `rules-priority-position` change has long-requirement
  warnings and a MODIFIED delta referencing a removed main spec. Those files
  predate this task and were not changed or restored as part of this batch.
- New integration test imports, Python syntax and smoke references checked.
  The full HTTP integration test has NOT run against a rebuilt executable.
- Test-server SSH could not establish a protocol banner: the TCP peer closed
  the connection. No Docker build, container replacement or release occurred.

Tasks 2.3-2.5 remain open. Local isolated C++ checks are NOT a replacement for
the required full test-server build and HTTP integration regressions. The
change remains active and is not archived until these validations complete.

After restoring test-server access, build the existing test targets and run:

```sh
ctest --test-dir build --output-on-failure -R 'upstream_compatibility|ruleset_comment|ruleset_output|external_rules|parse_ext_ruleset|collect_external_group_names|short_link'
```

The `upstream_compatibility` runner uses synthetic data URIs, generated
temporary short-link storage and existing offline smoke cases. It does not
need real subscriptions or public upstream configuration URLs.

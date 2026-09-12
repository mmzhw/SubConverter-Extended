# inline-rules Specification

## Purpose

Lets users route specific domains, keywords, CIDRs, or geo entries to a chosen
proxy group directly in the form — without writing or hosting an external
ruleset file. The frontend accepts a row-based "match type + value + group"
editor, and the new `inline_rules=` URL parameter feeds those rows straight
into the same `rule_append` pipeline that `ext_ruleset=` uses.

## Requirements

### Requirement: URL parameter `inline_rules=`

The system MUST accept the URL parameter `inline_rules=<value>` and combine
its value with the regular Clash rule pipeline. The wire format MUST be:

```
Group:TYPE,value|TYPE,value;Group2:TYPE,value|TYPE,value
```

- `;` separates group sections.
- `:` separates a group name from its rule list (the first `:` inside a
  group section is the separator; later colons inside a rule value are
  preserved as part of the value).
- `|` separates rules within a group.
- Each rule is the canonical Clash rule prefix `TYPE,value` with no trailing
  target group; the system MUST append `,<Group>` itself.

#### Scenario: Happy path

- **WHEN** `inline_rules=Domestic:DOMAIN-SUFFIX,foo.com|DOMAIN-KEYWORD,bar;Proxy:IP-CIDR,10.0.0.0/8`
- **THEN** the system appends the following rules to the merged rule list
  in order:
  - `DOMAIN-SUFFIX,foo.com,Domestic`
  - `DOMAIN-KEYWORD,bar,Domestic`
  - `IP-CIDR,10.0.0.0/8,Proxy`

#### Scenario: Empty parameter

- **WHEN** `inline_rules=` is empty or whitespace-only
- **THEN** no rules are added; no error is returned.

### Requirement: Group validation

The system MUST validate every group name in `inline_rules` against the groups
the generated Clash/ClashR configuration will actually contain. `ext_ruleset=`
shares this same set.

That set is:

- every `custom_proxy_group` name declared by the loaded remote config, and
- the Clash policy names `DIRECT` and `REJECT`, which Clash and its forks
  resolve as rule targets without a `proxy-groups` definition.

The historical fallback names `Proxy`, `Direct` and `GLOBAL` MUST NOT be
accepted when the loaded remote config declares groups. `Proxy` is synthesised
only for Stash output (`subexport.cpp`) and `GLOBAL` is added only to Sing-box
output, so for a Clash target neither exists; accepting them produced rules
that clients reject with `proxy [X] not found`, failing the whole
configuration.

Those fallback names MUST still be accepted when the loaded config declares no
groups at all, because then there is nothing to validate against and rejecting
them would refuse every group name in that configuration.

The `DIRECT` and `REJECT` policy names MUST be accepted in both cases. `Direct`
with that casing is NOT one of them and MUST NOT be accepted in place of
`DIRECT`.

A rejected name MUST produce a bilingual error that lists the groups the
current remote config declares.

#### Scenario: Unknown group rejected

- **WHEN** `inline_rules=NotARealGroup:DOMAIN-SUFFIX,foo.com`
- **THEN** the response is HTTP 400 with a bilingual error message that lists
  the valid groups defined by the current remote config.

#### Scenario: Fallback name rejected when the config declares other groups

- **WHEN** the loaded remote config declares `🎯 全球直连` but not `Direct`, and
  the request is `inline_rules=Direct:DOMAIN-SUFFIX,lan.internal`
- **THEN** the response is HTTP 400 listing the groups the config declares,
  instead of succeeding with a rule whose target does not exist.

#### Scenario: Built-in policy names accepted

- **WHEN** `inline_rules=DIRECT:DOMAIN-SUFFIX,lan.internal`
- **THEN** the response succeeds and the rule is appended with target `DIRECT`,
  even though no proxy group is named `DIRECT`.

#### Scenario: REJECT accepted without a group definition

- **WHEN** `inline_rules=REJECT:DOMAIN-KEYWORD,ads.example`
- **THEN** the response succeeds and the rule is appended with target `REJECT`.

#### Scenario: Fallback group accepted

- **WHEN** the loaded config declares no groups at all and
  `inline_rules=Direct:DOMAIN-SUFFIX,lan.internal`
- **THEN** the response succeeds, because there is no group set to validate
  against.

### Requirement: Rule validation

Each rule line MUST pass the existing `parseExternalClashRules` validator
with `require_target=false`. The validator's output list (in input order)
MUST be appended to `policy.generator.rule_append` with `,<Group>` appended
to each line.

#### Scenario: Unknown rule type rejected

- **WHEN** `inline_rules=Proxy:NOT-A-TYPE,foo.com`
- **THEN** the response is HTTP 400 with a bilingual error message that
  identifies the offending rule and its source location.

#### Scenario: MATCH / FINAL rejected

- **WHEN** `inline_rules=Proxy:MATCH,DIRECT` or `inline_rules=Proxy:FINAL,DIRECT`
- **THEN** the response is HTTP 400; the validator MUST reject terminal
  rules even when they would otherwise parse cleanly.

#### Scenario: Empty value rejected

- **WHEN** `inline_rules=Proxy:DOMAIN-SUFFIX,`
- **THEN** the response is HTTP 400; rules must have a non-empty value.

### Requirement: Target and feature gating

`inline_rules` MUST be subject to the same gating as `ext_ruleset=`:
- It MUST only take effect when `target` is `clash` or `clashr`.
- It MUST be rejected (HTTP 400) when `list=true`.
- It MUST be rejected (HTTP 400) when `script=true`.
- The total number of rules (sum across all groups) MUST NOT exceed
  `settings.max_allowed_rulesets`.

#### Scenario: Non-clash target rejected

- **WHEN** `target=surge&inline_rules=Proxy:DOMAIN-SUFFIX,foo.com`
- **THEN** the response is HTTP 400 with a bilingual error explaining
  `inline_rules` only supports `clash`/`clashr`.

#### Scenario: list=true rejected

- **WHEN** `target=clash&list=true&inline_rules=Proxy:DOMAIN-SUFFIX,foo.com`
- **THEN** the response is HTTP 400.

#### Scenario: Over-limit rejected

- **WHEN** `inline_rules` declares more than `settings.max_allowed_rulesets`
  rules in total
- **THEN** the response is HTTP 400 with a bilingual error that names the
  configured limit.

### Requirement: Coexistence with `ext_ruleset=`

`inline_rules=` and `ext_ruleset=` MUST be allowed in the same request.
Both contributions land in `policy.generator.rule_append`; their relative
order follows the request: rules from `ext_ruleset=` (in the order fetched
and listed by the URL parameter) come first, then rules from `inline_rules=`
(in the order they appear in the parameter), each group section in order.

#### Scenario: Mixed request

- **WHEN** `target=clash&ext_ruleset=Proxy,https://example.com/p.list&inline_rules=Domestic:DOMAIN-SUFFIX,foo.com`
- **THEN** the rules fetched from the `ext_ruleset` URL come first (each
  tagged `,Proxy`), followed by the inline rule
  `DOMAIN-SUFFIX,foo.com,Domestic`.

### Requirement: Frontend row control

The form MUST render a control for `inline_rules` inside the "rule" group
section, alongside the existing "extra rulesets" control. The control MUST
support two editing modes and MUST allow switching between them.

In **row mode** (the default) each row MUST expose, in order:

1. A match-type dropdown populated with a curated set of Clash rule
   types: `DOMAIN`, `DOMAIN-SUFFIX`, `DOMAIN-KEYWORD`, `DOMAIN-REGEX`,
   `GEOIP`, `GEOSITE`, `IP-CIDR`, `IP-CIDR6`, `SRC-IP-CIDR`. (MATCH and
   FINAL MUST NOT appear because the validator rejects them.)
2. A single-line value input whose placeholder reflects the chosen match
   type (e.g. `example.com` for `DOMAIN-SUFFIX`, `CN` for `GEOIP`,
   `192.168.0.0/16` for `IP-CIDR`).
3. A group dropdown populated from the same `useGroupNames(configUrl)`
   composable already used by the "extra rulesets" control. The dropdown
   MUST be `filterable`, MUST accept user-typed values via `allow-create`,
   and MUST show the four fallback groups when no remote config is chosen.
4. A delete button that removes the row (or clears it to a single empty
   row when only one row remains).

A "+ Add rule" button MUST appear below the rows to append a new empty
row.

In **text mode** the control MUST render a multi-line text input editing
the format defined by "Text editor line format and tolerance" below.

Switching modes MUST carry the current rules across:

- Row mode to text mode: the text MUST be generated from the current rows,
  so no rule has to be retyped.
- Text mode to row mode: the rows MUST be generated by parsing the text,
  dropping lines that cannot be parsed.

Whichever mode is active, edits MUST emit the same `update:modelValue`
wire format (`Group:TYPE,value|TYPE,value;Group2:...`) so the URL parameter
and the localStorage preset format stay unchanged.

#### Scenario: Empty rows do not emit

- **WHEN** the user has three rows and the second row has only a match
  type filled in
- **THEN** the resulting `inline_rules` value contains only the two fully
  filled rows, separated by `;` and ordered as entered.

#### Scenario: Round-trip through the URL

- **WHEN** the user enters two rows
  (`DOMAIN-SUFFIX,foo.com,Domestic` and `IP-CIDR,10.0.0.0/8,Proxy`) and
  the form generates a subscription URL
- **THEN** the URL contains
  `inline_rules=Domestic%3ADOMAIN-SUFFIX%2Cfoo.com%7C...` (URI-encoded)
  and pasting that URL back into the form restores exactly the same two
  rows in the same order.

#### Scenario: Group list follows the remote config

- **WHEN** the user changes the "remote config" field to a preset whose
  `custom_proxy_group` declares `MyGroup`
- **THEN** the group dropdown reloads (debounced, cached) and `MyGroup`
  appears as a selectable option.

#### Scenario: Switching to text mode keeps the current rules

- **WHEN** row mode holds `DOMAIN-SUFFIX,foo.com,Domestic` and the user
  switches to text mode
- **THEN** the text input contains `DOMAIN-SUFFIX,foo.com,Domestic`
  without the rule having to be retyped.

#### Scenario: Bulk entry in text mode

- **WHEN** the user pastes three valid rules into the text input
- **THEN** the resulting `inline_rules` contains all three, and switching
  back to row mode shows three rows carrying the same match types, values
  and groups.

### Requirement: Text editor line format and tolerance

The text editor MUST read one rule per line as `TYPE,value,Group`, for
example `DOMAIN-SUFFIX,foo.com,Domestic`.

Parsing MUST satisfy all of the following:

- The first comma ends the match type and the last comma starts the group,
  with everything between treated as the value, so a value that itself
  contains commas (e.g. `DOMAIN-REGEX,^a,b$,Domestic`) MUST NOT be split at
  the wrong place.
- Each field MUST be trimmed of surrounding whitespace.
- Blank lines, and lines whose first non-whitespace character is `#`, MUST
  be skipped and MUST NOT be counted as unparsable.
- A line with fewer than three fields, or with an empty match type, value
  or group, MUST be treated as unparsable.

An unparsable line MUST NOT reach the `inline_rules` parameter, MUST remain
in the editor text so the user can correct it, and MUST be reported below
the editor as a count. That notice MUST state that switching back to row
mode drops those lines.

#### Scenario: A line missing its group is kept and counted

- **WHEN** the editor holds `DOMAIN-SUFFIX,foo.com` (no group) and
  `IP-CIDR,10.0.0.0/8,Proxy`
- **THEN** only the second rule reaches `inline_rules`, the first line
  stays in the text unchanged, and the notice reports one unparsable line.

#### Scenario: A value containing commas is not split wrongly

- **WHEN** the editor holds `DOMAIN-REGEX,^a,b$,Domestic`
- **THEN** it parses as match type `DOMAIN-REGEX`, value `^a,b$` and group
  `Domestic`, and no unparsable line is reported.

#### Scenario: Comments and blank lines are not unparsable

- **WHEN** the editor holds a blank line, `# a note`, and one valid rule
- **THEN** no unparsable notice appears and only that rule is emitted.

### Requirement: URL round-trip

`buildSubUrl` MUST include `inline_rules` in the generated query string
whenever its value is non-empty. `parseSubUrl` MUST restore `inline_rules`
into the form state when importing a link. The `inline_rules` value MUST
survive localStorage preset round-trips unchanged.

#### Scenario: localStorage preset round-trip

- **WHEN** the user saves a preset that contains an `inline_rules` value
  and reloads the page
- **THEN** the form reopens with the same rows, in the same order, with
  the same match type, value, and group selections.

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

The system MUST validate every group name in `inline_rules` against the
same set used by `ext_ruleset=`: the union of `custom_proxy_group` names
declared by the loaded remote config and the four fallback groups
(`Proxy`, `Direct`, `REJECT`, `GLOBAL`).

#### Scenario: Unknown group rejected

- **WHEN** `inline_rules=NotARealGroup:DOMAIN-SUFFIX,foo.com`
- **THEN** the response is HTTP 400 with a bilingual error message that lists
  the valid groups defined by the current remote config.

#### Scenario: Fallback group accepted

- **WHEN** `inline_rules=Direct:DOMAIN-SUFFIX,lan.internal`
- **THEN** the response succeeds and the rule is appended with target
  `Direct` even if the remote config does not declare `Direct` explicitly.

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

The form MUST render a row-based control for `inline_rules` inside the
"rule" group section, alongside the existing "extra rulesets" control. Each
row MUST expose, in order:

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

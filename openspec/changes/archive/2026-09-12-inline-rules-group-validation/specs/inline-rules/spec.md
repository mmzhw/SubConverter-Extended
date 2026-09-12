## MODIFIED Requirements

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
  against. (The scenario keeps its name from the previous spec, where it was
  unconditional; it now holds only in this case.)

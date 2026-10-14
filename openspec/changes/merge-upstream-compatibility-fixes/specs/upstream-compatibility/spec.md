## ADDED Requirements

### Requirement: Subscription decoding preserves component escapes
The parser SHALL identify native YAML before preprocessing and decode a Base64
subscription envelope before processing individual URIs. Ordinary URIs SHALL
retain literal plus signs and escaped credentials and delimiters.

#### Scenario: Encoded credentials and transport parameters
- **WHEN** an ordinary URI contains plus signs or percent-escaped delimiters
- **THEN** preprocessing leaves its component bytes unchanged, except for the
  explicitly supported legacy SS/TUIC encoded userinfo separator

#### Scenario: Mixed valid and invalid URI nodes
- **WHEN** a URI subscription contains valid and invalid individual nodes
- **THEN** valid nodes remain available and invalid nodes are skipped

#### Scenario: Strict native provider validation
- **WHEN** native provider YAML contains an invalid proxy mapping
- **THEN** parsing fails rather than silently omitting the invalid mapping

### Requirement: Provider emission preserves subscription URLs
Provider generation SHALL preserve the subscription URL after transport and
source-prefix decoding without an additional query-decoding pass.

#### Scenario: Escaped provider URL parameters
- **WHEN** a source URL contains encoded delimiters or a literal plus sign
- **THEN** the emitted provider URL retains those bytes

### Requirement: Data URI decoding preserves payload bytes
Data URI decoding SHALL percent-decode payloads without converting plus to
space or dropping CR/LF from ordinary text. Base64 payloads SHALL tolerate
CR/LF wrapping and remain subject to encoded and decoded download limits.

#### Scenario: Multiline ordinary text
- **WHEN** a text data URI contains plus signs and encoded or literal newlines
- **THEN** the decoded payload retains those bytes and line boundaries

#### Scenario: Wrapped standard Base64
- **WHEN** a Base64 data URI contains plus signs and CR/LF wrapping
- **THEN** it decodes the original content without query-decoding corruption

### Requirement: Ruleset comments preserve literal double slashes
Ruleset conversion and output SHALL retain literal double slashes in free-text
values and quoted or escaped content. Whole-line comments SHALL be ignored;
structured-rule inline comments SHALL require an unambiguous boundary.

#### Scenario: Regex containing a URL
- **WHEN** a ruleset contains a regex or path with literal double slashes
- **THEN** conversion and output do not truncate its value

#### Scenario: Structured rule with an inline comment
- **WHEN** a structured rule contains a whitespace-delimited trailing comment
- **THEN** the comment is removed without altering the rule value

### Requirement: Failed completed fetches allow new retries
A late fetch consumer SHALL replace a completed unsuccessful shared operation
rather than reuse its failure. Successful completed operations SHALL remain
reusable and existing callbacks SHALL retain their original result.

#### Scenario: Retry during failure callback delivery
- **WHEN** a new consumer arrives while a failed operation delivers callbacks
- **THEN** it starts or joins a new operation, not the completed failure

#### Scenario: Successful completion reuse
- **WHEN** a new consumer arrives after successful fetch completion
- **THEN** it can reuse the successful result

### Requirement: Fork extensions remain compatible
The fixes SHALL retain inline/external rules, prepend order, group validation,
shared quotas, atomic fetch failure, short-link editing/persistence and the
nginx deployment contract without introducing new parameter formats.

#### Scenario: Existing custom-rule requests
- **WHEN** an existing inline or external rule request is converted
- **THEN** its target restrictions, placement and validation remain unchanged

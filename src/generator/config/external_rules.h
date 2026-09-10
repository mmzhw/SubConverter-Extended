#ifndef EXTERNAL_RULES_H_INCLUDED
#define EXTERNAL_RULES_H_INCLUDED

#include <cstddef>
#include <string>
#include <vector>

#include "utils/string.h"

struct ExternalRuleParseResult {
  bool ok = false;
  string_array rules;
  std::string error;
};

// When require_target is false, rules without a trailing ",<policy>"
// field are accepted; the caller is expected to append the target
// policy itself (e.g. the ext_ruleset= Group,URL path).
ExternalRuleParseResult
parseExternalClashRules(const std::string &content,
                        const std::string &source_identifier,
                        const string_array &allowed_rule_types,
                        bool require_target = true);

string_array mergeClashRules(const string_array &prepend,
                             const string_array &original,
                             const string_array &generated,
                             const string_array &append);

bool mergeClashRulesWithinLimit(const string_array &prepend,
                                const string_array &original,
                                const string_array &generated,
                                const string_array &append,
                                std::size_t max_rules,
                                string_array &result);

#endif // EXTERNAL_RULES_H_INCLUDED

#ifndef GITHUB_PROXY_H_INCLUDED
#define GITHUB_PROXY_H_INCLUDED

#include <string>

#include "config/ruleset.h"
#include "utils/string.h"

std::string inferGitHubProxyPrefixFromConfigUrl(const std::string &config_url);
std::string applyGitHubProxyToUrl(const std::string &url,
                                  const std::string &proxy_prefix);
std::string applyGitHubProxyToRulesetUrl(const std::string &ruleset_url,
                                         const std::string &proxy_prefix);
void applyGitHubProxyToRulesetConfigs(RulesetConfigs &rulesets,
                                      const std::string &proxy_prefix);
void applyGitHubProxyToSources(string_array &sources,
                               const std::string &proxy_prefix);

#endif // GITHUB_PROXY_H_INCLUDED

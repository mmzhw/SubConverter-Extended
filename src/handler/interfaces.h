#ifndef INTERFACES_H_INCLUDED
#define INTERFACES_H_INCLUDED

#include <string>
#include <map>
#include <set>
#include <utility>
#include <vector>
#include <inja.hpp>

#include "config/ruleset.h"
#include "generator/config/subexport.h"
#include "handler/fetch_context.h"
#include "server/webserver.h"

struct ExternalConfig;  // defined in handler/settings.h

// Parses the ext_ruleset= URL parameter value into (group, url) pairs.
// Format: "Group,URL[;Group,URL]..."
//   - ';' separates entries
//   - first ',' in each entry splits group from url
//   - empty entries, entries without a comma, and lines starting with
//     '#' (after trim) are skipped
//   - group/url are URL-decoded by the caller (this helper does no
//     decoding; it only trims ASCII whitespace)
// Output vector is cleared before population.
void parseExtRuleset(
    const std::string &raw,
    std::vector<std::pair<std::string, std::string>> &out);

// Returns the set of valid proxy group names that ext_ruleset=
// entries may reference. Combines:
//   - groups declared in ext.custom_proxy_group (the parsed
//     proxy_groups from the loaded .ini)
//   - hardcoded template fallback groups used by the built-in
//     Clash template (Proxy / Direct / REJECT / GLOBAL)
std::set<std::string> collectExternalGroupNames(const ExternalConfig &ext);

void refreshRulesets(RulesetConfigs &ruleset_list,
                     std::vector<RulesetContent> &rca,
                     FetchContext context = FetchContext::TrustedConfig,
                     RulesetRefreshMode mode = RulesetRefreshMode::FetchAll,
                     const std::vector<RulesetContent> *reusable_content =
                         nullptr);
bool readConf();
int simpleGenerator();
std::string convertRuleset(const std::string &content, int type);

std::string getProfile(RESPONSE_CALLBACK_ARGS);
std::string getRuleset(RESPONSE_CALLBACK_ARGS);
std::string githubProxyLatency(RESPONSE_CALLBACK_ARGS);

std::string subconverter(RESPONSE_CALLBACK_ARGS);
std::string subconverterTracked(RESPONSE_CALLBACK_ARGS);
void subconverterAsync(Request request, async_response_completion completion);
void subconverterTrackedAsync(Request request,
                              async_response_completion completion);
std::string simpleToClashR(RESPONSE_CALLBACK_ARGS);
std::string surgeConfToClash(RESPONSE_CALLBACK_ARGS);

std::string renderTemplate(RESPONSE_CALLBACK_ARGS);

std::string template_webGet(inja::Arguments &args);
std::string jinja2_webGet(const std::string &url);
std::string parseHostname(inja::Arguments &args);

#endif // INTERFACES_H_INCLUDED

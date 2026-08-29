#include "handler/github_proxy.h"

#include <cassert>

static void testJsdelivrConfigProxyAppliesToRawRuleset() {
  const std::string prefix = inferGitHubProxyPrefixFromConfigUrl(
      "https://testingcf.jsdelivr.net/gh/Aethersailor/"
      "Custom_OpenClash_Rules@refs/heads/main/cfg/Custom_Clash.ini");

  assert(prefix == "https://testingcf.jsdelivr.net/");
  assert(applyGitHubProxyToUrl(
             "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/"
             "Clash/Ruleset/Telegram.list",
             prefix) ==
         "https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/"
         "Clash/Ruleset/Telegram.list");
}

static void testTypedRulesetPrefixIsPreserved() {
  const std::string prefix = inferGitHubProxyPrefixFromConfigUrl(
      "https://gh-proxy.com/https://raw.githubusercontent.com/A/B/main/c.ini");

  assert(prefix == "https://gh-proxy.com/");
  assert(applyGitHubProxyToRulesetUrl(
             "clash-domain:https://raw.githubusercontent.com/A/B/main/"
             "rules.list",
             prefix) ==
         "clash-domain:https://gh-proxy.com/"
         "https://raw.githubusercontent.com/A/B/main/rules.list");
}

static void testDirectConfigDoesNotProxyRulesets() {
  assert(inferGitHubProxyPrefixFromConfigUrl(
             "https://raw.githubusercontent.com/A/B/main/c.ini")
             .empty());
  assert(applyGitHubProxyToRulesetUrl(
             "https://raw.githubusercontent.com/A/B/main/rules.list", "") ==
         "https://raw.githubusercontent.com/A/B/main/rules.list");
  assert(applyGitHubProxyToRulesetUrl("[]GEOSITE,telegram",
                                      "https://gh-proxy.com/") ==
         "[]GEOSITE,telegram");
}

int main() {
  testJsdelivrConfigProxyAppliesToRawRuleset();
  testTypedRulesetPrefixIsPreserved();
  testDirectConfigDoesNotProxyRulesets();
  return 0;
}

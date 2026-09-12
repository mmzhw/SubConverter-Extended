#include <cassert>
#include <set>
#include <string>

#include "config/proxygroup.h"
#include "handler/interfaces.h"
#include "handler/settings.h"

namespace {

void testCollectsFromCustomProxyGroup() {
  ExternalConfig ext;
  ProxyGroupConfig g;
  g.Name = "Proxy";
  ext.custom_proxy_group.push_back(g);
  ProxyGroupConfig d;
  d.Name = "Domestic";
  ext.custom_proxy_group.push_back(d);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("Proxy") == 1);
  assert(groups.count("Domestic") == 1);
}

// Regression: once a config declares its own groups, a name it does not
// declare must not be accepted. Accepting "Direct" produced rules whose
// target does not exist in the generated Clash config, and clients reject the
// whole file with "proxy [Direct] not found".
void testDeclaredGroupsExcludeUndeclaredFallbacks() {
  ExternalConfig ext;
  ProxyGroupConfig g;
  g.Name = "🎯 全球直连";
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("🎯 全球直连") == 1);
  assert(groups.count("Direct") == 0);
  assert(groups.count("Proxy") == 0);
  assert(groups.count("GLOBAL") == 0);
  // Clash resolves these two as rule targets without a group definition.
  assert(groups.count("DIRECT") == 1);
  assert(groups.count("REJECT") == 1);
  assert(groups.size() == 3);
}

// Clash's built-in policy names are uppercase. "Direct" is not one of them,
// and the previous fallback list used exactly that casing.
void testBuiltinPolicyNamesAreAlwaysPresent() {
  ExternalConfig ext;
  ProxyGroupConfig g;
  g.Name = "Domestic";
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("DIRECT") == 1);
  assert(groups.count("REJECT") == 1);
  assert(groups.count("Direct") == 0);
}

// With nothing declared there is no group set to validate against, so the
// historical fallback names stay acceptable and the built-ins are added.
void testFallbacksKeptWhenNothingIsDeclared() {
  ExternalConfig ext;
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("Proxy") == 1);
  assert(groups.count("Direct") == 1);
  assert(groups.count("GLOBAL") == 1);
  assert(groups.count("DIRECT") == 1);
  assert(groups.count("REJECT") == 1);
  assert(groups.size() == 5);
}

void testSkipsEmptyName() {
  ExternalConfig ext;
  ProxyGroupConfig g;  // Name defaults to empty
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  // The empty name is skipped, so this is the "nothing declared" shape and
  // the fallback names apply.
  assert(groups.size() == 5);
}

void testIsCaseSensitive() {
  ExternalConfig ext;
  ProxyGroupConfig g;
  g.Name = "proxy";  // lowercase: distinct from the fallback "Proxy"
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("proxy") == 1);
  // Declaring groups means no fallback names, so the differently-cased
  // "Proxy" is not present.
  assert(groups.count("Proxy") == 0);
  assert(groups.size() == 3);
}

// A config that happens to declare one of the fallback names keeps it, but
// still gets no *other* fallback name for free.
void testDeclaringOneFallbackNameDoesNotAddTheOthers() {
  ExternalConfig ext;
  ProxyGroupConfig g;
  g.Name = "Proxy";
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("Proxy") == 1);
  assert(groups.count("Direct") == 0);
  assert(groups.count("GLOBAL") == 0);
  assert(groups.count("DIRECT") == 1);
  assert(groups.count("REJECT") == 1);
  assert(groups.size() == 3);
}

}  // namespace

int main() {
  testCollectsFromCustomProxyGroup();
  testDeclaredGroupsExcludeUndeclaredFallbacks();
  testBuiltinPolicyNamesAreAlwaysPresent();
  testFallbacksKeptWhenNothingIsDeclared();
  testSkipsEmptyName();
  testIsCaseSensitive();
  testDeclaringOneFallbackNameDoesNotAddTheOthers();
  return 0;
}

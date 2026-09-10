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

void testIncludesFallbackGroups() {
  ExternalConfig ext;  // empty custom_proxy_group
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("Proxy") == 1);
  assert(groups.count("Direct") == 1);
  assert(groups.count("REJECT") == 1);
  assert(groups.count("GLOBAL") == 1);
}

void testDedupesAcrossCustomAndFallback() {
  ExternalConfig ext;
  ProxyGroupConfig g;
  g.Name = "Proxy";  // same as fallback
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  // Proxy appears once (deduped); Direct/REJECT/GLOBAL are still there.
  assert(groups.size() == 4);
  assert(groups.count("Proxy") == 1);
}

void testIsCaseSensitive() {
  ExternalConfig ext;
  ProxyGroupConfig g;
  g.Name = "proxy";  // lowercase
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  assert(groups.count("proxy") == 1);
  assert(groups.count("Proxy") == 1);  // fallback still present
}

void testSkipsEmptyName() {
  ExternalConfig ext;
  ProxyGroupConfig g;  // Name defaults to empty
  ext.custom_proxy_group.push_back(g);
  std::set<std::string> groups = collectExternalGroupNames(ext);
  // Should still have just the 4 fallback groups; empty Name was skipped.
  assert(groups.size() == 4);
}

}  // namespace

int main() {
  testCollectsFromCustomProxyGroup();
  testIncludesFallbackGroups();
  testDedupesAcrossCustomAndFallback();
  testIsCaseSensitive();
  testSkipsEmptyName();
  return 0;
}
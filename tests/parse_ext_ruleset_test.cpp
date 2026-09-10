#include <cassert>
#include <string>
#include <utility>
#include <vector>

#include "handler/interfaces.h"

namespace {

void testSingleEntry() {
  std::vector<std::pair<std::string, std::string>> out;
  parseExtRuleset("Proxy,https://x/p.list", out);
  assert(out.size() == 1);
  assert(out[0].first == "Proxy");
  assert(out[0].second == "https://x/p.list");
}

void testMultipleEntries() {
  std::vector<std::pair<std::string, std::string>> out;
  parseExtRuleset(
      "Proxy,https://x/p.list;Domestic,https://x/d.list", out);
  assert(out.size() == 2);
  assert(out[0].first == "Proxy");
  assert(out[0].second == "https://x/p.list");
  assert(out[1].first == "Domestic");
  assert(out[1].second == "https://x/d.list");
}

void testSkipsBlankAndComments() {
  std::vector<std::pair<std::string, std::string>> out;
  parseExtRuleset(
      ";Proxy,https://x/p.list;# comment line\nDomestic,https://x/d.list;",
      out);
  assert(out.size() == 2);
  assert(out[0].first == "Proxy");
  assert(out[1].first == "Domestic");
}

void testEmpty() {
  std::vector<std::pair<std::string, std::string>> out;
  parseExtRuleset("", out);
  assert(out.empty());
}

void testNoCommaIgnored() {
  // Defensive: a token without a comma is skipped (not crashed).
  std::vector<std::pair<std::string, std::string>> out;
  parseExtRuleset("ProxyOnly;Proxy,https://x/p.list", out);
  assert(out.size() == 1);
  assert(out[0].first == "Proxy");
}

void testClearsOutputFirst() {
  // If the output vector has prior contents, helper must clear it
  // (consistent with the contract that out reflects only this call).
  std::vector<std::pair<std::string, std::string>> out;
  out.emplace_back("old", "value");
  parseExtRuleset("Proxy,https://x/p.list", out);
  assert(out.size() == 1);
  assert(out[0].first == "Proxy");
}

}  // namespace

int main() {
  testSingleEntry();
  testMultipleEntries();
  testSkipsBlankAndComments();
  testEmpty();
  testNoCommaIgnored();
  testClearsOutputFirst();
  return 0;
}

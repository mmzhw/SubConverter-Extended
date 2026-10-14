#ifdef NDEBUG
#undef NDEBUG
#endif
#include <cassert>
#include <iostream>
#include <string>

#include "config/ruleset_comment.h"

int main() {
  struct Case {
    const char *input;
    const char *expected;
    bool raw = false;
  };
  const Case cases[] = {
      {"", ""},
      {"  ", "  "},
      {"// comment", ""},
      {" \t// comment", ""},
      {"DOMAIN,example.com // comment", "DOMAIN,example.com"},
      {"DOMAIN-SUFFIX,example.com,Proxy\t// comment", "DOMAIN-SUFFIX,example.com,Proxy"},
      {"IP-CIDR,192.0.2.0/24,no-resolve // comment", "IP-CIDR,192.0.2.0/24,no-resolve"},
      {"DOMAIN,example.com//literal", "DOMAIN,example.com//literal"},
      {"DOMAIN-REGEX,^https://example.com/.*", "DOMAIN-REGEX,^https://example.com/.*"},
      {"DOMAIN-REGEX,^a // b$", "DOMAIN-REGEX,^a // b$"},
      {"URL-REGEX,^https://example.com/.*", "URL-REGEX,^https://example.com/.*"},
      {"PROCESS-PATH,/tmp//app", "PROCESS-PATH,/tmp//app"},
      {"AND,((DOMAIN-REGEX,^a // b$),(NETWORK,TCP))", "AND,((DOMAIN-REGEX,^a // b$),(NETWORK,TCP))"},
      {"DOMAIN,\"a // b\",Proxy", "DOMAIN,\"a // b\",Proxy"},
      {"DOMAIN,'a // b',Proxy // comment", "DOMAIN,'a // b',Proxy"},
      {"DOMAIN,a \\// literal", "DOMAIN,a \\// literal"},
      {"DOMAIN,example.com,Proxy // first // second", "DOMAIN,example.com,Proxy"},
      {"https://example.com/a//b", "https://example.com/a//b", true},
      {"example.com // comment", "example.com", true},
      {"example.com\t// comment", "example.com", true},
      {"'a // b' // comment", "'a // b'", true},
      {"example.com//literal // comment", "example.com//literal", true},
  };
  for (const Case &test : cases) {
    std::string actual = test.input;
    stripRulesetComment(actual, test.raw);
    if (actual != test.expected) {
      std::cerr << "comment parsing changed: " << test.input << '\n';
      return 1;
    }
    stripRulesetComment(actual, test.raw);
    assert(actual == test.expected);
  }
  std::cout << "ruleset comment: 22 cases passed\n";
}

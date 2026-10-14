#include <stdexcept>

#include "parser/mihomo_bridge.h"
#include "server/webserver.h"

// Pure helper tests link the runtime without main.cpp or the native Go bridge.
// Real subscription conversion is exercised by the service integration tests.
WebServer webServer;

namespace mihomo {

std::vector<ProxyNode> parseSubscription(const std::string &) {
  throw std::runtime_error("Mihomo parsing is unavailable in runtime helper tests");
}

bool isMihomoParserAvailable() { return false; }

AgeRecipient resolveAgeRecipient(const std::string &) {
  throw std::runtime_error("Age recipient resolution is unavailable in runtime helper tests");
}

std::string encryptAgeArmored(const std::string &, const std::string &) {
  throw std::runtime_error("Age encryption is unavailable in runtime helper tests");
}

} // namespace mihomo

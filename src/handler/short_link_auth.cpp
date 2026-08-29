#include "handler/short_link_auth.h"

#include <cstdlib>

#include "utils/string.h"

namespace {

constexpr const char *kPasswordEnv = "SUBCONVERTER_SHORT_LINK_PASSWORD";
constexpr const char *kPasswordHeader = "X-Short-Link-Password";

bool constantTimeEquals(const std::string &left, const std::string &right) {
  if (left.size() != right.size())
    return false;
  unsigned char diff = 0;
  for (size_t i = 0; i < left.size(); ++i)
    diff |= static_cast<unsigned char>(left[i] ^ right[i]);
  return diff == 0;
}

std::string bearerToken(const std::string &value) {
  constexpr const char *prefix = "Bearer ";
  if (!startsWith(value, prefix))
    return "";
  return value.substr(7);
}

std::string suppliedPassword(const Request &request) {
  auto header = request.headers.find(kPasswordHeader);
  if (header != request.headers.end())
    return header->second;

  auto authorization = request.headers.find("Authorization");
  if (authorization != request.headers.end())
    return bearerToken(authorization->second);

  auto query = request.argument.find("password");
  if (query != request.argument.end())
    return query->second;

  return "";
}

} // namespace

std::string shortLinkAdminPassword() {
  const char *value = std::getenv(kPasswordEnv);
  return value ? trimWhitespace(value, true, true) : "";
}

bool shortLinkAdminPasswordConfigured() {
  return !shortLinkAdminPassword().empty();
}

bool shortLinkAdminAuthorized(const Request &request) {
  const std::string expected = shortLinkAdminPassword();
  if (expected.empty())
    return true;
  return constantTimeEquals(suppliedPassword(request), expected);
}

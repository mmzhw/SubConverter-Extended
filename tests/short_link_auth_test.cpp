#include <cstdlib>
#include <stdexcept>

#include "handler/short_link_auth.h"
#include "server/webserver.h"

namespace {

void require(bool condition, const char *message) {
  if (!condition)
    throw std::runtime_error(message);
}

void setEnvironment(const char *name, const char *value) {
#ifdef _WIN32
  _putenv_s(name, value);
#else
  setenv(name, value, 1);
#endif
}

void clearEnvironment(const char *name) {
#ifdef _WIN32
  _putenv_s(name, "");
#else
  unsetenv(name);
#endif
}

} // namespace

int main() {
  clearEnvironment("SUBCONVERTER_SHORT_LINK_PASSWORD");

  Request request;
  require(shortLinkAdminAuthorized(request),
          "unconfigured short-link password should not block local/dev use");

  setEnvironment("SUBCONVERTER_SHORT_LINK_PASSWORD", "admin-token");
  require(!shortLinkAdminAuthorized(request),
          "configured short-link password must reject missing credentials");

  request.headers["X-Short-Link-Password"] = "wrong";
  require(!shortLinkAdminAuthorized(request),
          "configured short-link password accepted a wrong header");

  request.headers["X-Short-Link-Password"] = "admin-token";
  require(shortLinkAdminAuthorized(request),
          "configured short-link password rejected the matching header");

  request.headers.erase("X-Short-Link-Password");
  request.headers["Authorization"] = "Bearer admin-token";
  require(shortLinkAdminAuthorized(request),
          "configured short-link password rejected bearer credentials");

  clearEnvironment("SUBCONVERTER_SHORT_LINK_PASSWORD");
  return 0;
}

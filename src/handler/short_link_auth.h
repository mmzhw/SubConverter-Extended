#ifndef SHORT_LINK_AUTH_H_INCLUDED
#define SHORT_LINK_AUTH_H_INCLUDED

#include <string>

#include "server/webserver.h"

std::string shortLinkAdminPassword();
bool shortLinkAdminPasswordConfigured();
bool shortLinkAdminAuthorized(const Request &request);

#endif // SHORT_LINK_AUTH_H_INCLUDED

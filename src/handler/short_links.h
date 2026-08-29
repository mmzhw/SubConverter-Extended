#ifndef SHORT_LINKS_H_INCLUDED
#define SHORT_LINKS_H_INCLUDED

#include <string>

#include "server/webserver.h"

std::string createShortLinkEndpoint(RESPONSE_CALLBACK_ARGS);
std::string listShortLinksEndpoint(RESPONSE_CALLBACK_ARGS);
std::string deleteShortLinkEndpoint(RESPONSE_CALLBACK_ARGS);
std::string resolveShortLinkEndpoint(RESPONSE_CALLBACK_ARGS);

#endif // SHORT_LINKS_H_INCLUDED

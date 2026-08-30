#ifndef DNS_TEMPLATES_H_INCLUDED
#define DNS_TEMPLATES_H_INCLUDED

#include <string>

#include "server/webserver.h"

struct DnsTemplateSaveResult {
  bool ok = false;
  std::string id;
  std::string content;
  std::string error;
};

std::string defaultDnsTemplate();
std::string loadDnsTemplate(const std::string &id);
DnsTemplateSaveResult saveDnsTemplate(const std::string &content);
std::string dnsTemplateEndpoint(RESPONSE_CALLBACK_ARGS);

#endif // DNS_TEMPLATES_H_INCLUDED

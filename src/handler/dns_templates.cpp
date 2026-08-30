#include "handler/dns_templates.h"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <filesystem>
#include <string>
#include <vector>

#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>
#include <yaml-cpp/yaml.h>

#include "handler/settings.h"
#include "handler/settings_view.h"
#include "utils/file.h"
#include "utils/md5/md5_interface.h"
#include "utils/string.h"

namespace {

constexpr size_t kMaxDnsTemplateBytes = 64 * 1024;
constexpr size_t kDefaultMaxDnsTemplateEntries = 500;

std::string dnsTemplateDir() {
  const char *configured = std::getenv("SUBCONVERTER_DNS_TEMPLATES_DIR");
  if (configured && configured[0] != '\0')
    return configured;
  return "dns-templates";
}

std::string dnsTemplatePath(const std::string &id) {
  return (std::filesystem::path(dnsTemplateDir()) / (id + ".yml")).string();
}

bool validDnsTemplateId(const std::string &id) {
  return id.size() == 16 &&
         std::all_of(id.begin(), id.end(), [](unsigned char ch) {
           return std::isxdigit(ch) != 0;
         });
}

size_t configuredMaxEntries() {
  const char *configured =
      std::getenv("SUBCONVERTER_DNS_TEMPLATE_MAX_ENTRIES");
  if (!configured || configured[0] == '\0')
    return kDefaultMaxDnsTemplateEntries;
  char *end = nullptr;
  const unsigned long parsed = std::strtoul(configured, &end, 10);
  if (end == configured || *end != '\0' || parsed == 0)
    return kDefaultMaxDnsTemplateEntries;
  return static_cast<size_t>(parsed);
}

void pruneDnsTemplates() {
  const size_t max_entries = configuredMaxEntries();
  std::error_code error;
  const std::filesystem::path directory = dnsTemplateDir();
  if (!std::filesystem::is_directory(directory, error))
    return;

  std::vector<std::pair<std::filesystem::path,
                        std::filesystem::file_time_type>>
      entries;
  for (const std::filesystem::directory_entry &entry :
       std::filesystem::directory_iterator(directory, error)) {
    if (error)
      return;
    if (!entry.is_regular_file(error) || error)
      continue;
    const std::string stem = entry.path().stem().string();
    if (entry.path().extension() != ".yml" || !validDnsTemplateId(stem))
      continue;
    entries.emplace_back(entry.path(), entry.last_write_time(error));
    if (error)
      entries.back().second = std::filesystem::file_time_type::min();
  }
  if (entries.size() <= max_entries)
    return;

  std::sort(entries.begin(), entries.end(),
            [](const auto &left, const auto &right) {
              if (left.second != right.second)
                return left.second < right.second;
              return left.first.string() < right.first.string();
            });
  const size_t remove_count = entries.size() - max_entries;
  for (size_t index = 0; index < remove_count; ++index)
    std::filesystem::remove(entries[index].first, error);
}

std::string normalizeContent(std::string content) {
  content = trimWhitespace(content, true, true);
  if (!content.empty() && content.back() != '\n')
    content.push_back('\n');
  return content;
}

bool hasControlCharacters(const std::string &content) {
  return std::any_of(content.begin(), content.end(), [](unsigned char ch) {
    return ch < 0x20 && ch != '\n' && ch != '\r' && ch != '\t';
  });
}

bool validateDnsTemplateContent(const std::string &content,
                                std::string &error) {
  if (content.empty()) {
    error = "empty-content";
    return false;
  }
  if (content.size() > kMaxDnsTemplateBytes) {
    error = "content-too-large";
    return false;
  }
  if (hasControlCharacters(content)) {
    error = "invalid-character";
    return false;
  }
  try {
    YAML::Node root = YAML::Load(content);
    if (!root.IsMap() || !root["dns"].IsMap()) {
      error = "invalid-dns-yaml";
      return false;
    }
  } catch (...) {
    error = "invalid-yaml";
    return false;
  }
  return true;
}

std::string readClashBaseTemplate() {
  const Settings &settings = effectiveSettings();
  std::string content = fileGet(settings.clashBase, false);
  if (content.empty())
    content = fileGet("base/all_base.tpl", false);
  if (content.empty())
    content = fileGet("base/base/all_base.tpl", false);
  return content;
}

std::string extractDefaultDnsTemplate(const std::string &base_template) {
  const std::string dns_marker =
      "{% if default(request.clash.dns, \"\") == \"1\" %}";
  size_t start = base_template.find(dns_marker);
  if (start == std::string::npos)
    return "";
  start = base_template.find('\n', start);
  if (start == std::string::npos)
    return "";
  ++start;

  const size_t first_end = base_template.find("{% endif %}", start);
  if (first_end == std::string::npos)
    return "";
  const size_t custom_else = base_template.find("{% else %}", start);
  if (custom_else != std::string::npos && custom_else < first_end) {
    start = base_template.find('\n', custom_else);
    if (start == std::string::npos)
      return "";
    ++start;
  }

  const size_t end = base_template.find("{% endif %}", start);
  if (end == std::string::npos)
    return "";
  return normalizeContent(base_template.substr(start, end - start));
}

std::string jsonError(Response &response, int status,
                      const std::string &error) {
  response.status_code = status;
  response.content_type = "application/json; charset=utf-8";
  response.headers["Cache-Control"] = "private, no-store";
  rapidjson::StringBuffer buffer;
  rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
  writer.StartObject();
  writer.Key("error");
  writer.String(error.c_str());
  writer.EndObject();
  return buffer.GetString();
}

std::string jsonTemplate(Response &response, const std::string &content,
                         const std::string &id = "") {
  response.status_code = 200;
  response.content_type = "application/json; charset=utf-8";
  response.headers["Cache-Control"] = "private, no-store";
  rapidjson::StringBuffer buffer;
  rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
  writer.StartObject();
  if (!id.empty()) {
    writer.Key("id");
    writer.String(id.c_str());
  }
  writer.Key("content");
  writer.String(content.c_str());
  writer.EndObject();
  return buffer.GetString();
}

} // namespace

std::string defaultDnsTemplate() {
  std::string content = extractDefaultDnsTemplate(readClashBaseTemplate());
  if (!content.empty())
    return content;
  return "dns:\n"
         "  enable: true\n"
         "  nameserver:\n"
         "  - https://dns.alidns.com/dns-query#h3=true\n"
         "  - https://doh.pub/dns-query\n"
         "  direct-nameserver:\n"
         "  - https://dns.alidns.com/dns-query#h3=true\n"
         "  - https://doh.pub/dns-query\n"
         "  proxy-server-nameserver:\n"
         "  - https://doh.pub/dns-query\n"
         "  - https://dns.alidns.com/dns-query#h3=true\n"
         "  default-nameserver:\n"
         "  - tls://119.29.29.29\n"
         "  - tls://223.5.5.5\n";
}

std::string loadDnsTemplate(const std::string &id) {
  if (!validDnsTemplateId(id))
    return "";
  return fileGet(dnsTemplatePath(id), false);
}

DnsTemplateSaveResult saveDnsTemplate(const std::string &content) {
  DnsTemplateSaveResult result;
  result.content = normalizeContent(content);
  if (!validateDnsTemplateContent(result.content, result.error))
    return result;

  result.id = getMD5(result.content).substr(0, 16);
  std::error_code error;
  std::filesystem::create_directories(dnsTemplateDir(), error);
  if (error) {
    result.error = "storage-unavailable";
    return result;
  }
  if (fileCommitFailed(fileWrite(dnsTemplatePath(result.id), result.content,
                                 true))) {
    result.error = "storage-unavailable";
    return result;
  }
  pruneDnsTemplates();

  result.ok = true;
  return result;
}

std::string dnsTemplateEndpoint(RESPONSE_CALLBACK_ARGS) {
  if (request.method == "GET") {
    const auto id_iter = request.argument.find("id");
    const std::string id =
        id_iter == request.argument.end() ? "" : id_iter->second;
    if (id.empty())
      return jsonTemplate(response, defaultDnsTemplate());
    const std::string content = loadDnsTemplate(id);
    if (content.empty())
      return jsonError(response, 404, "not-found");
    return jsonTemplate(response, content, id);
  }

  if (request.method != "POST")
    return jsonError(response, 405, "method-not-allowed");

  rapidjson::Document document;
  document.Parse(request.postdata.c_str());
  if (!document.IsObject() || !document.HasMember("content") ||
      !document["content"].IsString())
    return jsonError(response, 400, "invalid-request");

  DnsTemplateSaveResult saved =
      saveDnsTemplate(document["content"].GetString());
  if (!saved.ok)
    return jsonError(response,
                     saved.error == "storage-unavailable" ? 503 : 400,
                     saved.error);
  return jsonTemplate(response, saved.content, saved.id);
}

#include "handler/short_link_storage.h"

#include <algorithm>
#include <chrono>
#include <cstdlib>
#include <mutex>
#include <random>
#include <unordered_map>

#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>

#include "utils/file.h"

namespace {

constexpr size_t kMaxUrlLength = 256 * 1024;
constexpr size_t kMaxNameLength = 160;
constexpr size_t kCodeLength = 8;
constexpr const char *kCodeAlphabet =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

std::mutex storage_mutex;
std::unordered_map<std::string, ShortLinkRecord> records;
bool loaded = false;
std::string storage_path_override;

std::string storagePath() {
  if (!storage_path_override.empty())
    return storage_path_override;
  const char *configured_path = std::getenv("SUBCONVERTER_SHORT_LINKS_FILE");
  if (configured_path && configured_path[0] != '\0')
    return configured_path;
  return "short-links.json";
}

uint64_t valueUint64(const rapidjson::Value &value) {
  if (value.IsUint64())
    return value.GetUint64();
  if (value.IsInt64() && value.GetInt64() >= 0)
    return static_cast<uint64_t>(value.GetInt64());
  return 0;
}

bool hasQueryParam(const std::string &query, const std::string &name) {
  size_t begin = 0;
  while (begin <= query.size()) {
    const size_t end = query.find('&', begin);
    const size_t equals = query.find('=', begin);
    const size_t part_end = end == std::string::npos ? query.size() : end;
    if (equals != std::string::npos && equals < part_end &&
        query.substr(begin, equals - begin) == name)
      return true;
    if (end == std::string::npos)
      break;
    begin = end + 1;
  }
  return false;
}

bool extractSubQuery(const std::string &url, std::string *query = nullptr) {
  if (url.empty() || url.size() > kMaxUrlLength)
    return false;
  const size_t query_pos = url.find('?');
  if (query_pos == std::string::npos || query_pos + 1 >= url.size())
    return false;

  const std::string before_query = url.substr(0, query_pos);
  std::string path = before_query;
  const size_t scheme = before_query.find("://");
  if (scheme != std::string::npos) {
    const size_t path_pos = before_query.find('/', scheme + 3);
    if (path_pos == std::string::npos)
      return false;
    path = before_query.substr(path_pos);
  }
  if (path != "/sub")
    return false;

  const std::string current_query = url.substr(query_pos + 1);
  if (!hasQueryParam(current_query, "target") ||
      !hasQueryParam(current_query, "url"))
    return false;
  if (query)
    *query = current_query;
  return true;
}

bool validCode(const std::string &code) {
  return code.size() == kCodeLength &&
         std::all_of(code.begin(), code.end(), [](char ch) {
           const size_t alphabet_length =
               std::char_traits<char>::length(kCodeAlphabet);
           return std::find(kCodeAlphabet, kCodeAlphabet + alphabet_length,
                            ch) != kCodeAlphabet + alphabet_length;
         });
}

std::string trimName(std::string name) {
  if (name.size() <= kMaxNameLength)
    return name;
  name.resize(kMaxNameLength);
  return name;
}

std::string makeCodeLocked() {
  static std::mt19937_64 rng([] {
    std::random_device random;
    const auto now = static_cast<uint64_t>(
        std::chrono::high_resolution_clock::now().time_since_epoch().count());
    return (static_cast<uint64_t>(random()) << 32) ^ random() ^ now;
  }());
  std::uniform_int_distribution<size_t> distribution(
      0, std::char_traits<char>::length(kCodeAlphabet) - 1);

  for (int attempt = 0; attempt < 128; ++attempt) {
    std::string code;
    code.reserve(kCodeLength);
    for (size_t index = 0; index < kCodeLength; ++index)
      code.push_back(kCodeAlphabet[distribution(rng)]);
    if (records.find(code) == records.end())
      return code;
  }
  return "";
}

void loadLocked() {
  if (loaded)
    return;
  loaded = true;
  records.clear();

  rapidjson::Document document;
  const std::string raw = fileGet(storagePath(), true);
  if (raw.empty())
    return;
  document.Parse(raw.c_str());
  if (!document.IsObject())
    return;

  for (auto iter = document.MemberBegin(); iter != document.MemberEnd();
       ++iter) {
    const std::string code = iter->name.GetString();
    const rapidjson::Value &value = iter->value;
    if (!validCode(code) || !value.IsObject() || !value.HasMember("url") ||
        !value["url"].IsString())
      continue;
    const std::string url = value["url"].GetString();
    if (!extractSubQuery(url))
      continue;
    ShortLinkRecord record;
    record.code = code;
    record.url = url;
    if (value.HasMember("name") && value["name"].IsString())
      record.name = trimName(value["name"].GetString());
    if (value.HasMember("created_at"))
      record.created_at = valueUint64(value["created_at"]);
    if (value.HasMember("last_access_at"))
      record.last_access_at = valueUint64(value["last_access_at"]);
    records[code] = std::move(record);
  }
}

bool saveLocked() {
  rapidjson::StringBuffer buffer;
  rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
  writer.StartObject();
  for (const auto &[code, record] : records) {
    writer.Key(code.c_str());
    writer.StartObject();
    writer.Key("url");
    writer.String(record.url.c_str());
    writer.Key("name");
    writer.String(record.name.c_str());
    writer.Key("created_at");
    writer.Uint64(record.created_at);
    writer.Key("last_access_at");
    writer.Uint64(record.last_access_at);
    writer.EndObject();
  }
  writer.EndObject();
  return !fileCommitFailed(fileWrite(storagePath(), buffer.GetString(), true));
}

} // namespace

bool shortLinkSubTarget(const std::string &url, std::string &target) {
  std::string query;
  if (!extractSubQuery(url, &query))
    return false;
  target = "/sub?" + query;
  return true;
}

ShortLinkCreateResult createShortLink(const std::string &url,
                                      const std::string &name,
                                      uint64_t now_ms) {
  ShortLinkCreateResult result;
  if (!extractSubQuery(url)) {
    result.error = "invalid-url";
    return result;
  }

  std::lock_guard<std::mutex> lock(storage_mutex);
  loadLocked();
  for (const auto &[code, record] : records) {
    if (record.url == url) {
      result.ok = true;
      result.code = code;
      result.path = "/s?id=" + code;
      return result;
    }
  }

  const std::string code = makeCodeLocked();
  if (code.empty()) {
    result.error = "code-exhausted";
    return result;
  }

  ShortLinkRecord record;
  record.code = code;
  record.url = url;
  record.name = trimName(name);
  record.created_at = now_ms;
  record.last_access_at = 0;
  records[code] = std::move(record);
  if (!saveLocked()) {
    records.erase(code);
    result.error = "storage-unavailable";
    return result;
  }

  result.ok = true;
  result.code = code;
  result.path = "/s?id=" + code;
  return result;
}

ShortLinkResolveResult resolveShortLink(const std::string &code,
                                        uint64_t now_ms) {
  ShortLinkResolveResult result;
  if (!validCode(code)) {
    result.error = "not-found";
    return result;
  }

  std::lock_guard<std::mutex> lock(storage_mutex);
  loadLocked();
  auto iter = records.find(code);
  if (iter == records.end()) {
    result.error = "not-found";
    return result;
  }
  iter->second.last_access_at = now_ms;
  (void)saveLocked();
  result.ok = true;
  result.record = iter->second;
  return result;
}

#ifdef FILE_IO_TESTING
void setShortLinkStoragePathForTests(const std::string &path) {
  std::lock_guard<std::mutex> lock(storage_mutex);
  storage_path_override = path;
  loaded = false;
  records.clear();
}

void clearShortLinkMemoryForTests() {
  std::lock_guard<std::mutex> lock(storage_mutex);
  loaded = false;
  records.clear();
}
#endif

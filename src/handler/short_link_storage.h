#ifndef SHORT_LINK_STORAGE_H_INCLUDED
#define SHORT_LINK_STORAGE_H_INCLUDED

#include <cstdint>
#include <string>

struct ShortLinkRecord {
  std::string code;
  std::string url;
  std::string name;
  uint64_t created_at = 0;
  uint64_t last_access_at = 0;
};

struct ShortLinkCreateResult {
  bool ok = false;
  std::string code;
  std::string path;
  std::string error;
};

struct ShortLinkResolveResult {
  bool ok = false;
  ShortLinkRecord record;
  std::string error;
};

ShortLinkCreateResult createShortLink(const std::string &url,
                                      const std::string &name,
                                      uint64_t now_ms);
ShortLinkResolveResult resolveShortLink(const std::string &code,
                                        uint64_t now_ms);
bool shortLinkSubTarget(const std::string &url, std::string &target);

#ifdef FILE_IO_TESTING
void setShortLinkStoragePathForTests(const std::string &path);
void clearShortLinkMemoryForTests();
#endif

#endif // SHORT_LINK_STORAGE_H_INCLUDED

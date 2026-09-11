#ifndef SHORT_LINK_STORAGE_H_INCLUDED
#define SHORT_LINK_STORAGE_H_INCLUDED

#include <cstdint>
#include <cstddef>
#include <string>
#include <vector>

struct ShortLinkRecord {
  std::string code;
  std::string url;
  std::string name;
  uint64_t created_at = 0;
  uint64_t last_access_at = 0;
  // Bumped every time the target URL (or name) is replaced in place.
  // Distinct from last_access_at, which resolveShortLink refreshes on
  // every client refresh, so it cannot serve as a "last modified" stamp.
  uint64_t updated_at = 0;
};

struct ShortLinkCreateResult {
  bool ok = false;
  std::string code;
  std::string path;
  std::string error;
};

struct ShortLinkUpdateResult {
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

// Replaces the target URL of an existing short link in place, keeping
// the code (and created_at / last_access_at) stable. `name` is only
// written when has_name is true. Errors: "not-found" (unknown or
// malformed code), "invalid-url" (url is not a /sub?target=..&url=..
// address), "storage-unavailable" (persist failed; memory rolled back).
ShortLinkUpdateResult updateShortLink(const std::string &code,
                                      const std::string &url,
                                      const std::string &name,
                                      bool has_name,
                                      uint64_t now_ms);
ShortLinkResolveResult resolveShortLink(const std::string &code,
                                        uint64_t now_ms);
std::vector<ShortLinkRecord> listShortLinks();
bool deleteShortLink(const std::string &code);
void pruneShortLinks(size_t max_entries);
bool shortLinkSubTarget(const std::string &url, std::string &target);

#ifdef FILE_IO_TESTING
void setShortLinkStoragePathForTests(const std::string &path);
void clearShortLinkMemoryForTests();
#endif

#endif // SHORT_LINK_STORAGE_H_INCLUDED

#include <filesystem>
#include <cstdlib>
#include <stdexcept>
#include <string>

#include "handler/short_link_storage.h"
#include "utils/file.h"

namespace {

void require(bool condition, const char *message) {
  if (!condition)
    throw std::runtime_error(message);
}

struct TemporaryWorkingDirectory {
  std::filesystem::path original = std::filesystem::current_path();
  std::filesystem::path path =
      original / "build" / "short-link-storage-test-runtime";

  TemporaryWorkingDirectory() {
    std::error_code error;
    std::filesystem::remove_all(path, error);
    std::filesystem::create_directories(path);
    std::filesystem::current_path(path);
  }

  ~TemporaryWorkingDirectory() {
    std::filesystem::current_path(original);
    std::error_code error;
    std::filesystem::remove_all(path, error);
  }
};

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
  TemporaryWorkingDirectory temporary;
  clearEnvironment("SUBCONVERTER_SHORT_LINKS_FILE");
  setShortLinkStoragePathForTests("short-links.json");

  const std::string url =
      "http://127.0.0.1:8080/sub?target=clash&url=https%3A%2F%2Fsub.example.com%2Fa";
  ShortLinkCreateResult created = createShortLink(url, "Test", 1000);
  require(created.ok, "valid /sub URL was not shortened");
  require(created.code.size() == 8, "short code length changed");
  require(created.path == "/s?id=" + created.code, "short path changed");
  require(fileExist("short-links.json"), "short link store was not written");

  ShortLinkResolveResult resolved = resolveShortLink(created.code, 2000);
  require(resolved.ok, "created code could not be resolved");
  require(resolved.record.url == url, "resolved URL changed");
  require(resolved.record.name == "Test", "resolved name changed");
  require(resolved.record.created_at == 1000, "created timestamp changed");
  require(resolved.record.last_access_at == 2000,
          "last access timestamp was not updated");

  ShortLinkCreateResult duplicate = createShortLink(url, "Test again", 3000);
  require(duplicate.ok, "duplicate URL was not accepted");
  require(duplicate.code == created.code, "duplicate URL did not reuse code");

  std::vector<ShortLinkRecord> listed = listShortLinks();
  require(listed.size() == 1, "created short link was not listed");
  require(listed[0].code == created.code, "listed code changed");
  require(listed[0].name == "Test", "listed name changed");
  require(listed[0].last_access_at == 2000, "listed last access was not kept");

  require(deleteShortLink(created.code), "created code was not deleted");
  ShortLinkResolveResult deleted = resolveShortLink(created.code, 3500);
  require(!deleted.ok && deleted.error == "not-found",
          "deleted code still resolved");
  require(listShortLinks().empty(), "deleted code remained in list");

  ShortLinkCreateResult first =
      createShortLink(url + "&rename=first", "First", 4100);
  ShortLinkCreateResult second =
      createShortLink(url + "&rename=second", "Second", 4200);
  ShortLinkCreateResult third =
      createShortLink(url + "&rename=third", "Third", 4300);
  require(first.ok && second.ok && third.ok, "prune fixture links failed");
  (void)resolveShortLink(first.code, 9000);
  pruneShortLinks(2);
  ShortLinkResolveResult old_missing = resolveShortLink(second.code, 9100);
  require(!old_missing.ok && old_missing.error == "not-found",
          "least recently used short link was not pruned");
  require(resolveShortLink(first.code, 9200).ok,
          "recently accessed short link was pruned");
  require(resolveShortLink(third.code, 9300).ok,
          "newest short link was pruned");
  require(listShortLinks().size() == 2, "pruned list size is wrong");

  clearShortLinkMemoryForTests();
  ShortLinkResolveResult reloaded = resolveShortLink(first.code, 4000);
  require(reloaded.ok, "stored code was not reloaded from disk");
  require(reloaded.record.url == url + "&rename=first", "reloaded URL changed");

  ShortLinkCreateResult invalid =
      createShortLink("http://127.0.0.1:8080/version?target=clash", "Bad",
                      5000);
  require(!invalid.ok && invalid.error == "invalid-url",
          "non-/sub URL was shortened");

  ShortLinkResolveResult missing = resolveShortLink("missing1", 6000);
  require(!missing.ok && missing.error == "not-found",
          "missing code did not report not-found");

  clearShortLinkMemoryForTests();
  std::filesystem::create_directories("persisted");
  setShortLinkStoragePathForTests("");
  setEnvironment("SUBCONVERTER_SHORT_LINKS_FILE", "persisted/links.json");
  ShortLinkCreateResult configured =
      createShortLink(url + "&emoji=true", "Configured", 7000);
  require(configured.ok, "env-configured storage path was not accepted");
  require(fileExist("persisted/links.json"),
          "env-configured storage path was not written");
  clearEnvironment("SUBCONVERTER_SHORT_LINKS_FILE");
  return 0;
}

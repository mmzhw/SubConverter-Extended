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

  // updated_at starts equal to created_at on create.
  {
    ShortLinkResolveResult fresh = resolveShortLink(created.code, 3100);
    require(fresh.ok, "fresh record could not be resolved");
    require(fresh.record.updated_at == 1000,
            "updated_at did not start at created_at");
  }

  // In-place update keeps the code and timestamps, replaces the URL.
  const std::string updated_url =
      "http://127.0.0.1:8080/sub?target=clash&url=https%3A%2F%2Fsub.example.com"
      "%2Fb&inline_rules=Proxy%3ADOMAIN-SUFFIX%2Cfoo.com";
  ShortLinkUpdateResult updated =
      updateShortLink(created.code, updated_url, "", false, 3300);
  require(updated.ok, "in-place update was rejected");
  require(updated.code == created.code, "update changed the code");
  require(updated.path == "/s?id=" + created.code, "update path changed");
  {
    ShortLinkResolveResult after = resolveShortLink(created.code, 3400);
    require(after.ok, "updated code stopped resolving");
    require(after.record.url == updated_url, "updated URL was not stored");
    require(after.record.name == "Test", "update clobbered the name");
    require(after.record.created_at == 1000, "update changed created_at");
    require(after.record.updated_at == 3300, "update did not stamp updated_at");
    require(after.record.last_access_at == 3400,
            "update changed last_access_at semantics");
  }

  // Name is only replaced when explicitly supplied.
  {
    ShortLinkUpdateResult renamed =
        updateShortLink(created.code, url, "Renamed", true, 3500);
    require(renamed.ok, "update with name was rejected");
    ShortLinkResolveResult after = resolveShortLink(created.code, 3600);
    require(after.ok && after.record.name == "Renamed",
            "explicit name was not applied");
    require(after.record.url == url, "update with name did not set the URL");
    // Restore the URL + name for the assertions further down.
    (void)updateShortLink(created.code, url, "Test", true, 3700);
  }

  // Unknown / malformed codes and invalid URLs are rejected without
  // touching the stored record.
  {
    ShortLinkUpdateResult unknown =
        updateShortLink("zzzzzzzz", updated_url, "", false, 3800);
    require(!unknown.ok && unknown.error == "not-found",
            "unknown code did not report not-found");
    ShortLinkUpdateResult malformed =
        updateShortLink("short", updated_url, "", false, 3800);
    require(!malformed.ok && malformed.error == "not-found",
            "malformed code did not report not-found");
    ShortLinkUpdateResult bad_url = updateShortLink(
        created.code, "http://127.0.0.1:8080/version?target=clash", "", false,
        3900);
    require(!bad_url.ok && bad_url.error == "invalid-url",
            "non-/sub URL was accepted by update");
    ShortLinkResolveResult unchanged = resolveShortLink(created.code, 3950);
    require(unchanged.ok && unchanged.record.url == url,
            "rejected update modified the stored URL");
    require(unchanged.record.updated_at == 3700,
            "rejected update modified updated_at");
  }

  std::vector<ShortLinkRecord> listed = listShortLinks();
  require(listed.size() == 1, "created short link was not listed");
  require(listed[0].code == created.code, "listed code changed");
  require(listed[0].name == "Test", "listed name changed");
  // The update block above resolved the code several times, so the last
  // access stamp is the most recent of those resolves.
  require(listed[0].last_access_at == 3950,
          "listed last access was not kept");

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
  require(reloaded.record.updated_at == 4100,
          "reloaded updated_at did not survive the round-trip");

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

  // A store written before updated_at existed must still load: every
  // record keeps working and updated_at reads back as 0.
  {
    const std::string legacy_path = "legacy-short-links.json";
    (void)fileWrite(legacy_path,
                    "{\"legacy01\":{\"url\":\"" + url +
                        "\",\"name\":\"Legacy\",\"created_at\":8100,"
                        "\"last_access_at\":8200}}",
                    true);
    setShortLinkStoragePathForTests(legacy_path);
    ShortLinkResolveResult legacy = resolveShortLink("legacy01", 8300);
    require(legacy.ok, "legacy record without updated_at failed to load");
    require(legacy.record.url == url, "legacy record URL changed");
    require(legacy.record.name == "Legacy", "legacy record name changed");
    require(legacy.record.created_at == 8100,
            "legacy record created_at changed");
    require(legacy.record.updated_at == 0,
            "missing updated_at did not default to 0");
    // The record is still updatable, which backfills updated_at.
    ShortLinkUpdateResult migrated =
        updateShortLink("legacy01", url + "&emoji=true", "", false, 8400);
    require(migrated.ok, "legacy record could not be updated");
    ShortLinkResolveResult after = resolveShortLink("legacy01", 8500);
    require(after.ok && after.record.updated_at == 8400,
            "legacy record did not gain updated_at on update");
    setShortLinkStoragePathForTests("");
    clearShortLinkMemoryForTests();
  }

  return 0;
}

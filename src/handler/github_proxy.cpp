#include "github_proxy.h"

#include <algorithm>
#include <cctype>

#include "utils/urlencode.h"

namespace {

struct ParsedUrl {
  std::string scheme;
  std::string authority;
  std::string host;
  std::string path;
  size_t path_start = std::string::npos;
  bool valid = false;
};

std::string lowerAscii(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(),
                 [](unsigned char ch) {
                   return static_cast<char>(std::tolower(ch));
                 });
  return value;
}

ParsedUrl parseUrl(const std::string &value) {
  ParsedUrl parsed;
  const size_t scheme_end = value.find("://");
  if (scheme_end == std::string::npos)
    return parsed;
  parsed.scheme = lowerAscii(value.substr(0, scheme_end));
  if (parsed.scheme != "http" && parsed.scheme != "https")
    return parsed;
  const size_t authority_start = scheme_end + 3;
  size_t authority_end = value.find_first_of("/?#", authority_start);
  if (authority_end == std::string::npos)
    authority_end = value.size();
  parsed.authority = value.substr(authority_start,
                                  authority_end - authority_start);
  if (parsed.authority.empty())
    return parsed;

  std::string host = parsed.authority;
  const size_t at = host.rfind('@');
  if (at != std::string::npos)
    host.erase(0, at + 1);
  const size_t port = host.find(':');
  if (port != std::string::npos)
    host.erase(port);
  parsed.host = lowerAscii(host);
  parsed.path_start = authority_end;
  parsed.path = authority_end < value.size() ? value.substr(authority_end) : "";
  parsed.valid = !parsed.host.empty();
  return parsed;
}

bool isGitHubHost(const std::string &host) {
  return host == "github.com" || host == "raw.githubusercontent.com" ||
         host == "gist.githubusercontent.com";
}

bool isJsdelivrHost(const std::string &host) {
  return host == "cdn.jsdelivr.net" || host == "fastly.jsdelivr.net" ||
         host == "testingcf.jsdelivr.net" || host == "gcore.jsdelivr.net";
}

bool isGitHubUrl(const std::string &value) {
  ParsedUrl parsed = parseUrl(value);
  return parsed.valid && isGitHubHost(parsed.host);
}

std::string normalizeProxyPrefix(std::string prefix) {
  prefix = trimWhitespace(prefix, true, true);
  if (prefix.empty() || prefix.find("{url}") != std::string::npos ||
      prefix.find("{encodedUrl}") != std::string::npos)
    return prefix;
  return endsWith(prefix, "/") ? prefix : prefix + "/";
}

std::string replaceAll(std::string value, const std::string &from,
                       const std::string &to) {
  size_t pos = 0;
  while ((pos = value.find(from, pos)) != std::string::npos) {
    value.replace(pos, from.size(), to);
    pos += to.size();
  }
  return value;
}

std::string jsdelivrGhPath(const std::string &value) {
  ParsedUrl parsed = parseUrl(value);
  if (!parsed.valid)
    return "";
  string_array segments = split(parsed.path, "/");
  segments.erase(std::remove_if(segments.begin(), segments.end(),
                                [](const std::string &item) {
                                  return item.empty();
                                }),
                 segments.end());
  if (parsed.host == "raw.githubusercontent.com" && segments.size() >= 4) {
    std::string path;
    for (size_t i = 3; i < segments.size(); ++i)
      path += (path.empty() ? "" : "/") + segments[i];
    return "gh/" + segments[0] + "/" + segments[1] + "@" + segments[2] +
           "/" + path;
  }
  if (parsed.host == "github.com" && segments.size() >= 5 &&
      (segments[2] == "raw" || segments[2] == "blob")) {
    std::string path;
    for (size_t i = 4; i < segments.size(); ++i)
      path += (path.empty() ? "" : "/") + segments[i];
    return "gh/" + segments[0] + "/" + segments[1] + "@" + segments[3] +
           "/" + path;
  }
  return "";
}

std::string embeddedGitHubUrlPrefix(const std::string &config_url,
                                    const ParsedUrl &parsed) {
  if (parsed.path_start == std::string::npos ||
      parsed.path_start >= config_url.size())
    return "";
  const size_t content_start = parsed.path_start + 1;
  if (content_start > config_url.size())
    return "";
  const std::string rest = config_url.substr(content_start);
  const std::string lower_rest = lowerAscii(rest);
  static const string_array raw_markers = {
      "https://raw.githubusercontent.com/", "https://github.com/",
      "https://gist.githubusercontent.com/"};
  for (const std::string &marker : raw_markers) {
    const size_t pos = lower_rest.find(marker);
    if (pos != std::string::npos)
      return config_url.substr(0, content_start + pos);
  }

  static const string_array encoded_markers = {
      "https%3a%2f%2fraw.githubusercontent.com%2f",
      "https%3a%2f%2fgithub.com%2f",
      "https%3a%2f%2fgist.githubusercontent.com%2f"};
  for (const std::string &marker : encoded_markers) {
    const size_t pos = lower_rest.find(marker);
    if (pos != std::string::npos)
      return config_url.substr(0, content_start + pos) + "{encodedUrl}";
  }
  return "";
}

} // namespace

std::string inferGitHubProxyPrefixFromConfigUrl(const std::string &config_url) {
  ParsedUrl parsed = parseUrl(config_url);
  if (!parsed.valid || isGitHubHost(parsed.host))
    return "";
  if (isJsdelivrHost(parsed.host) && startsWith(parsed.path, "/gh/"))
    return parsed.scheme + "://" + parsed.authority + "/";
  return normalizeProxyPrefix(embeddedGitHubUrlPrefix(config_url, parsed));
}

std::string applyGitHubProxyToUrl(const std::string &url,
                                  const std::string &proxy_prefix) {
  std::string prefix = normalizeProxyPrefix(proxy_prefix);
  if (prefix.empty() || !isGitHubUrl(url))
    return url;
  if (prefix.find("{encodedUrl}") != std::string::npos)
    return replaceAll(prefix, "{encodedUrl}", urlEncode(url));
  if (prefix.find("{url}") != std::string::npos)
    return replaceAll(prefix, "{url}", url);

  ParsedUrl prefix_url = parseUrl(prefix);
  if (prefix_url.valid && isJsdelivrHost(prefix_url.host)) {
    const std::string path = jsdelivrGhPath(url);
    return path.empty() ? url : prefix + path;
  }
  return prefix + url;
}

std::string applyGitHubProxyToRulesetUrl(const std::string &ruleset_url,
                                         const std::string &proxy_prefix) {
  if (startsWith(ruleset_url, "[]"))
    return ruleset_url;
  static const string_array typed_prefixes = {
      "clash-domain:", "clash-ipcidr:", "clash-classic:", "quanx:",
      "surge:"};
  for (const std::string &prefix : typed_prefixes) {
    if (startsWith(ruleset_url, prefix))
      return prefix +
             applyGitHubProxyToUrl(ruleset_url.substr(prefix.size()),
                                   proxy_prefix);
  }
  return applyGitHubProxyToUrl(ruleset_url, proxy_prefix);
}

void applyGitHubProxyToRulesetConfigs(RulesetConfigs &rulesets,
                                      const std::string &proxy_prefix) {
  if (proxy_prefix.empty())
    return;
  for (RulesetConfig &ruleset : rulesets)
    ruleset.Url = applyGitHubProxyToRulesetUrl(ruleset.Url, proxy_prefix);
}

void applyGitHubProxyToSources(string_array &sources,
                               const std::string &proxy_prefix) {
  if (proxy_prefix.empty())
    return;
  for (std::string &source : sources)
    source = applyGitHubProxyToUrl(source, proxy_prefix);
}

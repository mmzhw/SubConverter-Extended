#include "handler/short_links.h"

#include <chrono>
#include <vector>

#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>

#include "handler/interfaces.h"
#include "handler/short_link_auth.h"
#include "handler/short_link_storage.h"

namespace {

uint64_t nowMillis() {
  return static_cast<uint64_t>(
      std::chrono::duration_cast<std::chrono::milliseconds>(
          std::chrono::system_clock::now().time_since_epoch())
          .count());
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

std::string jsonCreated(Response &response,
                        const ShortLinkCreateResult &created) {
  response.status_code = 200;
  response.content_type = "application/json; charset=utf-8";
  response.headers["Cache-Control"] = "private, no-store";
  rapidjson::StringBuffer buffer;
  rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
  writer.StartObject();
  writer.Key("code");
  writer.String(created.code.c_str());
  writer.Key("path");
  writer.String(created.path.c_str());
  writer.EndObject();
  return buffer.GetString();
}

std::string jsonDeleted(Response &response, bool deleted) {
  response.status_code = deleted ? 200 : 404;
  response.content_type = "application/json; charset=utf-8";
  response.headers["Cache-Control"] = "private, no-store";
  rapidjson::StringBuffer buffer;
  rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
  writer.StartObject();
  writer.Key("deleted");
  writer.Bool(deleted);
  if (!deleted) {
    writer.Key("error");
    writer.String("not-found");
  }
  writer.EndObject();
  return buffer.GetString();
}

} // namespace

std::string createShortLinkEndpoint(RESPONSE_CALLBACK_ARGS) {
  rapidjson::Document document;
  document.Parse(request.postdata.c_str());
  if (!document.IsObject() || !document.HasMember("url") ||
      !document["url"].IsString()) {
    return jsonError(response, 400, "invalid-request");
  }

  std::string name;
  if (document.HasMember("name") && document["name"].IsString())
    name = document["name"].GetString();

  const ShortLinkCreateResult created =
      createShortLink(document["url"].GetString(), name, nowMillis());
  if (!created.ok) {
    return jsonError(response,
                     created.error == "storage-unavailable" ? 503 : 400,
                     created.error);
  }
  return jsonCreated(response, created);
}

std::string listShortLinksEndpoint(RESPONSE_CALLBACK_ARGS) {
  if (!shortLinkAdminAuthorized(request)) {
    response.headers["WWW-Authenticate"] = "Bearer realm=\"short-links\"";
    return jsonError(response, 401, "unauthorized");
  }

  response.status_code = 200;
  response.content_type = "application/json; charset=utf-8";
  response.headers["Cache-Control"] = "private, no-store";
  const std::vector<ShortLinkRecord> records = listShortLinks();
  rapidjson::StringBuffer buffer;
  rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
  writer.StartObject();
  writer.Key("items");
  writer.StartArray();
  for (const ShortLinkRecord &record : records) {
    writer.StartObject();
    writer.Key("code");
    writer.String(record.code.c_str());
    writer.Key("path");
    const std::string path = "/s?id=" + record.code;
    writer.String(path.c_str());
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
  writer.EndArray();
  writer.EndObject();
  return buffer.GetString();
}

std::string deleteShortLinkEndpoint(RESPONSE_CALLBACK_ARGS) {
  if (!shortLinkAdminAuthorized(request)) {
    response.headers["WWW-Authenticate"] = "Bearer realm=\"short-links\"";
    return jsonError(response, 401, "unauthorized");
  }

  const auto code = request.argument.find("id");
  if (code == request.argument.end())
    return jsonDeleted(response, false);
  return jsonDeleted(response, deleteShortLink(code->second));
}

std::string resolveShortLinkEndpoint(RESPONSE_CALLBACK_ARGS) {
  const auto code = request.argument.find("id");
  if (code == request.argument.end())
    return jsonError(response, 404, "not-found");

  const ShortLinkResolveResult resolved =
      resolveShortLink(code->second, nowMillis());
  if (!resolved.ok)
    return jsonError(response, 404, resolved.error);

  std::string target;
  if (!shortLinkSubTarget(resolved.record.url, target))
    return jsonError(response, 410, "invalid-target");

  Request sub_request = request;
  std::string path;
  string_multimap arguments;
  parseHttpTarget(target, path, arguments);
  sub_request.url = path;
  sub_request.argument = std::move(arguments);
  return subconverter(sub_request, response);
}

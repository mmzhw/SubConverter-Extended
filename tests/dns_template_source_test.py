from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    cmake = (ROOT / "CMakeLists.txt").read_text(encoding="utf-8")
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    main_cpp = (ROOT / "src/main.cpp").read_text(encoding="utf-8")
    header = (ROOT / "src/handler/dns_templates.h").read_text(encoding="utf-8")
    source = (ROOT / "src/handler/dns_templates.cpp").read_text(encoding="utf-8")
    interfaces = (ROOT / "src/handler/interfaces.cpp").read_text(encoding="utf-8")
    nginx = (ROOT / "docker/nginx/nginx.conf.tmpl").read_text(encoding="utf-8")
    nginx_paths = (ROOT / "docker/nginx/subconverter-paths.txt").read_text(encoding="utf-8").splitlines()
    base = (ROOT / "base/base/all_base.tpl").read_text(encoding="utf-8")

    require("src/handler/dns_templates.cpp" in cmake, "DNS template handler must be compiled")
    require('"/api/dns-template"' in main_cpp, "DNS template endpoint must be registered")
    require("dnsTemplateEndpoint" in header, "DNS template endpoint declaration missing")
    require("SUBCONVERTER_DNS_TEMPLATES_DIR" in source, "DNS template directory must be configurable")
    require("SUBCONVERTER_DNS_TEMPLATE_MAX_ENTRIES" in source, "DNS template storage must have a configurable entry limit")
    require("pruneDnsTemplates" in source, "DNS template storage must prune old files")
    require("SUBCONVERTER_DNS_TEMPLATES_DIR" in dockerfile, "Docker image should declare the DNS template directory")
    require("./dns-templates:/base/dns-templates" in compose, "Compose should persist DNS templates")
    require("saveDnsTemplate" in source, "DNS template save path missing")
    require("loadDnsTemplate" in source, "DNS template load path missing")
    require("defaultDnsTemplate" in source, "Default DNS template reader missing")
    require("dns_template" in interfaces, "sub request must read dns_template parameter")
    require('local_vars["clash.dns_template_content"]' in interfaces, "sub request must inject DNS template content")
    require("local.clash.dns_template_content" in base, "base template must render custom DNS content")
    require("|api" in nginx or "(api|" in nginx, "nginx must proxy /api endpoints to the backend")
    require("api" in nginx_paths, "nginx path inventory must include /api endpoints")


if __name__ == "__main__":
    main()

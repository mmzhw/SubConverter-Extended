#!/usr/bin/env python3
"""Offline integration regressions for the selected upstream compatibility fixes."""

from __future__ import annotations

import argparse
import base64
import contextlib
import importlib.util
import json
import re
import subprocess
import tempfile
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import compatibility_security_baseline as baseline


def data_uri_cases() -> list[tuple[str, str, str]]:
    payload = "~~~\r\nfixture+tail"
    encoded = base64.b64encode(payload.encode()).decode()
    assert "+" in encoded
    return [
        ("literal-plus", "data:,a+b", "a+b"),
        ("escaped-plus", "data:,a%2Bb%2bc", "a+b+c"),
        ("escaped-lines", "data:,one%0D%0Atwo%0Athree", "one\r\ntwo\nthree"),
        ("literal-lines", "data:,one\r\ntwo\nthree", "one\r\ntwo\nthree"),
        ("invalid-escapes", "data:,a%zz%2%", "a%zz%2%"),
        ("nul-byte", "data:,a%00b", "a\0b"),
        ("standard-base64", "data:text/plain;base64," + encoded, payload),
        ("wrapped-base64", "data:;base64," + encoded[:4] + "\r\n" + encoded[4:], payload),
        ("escaped-wrapping", "data:;base64," + encoded[:4] + "%0D%0A" + encoded[4:], payload),
        ("escaped-base64", "data:;base64," + urllib.parse.quote(encoded, safe=""), payload),
        ("urlsafe-base64", "data:;base64," + base64.urlsafe_b64encode(payload.encode()).decode(), payload),
    ]


def data_uri_baseline(helper: Path) -> None:
    with tempfile.TemporaryDirectory(prefix="sce-upstream-data-") as temporary:
        pref = Path(temporary) / "pref.toml"
        original = (baseline.COMPAT_FIXTURES / "legacy-pref.toml").read_text(encoding="utf-8")

        def probe(uri: str, limit: int = 1048576) -> dict[str, object]:
            pref.write_text(
                original.replace("max_allowed_download_size = 1048576",
                                 f"max_allowed_download_size = {limit}"),
                encoding="utf-8",
            )
            completed = subprocess.run(
                [str(helper), "--data-uri-probe", str(pref), uri],
                cwd=temporary, capture_output=True, text=True,
                encoding="utf-8", errors="replace", timeout=20,
            )
            if completed.returncode != 0:
                raise AssertionError(f"data URI probe failed: {completed.stderr[-2000:]}")
            return json.loads(completed.stdout)

        for label, uri, expected in data_uri_cases():
            result = probe(uri)
            if (result["status"], result["body"], result["async_status"], result["async_body"]) != (
                200, expected, 200, expected
            ):
                raise AssertionError(f"{label}: payload changed: {result!r}")
            for key in ("successful_completion_reused", "failure_retired_during_callback",
                        "failed_completions_retired"):
                if result[key] is not True:
                    raise AssertionError(f"{label}: cache operation regression: {key}")

        for uri, limit, expected_status in (
            ("data:,abcd", 4, 200),
            ("data:,abcd", 3, 400),
            ("data:,abcd", 0, 200),
            ("data:;base64,YWJj", 4, 200),
            ("data:;base64,YWJj", 3, 400),
            ("data:;base64,YWJj", 0, 200),
        ):
            result = probe(uri, limit)
            if result["status"] != expected_status or result["async_status"] != expected_status:
                raise AssertionError(f"data URI size limit changed: limit={limit}, result={result!r}")
    print("PASS: 11 data URI payload cases, 6 size boundaries, failed/successful fetch publication")


def provider_url_baseline(base_url: str) -> None:
    sources = (
        "https://subscription.example.test/sub?token=a+b&nested=https%3A%2F%2Fexample.com%2Fx%3Fa%3D1%26b%3D2",
        "https://subscription.example.test/a%2Fb?token=%2526%2B%23",
    )
    for index, source in enumerate(sources):
        name = f"Escapes{index}"
        for wire_source in (source, f"provider:{name},{source}"):
            status, body, _ = baseline.request(base_url, "/sub", {
                "target": "clash", "url": wire_source,
                "config": baseline.DISABLE_RULEGEN_CONFIG,
            })
            output = body.decode("utf-8")
            if status != 200 or "proxy-providers:" not in output:
                raise AssertionError(f"provider conversion failed: HTTP {status}: {output!r}")
            urls = re.findall(r"(?m)^    url: (.+)$", output)
            if source not in [value.strip().strip("\"'") for value in urls]:
                raise AssertionError(f"provider URL changed: want {source!r}, got {urls!r}")
    print("PASS: 4 escaped provider URL cases without upstream fetches")


def ruleset_output_baseline(base_url: str) -> None:
    for output_type, rule in (
        ("1", "URL-REGEX,^https://example.com/a//b,Proxy"),
        ("6", "DOMAIN-REGEX,^a // b$,Proxy"),
    ):
        source = "data:text/plain," + urllib.parse.quote(rule + "\n", safe="")
        # The legacy group,url,interval parser treats the last comma as the
        # interval separator. Keep the data URI intact with an explicit zero.
        status, body, _ = baseline.request(base_url, "/getruleset", {
            "url": baseline._urlsafe_b64(source + ",0"), "type": output_type,
        })
        if status != 200 or rule not in body.decode("utf-8"):
            raise AssertionError(f"literal slashes lost in ruleset output: HTTP {status}: {body!r}")
    print("PASS: URL and regex double slashes in /getruleset")


@contextlib.contextmanager
def external_rules_fixture():
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path == "/rules.list":
                body = b"DOMAIN-SUFFIX,external-regression.example\n"
                self.send_response(200)
            else:
                body = b"fixture fetch failure"
                self.send_response(503)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


def fork_rule_baseline(base_url: str, password: str, fixture_base: str) -> None:
    module_path = baseline.REPOSITORY / "scripts" / "run-subconverter-smoke.py"
    spec = importlib.util.spec_from_file_location("fork_smoke", module_path)
    assert spec is not None and spec.loader is not None
    smoke = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(smoke)
    names = (
        "assert_getgroupnames_ok", "assert_getgroupnames_missing_config",
        "assert_inline_rules_valid", "assert_inline_rules_empty",
        "assert_inline_rules_undeclared_fallback_rejected",
        "assert_inline_rules_builtin_policy_accepted",
        "assert_inline_rules_prepend_places_rules_first",
        "assert_inline_rules_prepend_unknown_group",
        "assert_inline_rules_unknown_group", "assert_inline_rules_unknown_type",
        "assert_inline_rules_match_forbidden", "assert_inline_rules_with_list_true",
        "assert_inline_rules_with_script_true", "assert_inline_rules_wrong_target",
        "assert_inline_rules_exceeds_quota", "assert_inline_rules_empty_value",
        "assert_ext_ruleset_prepend_unknown_group",
    )
    for name in names:
        getattr(smoke, name)(base_url, 20)
    print(f"PASS: {len(names)} existing fork rule/group regressions")

    external = fixture_base + "/rules.list"
    params = {
        "target": "clash", "url": smoke.SAMPLE_SS_LINK,
        "config": smoke.NO_RULESET_PRESET_CONFIG,
        "ext_ruleset_prepend": f"Proxy,{external}",
        "inline_rules_prepend": "Domestic:DOMAIN-KEYWORD,inline-top",
        "inline_rules": "Domestic:DOMAIN-SUFFIX,inline-append.example",
    }
    status, body, _ = baseline.request(base_url, "/sub", params)
    output = body.decode("utf-8")
    first = "DOMAIN-SUFFIX,external-regression.example,Proxy"
    second = "DOMAIN-KEYWORD,inline-top,Domestic"
    appended = "DOMAIN-SUFFIX,inline-append.example,Domestic"
    if (status != 200 or first not in output or second not in output or appended not in output
            or output.index(first) >= output.index(second) or output.index(second) >= output.index(appended)):
        raise AssertionError(f"external/inline prepend order changed: HTTP {status}: {output!r}")
    params.pop("ext_ruleset_prepend")
    params.pop("inline_rules_prepend")
    params["ext_ruleset"] = f"Proxy,{external};Domestic,{fixture_base}/failure"
    status, _, _ = baseline.request(base_url, "/sub", params)
    if status != 400:
        raise AssertionError(f"external rule fetch failure was not atomic: HTTP {status}")
    print("PASS: external/inline coexistence, prepend order and atomic failure")

    params["ext_ruleset"] = "Proxy,data:,DOMAIN-SUFFIX%2Cexample.com"
    status, _, _ = baseline.request(base_url, "/sub", params)
    if status != 400:
        raise AssertionError(f"external rule data URI restriction changed: HTTP {status}")

    pref = (baseline.COMPAT_FIXTURES / "legacy-pref.toml").read_text(encoding="utf-8")
    quota = re.search(r"(?m)^max_allowed_rulesets = ([0-9]+)$", pref)
    assert quota is not None
    count = int(quota.group(1)) // 2 + 1
    common = {key: params[key] for key in ("target", "url", "config")}
    inline = "Proxy:" + "|".join(f"DOMAIN-KEYWORD,quota-{index}" for index in range(count))
    ext = ";".join(f"Proxy,{external}" for _ in range(count))
    for extra in (
        {"inline_rules": inline, "inline_rules_prepend": inline},
        {"ext_ruleset": ext, "ext_ruleset_prepend": ext},
    ):
        status, _, _ = baseline.request(base_url, "/sub", {**common, **extra})
        if status != 400:
            raise AssertionError(f"append/prepend shared quota changed: HTTP {status}")
    print("PASS: both append/prepend rule-family shared quotas")

    for name in (
        "assert_short_link_update_ok", "assert_short_link_update_not_found",
        "assert_short_link_update_invalid_url", "assert_short_link_update_missing_url",
    ):
        getattr(smoke, name)(base_url, 20, password)
    print("PASS: 4 existing short-link update regressions")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    parser.add_argument("--settings-snapshot-helper", type=Path, required=True)
    args = parser.parse_args()
    binary = args.binary.resolve()
    helper = args.settings_snapshot_helper.resolve()
    data_uri_baseline(helper)
    with tempfile.TemporaryDirectory(prefix="sce-upstream-short-links-") as temporary:
        password = "upstream-regression-fixture"
        environment = {
            "SUBCONVERTER_SHORT_LINKS_FILE": str(Path(temporary) / "links.json"),
            "SUBCONVERTER_SHORT_LINK_PASSWORD": password,
        }
        with external_rules_fixture() as fixture_base:
            with baseline.running_service(binary, environment=environment) as base_url:
                provider_url_baseline(base_url)
                ruleset_output_baseline(base_url)
                fork_rule_baseline(base_url, password, fixture_base)


if __name__ == "__main__":
    main()

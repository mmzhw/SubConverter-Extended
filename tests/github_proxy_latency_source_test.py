from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_service_latency_endpoint_is_registered_and_uses_server_network():
    main = (ROOT / "src/main.cpp").read_text(encoding="utf-8")
    interfaces = (ROOT / "src/handler/interfaces.cpp").read_text(encoding="utf-8")

    assert '"/api/github-proxy-latency"' in main
    assert "githubProxyLatency" in main
    assert "parseProxy(settings.proxyConfig, settings.proxyBypass)" in interfaces
    assert "FetchContext::PublicRequest" in interfaces
    assert "webGet(argument, result)" in interfaces
    assert "std::string githubProxyLatencyImpl(RESPONSE_CALLBACK_ARGS)" in interfaces
    assert (
        "std::string githubProxyLatency(RESPONSE_CALLBACK_ARGS) {\n"
        "  return githubProxyLatencyImpl(request, response);\n"
        "}"
    ) in interfaces


if __name__ == "__main__":
    test_service_latency_endpoint_is_registered_and_uses_server_network()

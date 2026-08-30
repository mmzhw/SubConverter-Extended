from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    beast = (ROOT / "src/server/webserver_beast.cpp").read_text(encoding="utf-8")
    httplib = (ROOT / "src/server/webserver_httplib.cpp").read_text(encoding="utf-8")

    healthcheck = dockerfile[dockerfile.index("HEALTHCHECK"):]
    require("/healthz" in healthcheck, "Docker healthcheck should use the lightweight health endpoint")
    require("/version" not in healthcheck, "Docker healthcheck should not poll the full version page")

    for name, source in (("beast", beast), ("httplib", httplib)):
        require(
            "quietSuccessfulCompletionPath" in source,
            f"{name} server should identify successful probe paths as quiet completions",
        )
        require(
            "quietShortLinkAdminAuthFailurePath" in source,
            f"{name} server should keep expected short-link admin auth failures out of info logs",
        )
        require(
            'status == 401 && quietShortLinkAdminAuthFailurePath(path)' in source,
            f"{name} server should only quiet unauthorized short-link admin failures",
        )
        require(
            "responsePreparedLogLevel" in source,
            f"{name} server should route completion logs through a path-aware level helper",
        )
        require(
            "LOG_LEVEL_DEBUG" in source and "LOG_LEVEL_INFO" in source,
            f"{name} server should keep quiet probe successes below the default info threshold",
        )


if __name__ == "__main__":
    main()

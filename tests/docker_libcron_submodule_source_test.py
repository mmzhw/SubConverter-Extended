from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_libcron_docker_build_skips_test_submodules():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")

    assert "git -C libcron submodule update --init --recursive --depth=1 libcron/externals/date" in dockerfile
    assert "git -C libcron submodule update --init --recursive --depth=1 &&" not in dockerfile


if __name__ == "__main__":
    test_libcron_docker_build_skips_test_submodules()

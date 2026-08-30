from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class DockerShortLinkPasswordDefaultsTest(unittest.TestCase):
    def test_final_image_declares_short_link_password_env_for_container_uis(self):
        dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")

        self.assertIn('SUBCONVERTER_SHORT_LINK_PASSWORD=""', dockerfile)

    def test_startup_script_prints_effective_short_link_password(self):
        script = (ROOT / "docker" / "s6" / "subconverter" / "run").read_text(
            encoding="utf-8"
        )

        self.assertIn("Short-link management password:", script)
        self.assertIn("$SUBCONVERTER_SHORT_LINK_PASSWORD", script)


if __name__ == "__main__":
    unittest.main()

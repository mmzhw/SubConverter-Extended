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

        self.assertTrue(
            script.startswith("#!/command/with-contenv sh"),
            "s6 service must import Docker/container environment variables",
        )
        self.assertIn("Short-link management password:", script)
        self.assertIn("$SUBCONVERTER_SHORT_LINK_PASSWORD", script)

    def test_nginx_config_script_imports_container_environment(self):
        script = (ROOT / "docker" / "s6-scripts" / "nginx-config").read_text(
            encoding="utf-8"
        )

        self.assertTrue(
            script.startswith("#!/command/with-contenv sh"),
            "nginx config renderer must import Docker/container environment variables",
        )


if __name__ == "__main__":
    unittest.main()

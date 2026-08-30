import importlib.util
import pathlib
import sys
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "shutdown_process_test", ROOT / "tests" / "shutdown_process_test.py"
)
SHUTDOWN_PROCESS = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = SHUTDOWN_PROCESS
SPEC.loader.exec_module(SHUTDOWN_PROCESS)


class FakeResource:
    RLIMIT_NOFILE = 7
    RLIM_INFINITY = -1

    def __init__(self, soft: int, hard: int) -> None:
        self.soft = soft
        self.hard = hard
        self.set_limits: list[tuple[int, tuple[int, int]]] = []

    def getrlimit(self, resource_id: int) -> tuple[int, int]:
        self.assert_resource(resource_id)
        return self.soft, self.hard

    def setrlimit(self, resource_id: int, limits: tuple[int, int]) -> None:
        self.assert_resource(resource_id)
        self.set_limits.append((resource_id, limits))
        self.soft, self.hard = limits

    def assert_resource(self, resource_id: int) -> None:
        if resource_id != self.RLIMIT_NOFILE:
            raise AssertionError(f"unexpected resource id: {resource_id!r}")


class ShutdownFdBudgetTests(unittest.TestCase):
    def test_raises_soft_limit_before_opening_high_fd_backlog(self) -> None:
        fake = FakeResource(soft=1024, hard=4096)

        planned = SHUTDOWN_PROCESS.plan_high_fd_backlog_connections(
            requested=1100,
            open_fd_count=16,
            resource_api=fake,
        )

        self.assertEqual(planned, 1100)
        self.assertEqual(fake.set_limits, [(fake.RLIMIT_NOFILE, (1244, 4096))])

    def test_reduces_backlog_when_hard_limit_is_lower_than_requested_budget(self) -> None:
        fake = FakeResource(soft=1024, hard=1050)

        planned = SHUTDOWN_PROCESS.plan_high_fd_backlog_connections(
            requested=1100,
            open_fd_count=16,
            resource_api=fake,
        )

        self.assertEqual(planned, 906)
        self.assertEqual(fake.set_limits, [(fake.RLIMIT_NOFILE, (1050, 1050))])

    def test_rejects_environment_that_cannot_exercise_high_fd_shutdown(self) -> None:
        fake = FakeResource(soft=80, hard=80)

        with self.assertRaises(SHUTDOWN_PROCESS.ShutdownFailure):
            SHUTDOWN_PROCESS.plan_high_fd_backlog_connections(
                requested=1100,
                open_fd_count=20,
                resource_api=fake,
            )


if __name__ == "__main__":
    unittest.main()

import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("collector", Path(__file__).parents[1] / "collect.py")
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)

class CollectorTests(unittest.TestCase):
    def test_raw_logs_never_leave_summary(self):
        result = collector.summarize_logs("ERROR password=FIXTURE_PRIVATE_VALUE\nWARN token=FIXTURE_PRIVATE_VALUE\nstarted")
        self.assertEqual(result["counts"], {"error": 1, "warning": 1, "other": 1})
        self.assertNotIn("FIXTURE_PRIVATE_VALUE", json.dumps(result))

    def test_docker_health_log_and_other_fields_are_discarded(self):
        raw = {"state": {"Status": "running", "Health": {"Status": "healthy", "Log": ["FIXTURE_PRIVATE_VALUE"]},
                         "Env": ["FIXTURE_PRIVATE_VALUE"]}, "restarts": 2}
        with patch.object(collector, "run_bounded", return_value=(0, json.dumps(raw), False)):
            result = collector.container_summary("jbfd-test-app-1")
        self.assertEqual(result, {"state": "running", "health": "healthy", "restarts": 2})
        self.assertNotIn("FIXTURE_PRIVATE_VALUE", json.dumps(result))

    def test_failed_docker_is_reported_as_unavailable(self):
        with patch.object(collector, "run_bounded", return_value=(1, "error secret", False)):
            self.assertFalse(collector.diagnostics("jbfd-live-app-1")["available"])
            self.assertEqual(collector.container_summary("jbfd-live-app-1")["state"], "unknown")

    def test_log_line_count_is_bounded(self):
        self.assertEqual(collector.summarize_logs("error\n" * 1000)["counts"]["error"], 200)

if __name__ == "__main__":
    unittest.main()

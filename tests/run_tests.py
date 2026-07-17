from __future__ import annotations

import json
import sys
import time
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT.parent) not in sys.path:
    sys.path.insert(0, str(ROOT.parent))


class CollectingResult(unittest.TextTestResult):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.records: list[dict[str, Any]] = []
        self.started: dict[str, float] = {}

    def startTest(self, test: unittest.TestCase) -> None:  # noqa: N802
        self.started[test.id()] = time.perf_counter()
        super().startTest(test)

    def _record(self, test: unittest.TestCase, status: str, detail: str = "") -> None:
        method = getattr(test, test._testMethodName)
        meta = getattr(method, "case_meta", None)
        duration = time.perf_counter() - self.started.get(test.id(), time.perf_counter())
        self.records.append({
            "testId": test.id(),
            "caseId": meta.case_id if meta else test._testMethodName,
            "title": meta.title if meta else test._testMethodName,
            "expected": meta.expected if meta else "",
            "category": meta.category if meta else "未分类",
            "status": status,
            "durationMs": round(duration * 1000, 2),
            "detail": detail,
        })

    def addSuccess(self, test: unittest.TestCase) -> None:  # noqa: N802
        super().addSuccess(test)
        self._record(test, "PASS", "断言全部满足")

    def addFailure(self, test: unittest.TestCase, err: Any) -> None:  # noqa: N802
        super().addFailure(test, err)
        self._record(test, "FAIL", self._exc_info_to_string(err, test))

    def addError(self, test: unittest.TestCase, err: Any) -> None:  # noqa: N802
        super().addError(test, err)
        self._record(test, "ERROR", self._exc_info_to_string(err, test))

    def addSkip(self, test: unittest.TestCase, reason: str) -> None:  # noqa: N802
        super().addSkip(test, reason)
        self._record(test, "SKIP", reason)


class CollectingRunner(unittest.TextTestRunner):
    resultclass = CollectingResult


def write_junit(records: list[dict[str, Any]], path: Path) -> None:
    failures = sum(1 for r in records if r["status"] in {"FAIL", "ERROR"})
    skipped = sum(1 for r in records if r["status"] == "SKIP")
    suite = ET.Element("testsuite", {
        "name": "qingxier-contract-tests",
        "tests": str(len(records)),
        "failures": str(failures),
        "errors": str(sum(1 for r in records if r["status"] == "ERROR")),
        "skipped": str(skipped),
        "time": f"{sum(r['durationMs'] for r in records) / 1000:.3f}",
    })
    for record in records:
        case = ET.SubElement(suite, "testcase", {
            "classname": record["category"],
            "name": f"{record['caseId']} {record['title']}",
            "time": f"{record['durationMs'] / 1000:.3f}",
        })
        if record["status"] == "FAIL":
            node = ET.SubElement(case, "failure", {"message": record["detail"][:200]})
            node.text = record["detail"]
        elif record["status"] == "ERROR":
            node = ET.SubElement(case, "error", {"message": record["detail"][:200]})
            node.text = record["detail"]
        elif record["status"] == "SKIP":
            ET.SubElement(case, "skipped", {"message": record["detail"]})
    ET.ElementTree(suite).write(path, encoding="utf-8", xml_declaration=True)


def main() -> int:
    out_dir = ROOT / "reports"
    out_dir.mkdir(exist_ok=True)
    loader = unittest.TestLoader()
    suite = loader.discover(str(ROOT / "tests"), pattern="test_*.py", top_level_dir=str(ROOT.parent))
    runner = CollectingRunner(verbosity=2)
    result: CollectingResult = runner.run(suite)  # type: ignore[assignment]
    records = sorted(result.records, key=lambda r: r["caseId"])
    summary = {
        "generatedAt": "2026-07-17T00:00:00+08:00",
        "scope": "reference contract and mini-program state-flow tests",
        "total": len(records),
        "passed": sum(1 for r in records if r["status"] == "PASS"),
        "failed": sum(1 for r in records if r["status"] == "FAIL"),
        "errors": sum(1 for r in records if r["status"] == "ERROR"),
        "skipped": sum(1 for r in records if r["status"] == "SKIP"),
        "records": records,
    }
    (out_dir / "test-results.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    write_junit(records, out_dir / "junit.xml")
    print("\nRESULT_SUMMARY=" + json.dumps({k: summary[k] for k in ("total", "passed", "failed", "errors", "skipped")}, ensure_ascii=False))
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())

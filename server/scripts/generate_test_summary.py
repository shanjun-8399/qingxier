from __future__ import annotations

import argparse
import json
import platform
import sys
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="生成庆喜儿服务器测试摘要")
    parser.add_argument("--junit", required=True, type=Path)
    parser.add_argument("--coverage", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    junit_root = ET.parse(args.junit).getroot()
    suite = junit_root.find("testsuite") if junit_root.tag == "testsuites" else junit_root
    if suite is None:
        raise ValueError("JUnit XML 中未找到 testsuite")
    coverage_root = ET.parse(args.coverage).getroot()

    tests = int(suite.attrib.get("tests", 0))
    failures = int(suite.attrib.get("failures", 0))
    errors = int(suite.attrib.get("errors", 0))
    skipped = int(suite.attrib.get("skipped", 0))
    coverage_rate = float(coverage_root.attrib.get("line-rate", 0))
    summary = {
        "generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "environment": {
            "platform": platform.platform(),
            "python": platform.python_version(),
        },
        "tests": tests,
        "passed": tests - failures - errors - skipped,
        "failures": failures,
        "errors": errors,
        "skipped": skipped,
        "coverageLineRate": coverage_rate,
        "coveragePercent": round(coverage_rate * 100, 2),
        "result": "PASS" if failures == 0 and errors == 0 else "FAIL",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

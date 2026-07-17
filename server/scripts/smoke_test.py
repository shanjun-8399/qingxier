from __future__ import annotations

import json
import os
import urllib.request

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8000")


def request(path: str, *, method: str = "GET", headers=None, body=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        BASE_URL + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    with urllib.request.urlopen(req, timeout=5) as response:
        return response.status, json.load(response)


def main() -> None:
    status, health = request("/health")
    assert status == 200 and health["data"]["status"] == "ok"
    status, capabilities = request(
        "/api/v1/speech/capabilities",
        headers={"Authorization": "Bearer test-user-token"},
    )
    assert status == 200 and capabilities["data"]["autoDialect"] is True
    status, session = request(
        "/api/v1/speech/sessions",
        method="POST",
        headers={"X-Device-Token": "test-device-token"},
        body={
            "deviceId": "d_001",
            "wakeWord": "阿西",
            "wakeWordScore": 0.91,
            "wakeWordModelVersion": "wakenet9-axi-1.0.0",
            "autoDialect": True,
            "audio": {"codec": "pcm", "sampleRate": 16000, "channels": 1},
        },
    )
    assert status == 201 and session["data"]["sessionId"].startswith("ssn_")
    print("SMOKE PASS: health, capabilities, session")


if __name__ == "__main__":
    main()

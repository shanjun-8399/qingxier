from __future__ import annotations

from typing import Any


def assert_envelope(response, status: int = 200):
    assert response.status_code == status, response.text
    payload = response.json()
    assert payload["code"] == 0
    assert payload["message"] == "OK"
    assert payload["traceId"] == response.headers["X-Trace-Id"]
    return payload["data"]


def create_session(client, device_headers, **overrides: Any) -> dict[str, Any]:
    body = {
        "deviceId": "d_001",
        "wakeWord": "阿西",
        "wakeWordScore": 0.91,
        "wakeWordModelVersion": "wakenet9-axi-1.0.0",
        "autoDialect": True,
        "audio": {"codec": "pcm", "sampleRate": 16000, "channels": 1},
    }
    body.update(overrides)
    return assert_envelope(
        client.post("/api/v1/speech/sessions", headers=device_headers, json=body),
        201,
    )


def valid_wake_package() -> dict[str, Any]:
    return {
        "packageType": "wake_words",
        "wakeWord": "阿西",
        "modelFamily": "WakeNet9",
        "version": "1.0.1",
        "url": "https://cos.example.com/wake/wakenet9-axi-1.0.1.bin",
        "sha256": "a" * 64,
        "threshold": 0.72,
        "hardwareRevisions": ["A1", "A2"],
        "rollbackVersion": "1.0.0",
        "rollout": {"percent": 10, "batchTags": ["pilot"]},
    }

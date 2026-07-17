from __future__ import annotations

from .test_api import create_session, valid_wake_package


def test_unknown_path_uses_standard_envelope(client):
    response = client.get("/not-found")
    assert response.status_code == 404
    assert response.json()["code"] == 404001
    assert response.json()["error"] == "NOT_FOUND"
    assert response.json()["traceId"] == response.headers["X-Trace-Id"]


def test_method_not_allowed_uses_standard_envelope(client):
    response = client.post("/health")
    assert response.status_code == 405
    assert response.json()["code"] == 405001
    assert response.json()["error"] == "METHOD_NOT_ALLOWED"


def test_readiness_failure_is_503_not_generic_500(client, repository, monkeypatch):
    def fail_ping():
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(repository, "ping", fail_ping)
    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["code"] == 503000
    assert response.json()["error"] == "NOT_READY"


def test_rest_tts_rejects_unbound_clone_voice(client, device_headers):
    session = create_session(client, device_headers)
    response = client.post(
        "/api/v1/speech/tts",
        headers=device_headers,
        json={
            "sessionId": session["sessionId"],
            "text": "你好",
            "dialect": "mandarin",
            "voiceId": "voice_not_bound",
        },
    )
    assert response.status_code == 403
    assert response.json()["code"] == 403101
    assert response.json()["error"] == "VOICE_NOT_BOUND"


def test_rest_tts_rejects_unapproved_model(client, device_headers):
    session = create_session(client, device_headers)
    response = client.post(
        "/api/v1/speech/tts",
        headers=device_headers,
        json={
            "sessionId": session["sessionId"],
            "text": "你好",
            "dialect": "mandarin",
            "model": "cosyvoice-unapproved",
        },
    )
    assert response.status_code == 400
    assert response.json()["code"] == 400105
    assert response.json()["error"] == "UNSUPPORTED_TTS_MODEL"


def test_websocket_tts_rejects_unbound_clone_voice(client, device_headers):
    session = create_session(client, device_headers)
    with client.websocket_connect(
        f"/ws/v1/voice?sessionId={session['sessionId']}",
        headers=device_headers,
    ) as websocket:
        websocket.receive_json()
        websocket.send_json(
            {
                "type": "tts_request",
                "text": "你好",
                "dialect": "mandarin",
                "voiceId": "voice_not_bound",
            }
        )
        error = websocket.receive_json()
        assert error["type"] == "error"
        assert error["code"] == 403101
        assert error["error"] == "VOICE_NOT_BOUND"
        websocket.send_json({"type": "end"})
        assert websocket.receive_json()["type"] == "completed"


def test_wake_package_rejects_oversized_idempotency_key(client, admin_headers):
    response = client.post(
        "/api/v1/admin/wake-word-packages",
        headers={**admin_headers, "Idempotency-Key": "x" * 129},
        json=valid_wake_package(),
    )
    assert response.status_code == 400
    assert response.json()["error"] == "INVALID_ARGUMENT"

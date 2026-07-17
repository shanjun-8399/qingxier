from __future__ import annotations

from starlette.websockets import WebSocketDisconnect

from qingxier_server.asr import LexicalDialectClassifier

from .test_api import create_session


def test_lexical_dialect_classifier():
    classifier = LexicalDialectClassifier()
    assert classifier.classify("食饱未").dialect == "minnan"
    assert classifier.classify("呢个好唔好").dialect == "cantonese"
    assert classifier.classify("侬好呀").dialect == "shanghai"
    assert classifier.classify("这个很巴适").dialect == "sichuan"
    assert classifier.classify("今天天气不错").dialect == "mandarin"


def test_websocket_voice_flow(client, device_headers):
    session = create_session(client, device_headers)
    with client.websocket_connect(
        f"/ws/v1/voice?sessionId={session['sessionId']}",
        headers={**device_headers, "X-Request-Id": "trc-ws-flow"},
    ) as ws:
        ready = ws.receive_json()
        assert ready["type"] == "session_ready"
        assert ready["wakeWord"] == "阿西"
        assert ready["traceId"] == "trc-ws-flow"

        ws.send_json(
            {
                "type": "start",
                "sessionId": session["sessionId"],
                "wakeWord": "阿西",
            }
        )
        assert ws.receive_json()["type"] == "started"

        ws.send_json(
            {
                "type": "asr_result",
                "text": "呢个好唔好",
                "isFinal": True,
                "dialectCandidate": "cantonese",
                "confidence": 0.92,
            }
        )
        asr = ws.receive_json()
        assert asr["type"] == "asr_result"
        assert asr["dialect"] == "cantonese"
        assert asr["stability"] == "locked"

        ws.send_json(
            {
                "type": "tts_request",
                "text": "好呀",
                "dialect": "cantonese",
                "voiceId": "voice_clone_mom_001",
            }
        )
        tts_start = ws.receive_json()
        tts_result = ws.receive_json()
        assert tts_start["type"] == "tts_start"
        assert tts_start["model"] == "cosyvoice-v3.5-flash"
        assert tts_result["type"] == "tts_result"
        assert tts_result["audioUrl"].startswith("https://cdn.test/")

        ws.send_json({"type": "ping"})
        assert ws.receive_json()["type"] == "pong"

        ws.send_json({"type": "end"})
        assert ws.receive_json()["type"] == "completed"


def test_websocket_binary_audio_returns_recoverable_asr_error(client, device_headers):
    session = create_session(client, device_headers)
    with client.websocket_connect(
        f"/ws/v1/voice?sessionId={session['sessionId']}", headers=device_headers
    ) as ws:
        ws.receive_json()
        ws.send_bytes(b"\x00\x01" * 160)
        error = ws.receive_json()
        assert error["type"] == "error"
        assert error["code"] == 503101
        assert error["recoverable"] is True
        ws.send_json({"type": "end"})
        assert ws.receive_json()["type"] == "completed"


def test_websocket_rejects_missing_device_token(client, device_headers):
    session = create_session(client, device_headers)
    try:
        with client.websocket_connect(
            f"/ws/v1/voice?sessionId={session['sessionId']}"
        ) as ws:
            ws.receive_json()
    except WebSocketDisconnect as exc:
        assert exc.code == 4401
    else:  # pragma: no cover
        raise AssertionError("missing token should be rejected")


def test_websocket_invalid_event_returns_error(client, device_headers):
    session = create_session(client, device_headers)
    with client.websocket_connect(
        f"/ws/v1/voice?sessionId={session['sessionId']}", headers=device_headers
    ) as ws:
        ws.receive_json()
        ws.send_json({"type": "not-supported"})
        error = ws.receive_json()
        assert error["type"] == "error"
        assert error["error"] == "INVALID_ARGUMENT"
        ws.send_json({"type": "end"})
        ws.receive_json()


def test_websocket_validation_error_is_returned_as_protocol_error(client, device_headers):
    session = create_session(client, device_headers)
    with client.websocket_connect(
        f"/ws/v1/voice?sessionId={session['sessionId']}",
        headers=device_headers,
    ) as websocket:
        assert websocket.receive_json()["type"] == "session_ready"
        websocket.send_json(
            {
                "type": "tts_request",
                "text": "你好",
                "dialect": "unsupported-dialect",
            }
        )
        error = websocket.receive_json()
        assert error["type"] == "error"
        assert error["code"] == 400001
        assert error["error"] == "INVALID_ARGUMENT"

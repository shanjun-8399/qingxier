from __future__ import annotations

from .test_api import assert_envelope, create_session, valid_wake_package

class TestSpeechSessionsAndRouting:
    def test_create_session(self, client, device_headers):
        data = create_session(client, device_headers)
        assert data["wakeWord"] == "阿西"
        assert data["lockedDialect"] is None
        assert data["legacyFirmware"] is False
        assert data["wsUrl"].startswith("wss://voice.test/ws/v1/voice?sessionId=ssn_")

    def test_create_legacy_session_is_flagged(self, client, device_headers):
        data = create_session(client, device_headers, wakeWordModelVersion=None)
        assert data["legacyFirmware"] is True
        assert data["wakeWordModelVersion"] == "wakenet9-axi-1.0.0"

    def test_wrong_wake_word(self, client, device_headers):
        response = client.post(
            "/api/v1/speech/sessions",
            headers=device_headers,
            json={
                "deviceId": "d_001",
                "wakeWord": "庆喜儿",
                "wakeWordScore": 0.9,
                "autoDialect": True,
            },
        )
        assert response.status_code == 400
        assert response.json()["code"] == 400103

    def test_auto_dialect_required_for_session(self, client, device_headers):
        response = client.post(
            "/api/v1/speech/sessions",
            headers=device_headers,
            json={
                "deviceId": "d_001",
                "wakeWord": "阿西",
                "wakeWordScore": 0.9,
                "autoDialect": False,
            },
        )
        assert response.status_code == 400
        assert response.json()["code"] == 400101

    def test_invalid_pcm_sample_rate(self, client, device_headers):
        response = client.post(
            "/api/v1/speech/sessions",
            headers=device_headers,
            json={
                "deviceId": "d_001",
                "wakeWord": "阿西",
                "wakeWordScore": 0.9,
                "autoDialect": True,
                "audio": {"codec": "pcm", "sampleRate": 44100, "channels": 1},
            },
        )
        assert response.status_code == 400
        assert response.json()["error"] == "INVALID_ARGUMENT"

    def test_high_confidence_locks_candidate(self, client, device_headers):
        session = create_session(client, device_headers)
        data = assert_envelope(
            client.post(
                "/api/v1/speech/route",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "dialectCandidate": "cantonese",
                    "confidence": 0.91,
                    "featuresVersion": "dialect-features-v1",
                },
            )
        )
        assert data["dialect"] == "cantonese"
        assert data["dialectSource"] == "classifier"
        assert data["stability"] == "locked"

    def test_medium_confidence_uses_session_hysteresis(self, client, device_headers):
        session = create_session(client, device_headers)
        client.post(
            "/api/v1/speech/route",
            headers=device_headers,
            json={
                "sessionId": session["sessionId"],
                "dialectCandidate": "cantonese",
                "confidence": 0.95,
            },
        )
        data = assert_envelope(
            client.post(
                "/api/v1/speech/route",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "dialectCandidate": "sichuan",
                    "confidence": 0.62,
                },
            )
        )
        assert data["dialect"] == "cantonese"
        assert data["dialectSource"] == "session_hysteresis"
        assert data["stability"] == "retained"

    def test_low_confidence_uses_profile_fallback(self, client, device_headers):
        session = create_session(client, device_headers)
        data = assert_envelope(
            client.post(
                "/api/v1/speech/route",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "dialectCandidate": "henan",
                    "confidence": 0.32,
                },
            )
        )
        assert data["dialect"] == "mandarin"
        assert data["dialectSource"] == "profile_fallback"
        assert data["manualSwitchRequired"] is False

    def test_confidence_out_of_range(self, client, device_headers):
        session = create_session(client, device_headers)
        response = client.post(
            "/api/v1/speech/route",
            headers=device_headers,
            json={
                "sessionId": session["sessionId"],
                "dialectCandidate": "henan",
                "confidence": 1.2,
            },
        )
        assert response.status_code == 400
        assert response.json()["error"] == "INVALID_ARGUMENT"

    def test_unknown_session(self, client, device_headers):
        response = client.post(
            "/api/v1/speech/route",
            headers=device_headers,
            json={
                "sessionId": "ssn_missing",
                "dialectCandidate": "henan",
                "confidence": 0.8,
            },
        )
        assert response.status_code == 404

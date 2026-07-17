from __future__ import annotations

from .test_api import assert_envelope, create_session, valid_wake_package

class TestHealthAndEnvelope:
    def test_health(self, client):
        data = assert_envelope(client.get("/health"))
        assert data == {
            "status": "ok",
            "service": "qingxier-speech-server",
            "version": "1.2.0",
            "environment": "test",
        }

    def test_readiness(self, client):
        data = assert_envelope(client.get("/ready"))
        assert data["status"] == "ready"
        assert data["storage"] == "memory"

    def test_request_trace_is_preserved(self, client):
        response = client.get("/health", headers={"X-Request-Id": "client-trace-001"})
        assert response.headers["X-Trace-Id"] == "client-trace-001"
        assert response.json()["traceId"] == "client-trace-001"

    def test_invalid_trace_is_replaced(self, client):
        response = client.get("/health", headers={"X-Request-Id": "bad trace / value"})
        assert response.headers["X-Trace-Id"].startswith("trc_")

    def test_unknown_path_uses_standard_error(self, client):
        response = client.get("/not-found")
        assert response.status_code == 404
        # FastAPI's own 404 is intentionally not transformed; trace header must still exist.
        assert response.headers["X-Trace-Id"].startswith("trc_")


class TestAuthentication:
    def test_capabilities_requires_user_token(self, client):
        response = client.get("/api/v1/speech/capabilities")
        assert response.status_code == 401
        assert response.json()["error"] == "UNAUTHORIZED"

    def test_device_endpoint_rejects_user_token(self, client, user_headers):
        response = client.post(
            "/api/v1/speech/sessions",
            headers=user_headers,
            json={
                "deviceId": "d_001",
                "wakeWord": "阿西",
                "wakeWordScore": 0.9,
                "autoDialect": True,
            },
        )
        assert response.status_code == 401

    def test_admin_requires_mfa(self, client):
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers={"Authorization": "Bearer test-admin-token"},
            json=valid_wake_package(),
        )
        assert response.status_code == 403
        assert response.json()["error"] == "MFA_REQUIRED"

    def test_user_cannot_call_admin(self, client, user_headers):
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers={**user_headers, "X-MFA-Verified": "true"},
            json=valid_wake_package(),
        )
        assert response.status_code == 403
        assert response.json()["error"] == "FORBIDDEN"


class TestCapabilitiesAndProfiles:
    def test_capabilities(self, client, user_headers):
        data = assert_envelope(
            client.get("/api/v1/speech/capabilities", headers=user_headers)
        )
        assert data["autoDialect"] is True
        assert {item["code"] for item in data["supportedDialects"]} == {
            "mandarin",
            "minnan",
            "wu",
            "cantonese",
            "sichuan",
            "shaanxi",
            "henan",
            "shanghai",
        }
        assert data["tts"]["clonePrimaryModel"] == "cosyvoice-v3.5-flash"
        assert data["wakeWord"]["text"] == "阿西"

    def test_get_profile(self, client, user_headers):
        data = assert_envelope(
            client.get("/api/v1/devices/d_001/speech-profile", headers=user_headers)
        )
        assert data["version"] == 1
        assert data["autoDialect"] is True
        assert data["cloneVoiceId"] == "voice_clone_mom_001"

    def test_unknown_profile(self, client, user_headers):
        response = client.get(
            "/api/v1/devices/d_missing/speech-profile", headers=user_headers
        )
        assert response.status_code == 403
        assert response.json()["error"] == "FORBIDDEN"

    def test_update_profile_and_publish_mqtt_contract(
        self, client, user_headers, publisher
    ):
        response = client.patch(
            "/api/v1/devices/d_001/speech-profile",
            headers={**user_headers, "X-Request-Id": "trc-profile-update"},
            json={
                "autoDialect": True,
                "fallbackDialect": "cantonese",
                "cloneVoiceId": "voice_new",
                "version": 1,
            },
        )
        data = assert_envelope(response)
        assert data["version"] == 2
        assert data["fallbackDialect"] == "cantonese"
        assert publisher.events[-1]["topic"] == "device/d_001/command/down"
        assert publisher.events[-1]["payload"]["traceId"] == "trc-profile-update"
        assert publisher.events[-1]["payload"]["payload"]["profileVersion"] == 2

    def test_auto_dialect_cannot_be_disabled(self, client, user_headers):
        response = client.patch(
            "/api/v1/devices/d_001/speech-profile",
            headers=user_headers,
            json={
                "autoDialect": False,
                "fallbackDialect": "mandarin",
                "cloneVoiceId": None,
                "version": 1,
            },
        )
        assert response.status_code == 400
        assert response.json()["code"] == 400101

    def test_profile_optimistic_lock(self, client, user_headers):
        payload = {
            "autoDialect": True,
            "fallbackDialect": "sichuan",
            "cloneVoiceId": None,
            "version": 1,
        }
        assert client.patch(
            "/api/v1/devices/d_001/speech-profile", headers=user_headers, json=payload
        ).status_code == 200
        response = client.patch(
            "/api/v1/devices/d_001/speech-profile", headers=user_headers, json=payload
        )
        assert response.status_code == 409
        assert response.json()["code"] == 409102
        assert response.json()["data"]["currentVersion"] == 2

    def test_profile_rejects_unknown_fields(self, client, user_headers):
        response = client.patch(
            "/api/v1/devices/d_001/speech-profile",
            headers=user_headers,
            json={
                "autoDialect": True,
                "fallbackDialect": "mandarin",
                "cloneVoiceId": None,
                "version": 1,
                "deviceSecret": "must-not-be-accepted",
            },
        )
        assert response.status_code == 400
        assert response.json()["error"] == "INVALID_ARGUMENT"

    def test_wake_word_status(self, client, user_headers):
        data = assert_envelope(
            client.get("/api/v1/devices/d_001/wake-word/status", headers=user_headers)
        )
        assert data["wakeWord"] == "阿西"
        assert data["modelFamily"] == "WakeNet9"
        assert data["ota"]["rollbackSupported"] is True

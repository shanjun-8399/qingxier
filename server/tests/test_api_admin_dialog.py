from __future__ import annotations

from .test_api import assert_envelope, create_session, valid_wake_package

class TestAdminWakePackages:
    def test_register_package(self, client, admin_headers, repository):
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers={**admin_headers, "Idempotency-Key": "idem-wake-1"},
            json=valid_wake_package(),
        )
        data = assert_envelope(response, 201)
        assert data["wakeWord"] == "阿西"
        assert data["status"] == "registered"
        assert response.headers["Idempotency-Replayed"] == "false"
        assert repository.audit_events[-1]["action"] == "wake_word_package.register"

    def test_idempotency_replay(self, client, admin_headers):
        headers = {**admin_headers, "Idempotency-Key": "idem-wake-2"}
        first = client.post(
            "/api/v1/admin/wake-word-packages",
            headers=headers,
            json=valid_wake_package(),
        )
        second = client.post(
            "/api/v1/admin/wake-word-packages",
            headers=headers,
            json=valid_wake_package(),
        )
        assert first.status_code == 201
        assert second.status_code == 200
        assert second.headers["Idempotency-Replayed"] == "true"
        assert first.json()["data"]["packageId"] == second.json()["data"]["packageId"]

    def test_idempotency_conflict(self, client, admin_headers):
        headers = {**admin_headers, "Idempotency-Key": "idem-wake-3"}
        first_payload = valid_wake_package()
        assert client.post(
            "/api/v1/admin/wake-word-packages",
            headers=headers,
            json=first_payload,
        ).status_code == 201
        second_payload = valid_wake_package()
        second_payload["threshold"] = 0.8
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers=headers,
            json=second_payload,
        )
        assert response.status_code == 409
        assert response.json()["error"] == "IDEMPOTENCY_CONFLICT"

    def test_duplicate_version_without_idempotency(self, client, admin_headers):
        assert client.post(
            "/api/v1/admin/wake-word-packages",
            headers=admin_headers,
            json=valid_wake_package(),
        ).status_code == 201
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers=admin_headers,
            json=valid_wake_package(),
        )
        assert response.status_code == 409

    def test_wrong_wake_word_package(self, client, admin_headers):
        payload = valid_wake_package()
        payload["wakeWord"] = "庆喜儿"
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers=admin_headers,
            json=payload,
        )
        assert response.status_code == 400
        assert response.json()["code"] == 400103

    def test_invalid_sha256(self, client, admin_headers):
        payload = valid_wake_package()
        payload["sha256"] = "ABC"
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers=admin_headers,
            json=payload,
        )
        assert response.status_code == 400
        assert response.json()["error"] == "INVALID_ARGUMENT"

    def test_same_current_and_rollback_version(self, client, admin_headers):
        payload = valid_wake_package()
        payload["rollbackVersion"] = payload["version"]
        response = client.post(
            "/api/v1/admin/wake-word-packages",
            headers=admin_headers,
            json=payload,
        )
        assert response.status_code == 400


class TestDialogCompatibility:
    def test_text_dialog_uses_llm_and_clone_tts(
        self, client, user_headers, tts_provider
    ):
        data = assert_envelope(
            client.post(
                "/api/v1/dialogs/text",
                headers=user_headers,
                json={
                    "deviceId": "d_001",
                    "mode": "adult",
                    "persona": "mom",
                    "text": "我今天有点累",
                    "dialect": "sichuan",
                },
            )
        )
        assert data["replyText"] == "收到：我今天有点累"
        assert data["detectedDialect"] == "sichuan"
        assert data["ttsModel"] == "cosyvoice-v3.5-flash"
        assert data["voiceMode"] == "cloned_voice"
        assert tts_provider.calls[-1]["instruction"] == "请用四川话表达。"

    def test_dialog_requires_user(self, client):
        response = client.post(
            "/api/v1/dialogs/text",
            json={
                "deviceId": "d_001",
                "mode": "adult",
                "persona": "mom",
                "text": "你好",
                "dialect": "mandarin",
            },
        )
        assert response.status_code == 401

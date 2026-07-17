from __future__ import annotations

from .test_api import assert_envelope, create_session, valid_wake_package

class TestTtsRouting:
    def test_clone_voice_uses_cosyvoice_and_dialect_instruction(
        self, client, device_headers, tts_provider
    ):
        session = create_session(client, device_headers)
        data = assert_envelope(
            client.post(
                "/api/v1/speech/tts",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "text": "食饱未",
                    "dialect": "minnan",
                    "voiceId": "voice_clone_mom_001",
                    "persona": "mom",
                    "stream": False,
                },
            )
        )
        assert data["model"] == "cosyvoice-v3.5-flash"
        assert data["voiceMode"] == "cloned_voice"
        assert data["providerDialect"] == "闽南话"
        assert data["degraded"] is False
        assert tts_provider.calls[-1]["instruction"] == "请用闽南话表达。"

    def test_generic_wu_is_explicitly_mapped_to_shanghai(self, client, device_headers):
        session = create_session(client, device_headers)
        data = assert_envelope(
            client.post(
                "/api/v1/speech/tts",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "text": "侬好",
                    "dialect": "wu",
                    "voiceId": "voice_clone_mom_001",
                },
            )
        )
        assert data["providerDialect"] == "上海话"
        assert data["degraded"] is True
        assert data["fallbackReason"] == "WU_GENERIC_MAPPED_TO_SHANGHAI"

    def test_qwen_system_model_rejects_clone_voice(self, client, device_headers):
        session = create_session(client, device_headers)
        response = client.post(
            "/api/v1/speech/tts",
            headers=device_headers,
            json={
                "sessionId": session["sessionId"],
                "text": "你好",
                "dialect": "mandarin",
                "voiceId": "voice_clone_mom_001",
                "model": "qwen3-tts-flash",
            },
        )
        assert response.status_code == 409
        assert response.json()["code"] == 409101

    def test_missing_request_voice_uses_profile_clone(self, client, device_headers):
        session = create_session(client, device_headers)
        data = assert_envelope(
            client.post(
                "/api/v1/speech/tts",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "text": "你好",
                    "dialect": "mandarin",
                },
            )
        )
        assert data["voiceId"] == "voice_clone_mom_001"
        assert data["voiceMode"] == "cloned_voice"

    def test_no_clone_voice_uses_system_fallback(
        self, client, user_headers, device_headers
    ):
        client.patch(
            "/api/v1/devices/d_001/speech-profile",
            headers=user_headers,
            json={
                "autoDialect": True,
                "fallbackDialect": "mandarin",
                "cloneVoiceId": None,
                "version": 1,
            },
        )
        session = create_session(client, device_headers)
        data = assert_envelope(
            client.post(
                "/api/v1/speech/tts",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "text": "你好",
                    "dialect": "cantonese",
                },
            )
        )
        assert data["voiceMode"] == "system_voice"
        assert data["model"] == "qwen3-tts-flash"
        assert data["degraded"] is True
        assert data["fallbackReason"] == "CLONE_VOICE_UNAVAILABLE"
        assert data["providerDialect"] == "普通话"

    def test_clone_provider_failure_uses_system_fallback(
        self, client, device_headers, tts_provider
    ):
        tts_provider.fail_models.add("cosyvoice-v3.5-flash")
        session = create_session(client, device_headers)
        data = assert_envelope(
            client.post(
                "/api/v1/speech/tts",
                headers=device_headers,
                json={
                    "sessionId": session["sessionId"],
                    "text": "你好",
                    "dialect": "sichuan",
                    "voiceId": "voice_clone_mom_001",
                },
            )
        )
        assert data["voiceMode"] == "system_voice"
        assert data["fallbackReason"] == "CLONE_PROVIDER_UNAVAILABLE"
        assert [call["model"] for call in tts_provider.calls] == [
            "cosyvoice-v3.5-flash",
            "qwen3-tts-flash",
        ]

    def test_all_tts_providers_fail(self, client, device_headers, tts_provider):
        tts_provider.fail_models.update({"cosyvoice-v3.5-flash", "qwen3-tts-flash"})
        session = create_session(client, device_headers)
        response = client.post(
            "/api/v1/speech/tts",
            headers=device_headers,
            json={
                "sessionId": session["sessionId"],
                "text": "你好",
                "dialect": "sichuan",
                "voiceId": "voice_clone_mom_001",
            },
        )
        assert response.status_code == 503
        assert response.json()["code"] == 503102

    def test_empty_tts_text(self, client, device_headers):
        session = create_session(client, device_headers)
        response = client.post(
            "/api/v1/speech/tts",
            headers=device_headers,
            json={
                "sessionId": session["sessionId"],
                "text": "   ",
                "dialect": "mandarin",
            },
        )
        assert response.status_code == 400

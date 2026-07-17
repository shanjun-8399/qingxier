from __future__ import annotations

from .base import ReferenceTestCase
from .case_meta import case


class ServerFunctionalTests(ReferenceTestCase):
    @case("SF-001", "健康检查与版本可用", "返回 HTTP 200、status=ok、版本 1.1.0", "服务器功能")
    def test_health_check(self) -> None:
        response = self.api.request("GET", "/health", auth="none")
        self.assertEqual(200, response.status)
        self.assertEqual("ok", response.body["data"]["status"])
        self.assertEqual("1.1.0", response.body["data"]["version"])

    @case("SF-002", "语音能力覆盖新需求方言", "能力清单包含闽南、吴、粤、四川、陕西、河南、上海并启用自动识别", "服务器功能")
    def test_capabilities_cover_required_dialects(self) -> None:
        response = self.api.request("GET", "/api/v1/speech/capabilities")
        data = response.body["data"]
        codes = {item["code"] for item in data["supportedDialects"]}
        self.assertTrue({"minnan", "wu", "cantonese", "sichuan", "shaanxi", "henan", "shanghai"}.issubset(codes))
        self.assertTrue(data["autoDialect"])

    @case("SF-003", "默认语音配置无需手动切换", "autoDialect=true，存在普通话兜底和克隆音色绑定", "服务器功能")
    def test_default_speech_profile(self) -> None:
        response = self.api.request("GET", "/api/v1/devices/d_001/speech-profile")
        data = response.body["data"]
        self.assertTrue(data["autoDialect"])
        self.assertEqual("mandarin", data["fallbackDialect"])
        self.assertTrue(data["cloneVoiceId"].startswith("voice_clone_"))

    @case("SF-004", "语音配置更新保持自动识别", "修改兜底方言后 autoDialect 仍为 true", "服务器功能")
    def test_update_profile_keeps_auto_detection(self) -> None:
        response = self.api.request(
            "PATCH",
            "/api/v1/devices/d_001/speech-profile",
            body={"autoDialect": True, "fallbackDialect": "cantonese"},
        )
        data = response.body["data"]
        self.assertTrue(data["autoDialect"])
        self.assertEqual("cantonese", data["fallbackDialect"])
        # Restore for subsequent independent cases.
        self.api.request(
            "PATCH",
            "/api/v1/devices/d_001/speech-profile",
            body={"autoDialect": True, "fallbackDialect": "mandarin"},
        )

    @case("SF-005", "高置信度方言自动锁定", "置信度 >=0.75 时采用候选方言并锁定会话", "服务器功能")
    def test_high_confidence_dialect_lock(self) -> None:
        session = self.create_session()
        response = self.api.request(
            "POST",
            "/api/v1/speech/route",
            auth="device",
            body={"sessionId": session, "dialectCandidate": "cantonese", "confidence": 0.93},
        )
        data = response.body["data"]
        self.assertEqual("cantonese", data["dialect"])
        self.assertEqual("classifier", data["dialectSource"])
        self.assertEqual("locked", data["stability"])
        self.assertFalse(data["manualSwitchRequired"])

    @case("SF-006", "中置信度使用会话滞回", "0.55-0.75 之间沿用上一轮稳定方言", "服务器功能")
    def test_medium_confidence_hysteresis(self) -> None:
        session = self.create_session()
        response = self.api.request(
            "POST",
            "/api/v1/speech/route",
            auth="device",
            body={
                "sessionId": session,
                "dialectCandidate": "henan",
                "confidence": 0.63,
                "previousDialect": "sichuan",
            },
        )
        data = response.body["data"]
        self.assertEqual("sichuan", data["dialect"])
        self.assertEqual("session_hysteresis", data["dialectSource"])

    @case("SF-007", "低置信度自动兜底", "置信度 <0.55 时使用设备语音配置兜底且不要求手动选择", "服务器功能")
    def test_low_confidence_profile_fallback(self) -> None:
        session = self.create_session()
        response = self.api.request(
            "POST",
            "/api/v1/speech/route",
            auth="device",
            body={"sessionId": session, "dialectCandidate": "minnan", "confidence": 0.31},
        )
        data = response.body["data"]
        self.assertEqual("mandarin", data["dialect"])
        self.assertEqual("profile_fallback", data["dialectSource"])
        self.assertFalse(data["manualSwitchRequired"])

    @case("SF-008", "克隆音色方言合成使用 CosyVoice", "带 voiceId 的方言 TTS 选择 cosyvoice-v3.5-flash", "服务器功能")
    def test_clone_tts_routes_to_cosyvoice(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/tts",
            auth="device",
            body={"text": "食饱未", "dialect": "minnan", "voiceId": "voice_clone_mom_001"},
        )
        data = response.body["data"]
        self.assertEqual("cosyvoice-v3.5-flash", data["model"])
        self.assertEqual("cloned_voice", data["voiceMode"])
        self.assertEqual("闽南话", data["providerDialect"])

    @case("SF-009", "系统音色降级使用 Qwen3-TTS", "无 voiceId 时选择 qwen3-tts-flash-realtime 且不伪装克隆", "服务器功能")
    def test_system_voice_fallback_routes_to_qwen(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/tts",
            auth="device",
            body={"text": "你好", "dialect": "shaanxi"},
        )
        data = response.body["data"]
        self.assertEqual("qwen3-tts-flash-realtime", data["model"])
        self.assertEqual("system_voice", data["voiceMode"])
        self.assertIsNone(data["voiceId"])

    @case("SF-010", "泛吴语合成显式降级", "吴语请求映射上海话并返回 degraded/fallbackReason", "服务器功能")
    def test_wu_tts_explicit_degradation(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/tts",
            auth="device",
            body={"text": "今朝天气蛮好", "dialect": "wu", "voiceId": "voice_clone_mom_001"},
        )
        data = response.body["data"]
        self.assertTrue(data["degraded"])
        self.assertEqual("上海话", data["providerDialect"])
        self.assertEqual("WU_GENERIC_MAPPED_TO_SHANGHAI", data["fallbackReason"])

    @case("SF-011", "唤醒词状态为阿西并支持 OTA 回滚", "设备返回“阿西”、WakeNet9、wake_words 包类型和 rollbackSupported=true", "服务器功能")
    def test_wake_word_status(self) -> None:
        response = self.api.request("GET", "/api/v1/devices/d_001/wake-word/status")
        data = response.body["data"]
        self.assertEqual("阿西", data["wakeWord"])
        self.assertEqual("WakeNet9", data["modelFamily"])
        self.assertEqual("wake_words", data["ota"]["packageType"])
        self.assertTrue(data["ota"]["rollbackSupported"])

    @case("SF-012", "唤醒词包登记与幂等", "合法 WakeNet9“阿西”包登记成功，重复 Idempotency-Key 返回同一包", "服务器功能")
    def test_wake_package_registration_idempotency(self) -> None:
        payload = {
            "wakeWord": "阿西",
            "modelFamily": "WakeNet9",
            "version": "1.0.1",
            "sha256": "a" * 64,
        }
        headers = {"Idempotency-Key": "wake-package-001"}
        first = self.api.request("POST", "/api/v1/admin/wake-word-packages", auth="admin", body=payload, headers=headers)
        second = self.api.request("POST", "/api/v1/admin/wake-word-packages", auth="admin", body=payload, headers=headers)
        self.assertEqual(201, first.status)
        self.assertEqual(200, second.status)
        self.assertEqual(first.body["data"]["packageId"], second.body["data"]["packageId"])

    @case("SF-013", "文字调试对话继承克隆音色路由", "对话响应包含自动方言、克隆 voiceId 和 CosyVoice 模型", "服务器功能")
    def test_dialog_text_contract(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/dialogs/text",
            body={"deviceId": "d_001", "text": "今儿个咋样", "dialect": "henan"},
        )
        data = response.body["data"]
        self.assertTrue(data["autoDialect"])
        self.assertEqual("henan", data["detectedDialect"])
        self.assertEqual("cosyvoice-v3.5-flash", data["ttsModel"])
        self.assertTrue(data["voiceId"].startswith("voice_clone_"))

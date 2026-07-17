from __future__ import annotations

from .base import ReferenceTestCase
from .case_meta import case


class ServerApiTests(ReferenceTestCase):
    @case("SA-001", "未认证访问受保护接口", "返回 401001/UNAUTHORIZED", "服务器接口")
    def test_missing_user_token(self) -> None:
        response = self.api.request("GET", "/api/v1/speech/capabilities", auth="none", raise_for_status=False)
        self.assertEqual(401, response.status)
        self.assertEqual(401001, response.body["code"])
        self.assertEqual("UNAUTHORIZED", response.body["error"])

    @case("SA-002", "错误用户 Token", "返回 401 且不泄露内部异常", "服务器接口")
    def test_invalid_user_token(self) -> None:
        old = self.api.user_token
        self.api.user_token = "invalid"
        try:
            response = self.api.request("GET", "/api/v1/speech/capabilities", raise_for_status=False)
        finally:
            self.api.user_token = old
        self.assertEqual(401, response.status)
        self.assertNotIn("Traceback", response.body["message"])

    @case("SA-003", "非法 JSON 报文", "返回 400001/INVALID_JSON", "服务器接口")
    def test_invalid_json(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/sessions",
            auth="device",
            headers={"Content-Type": "application/json"},
            raw_body=b"{not-json",
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual("INVALID_JSON", response.body["error"])

    @case("SA-004", "错误唤醒词拒绝", "旧唤醒词“庆喜儿”返回 WAKE_WORD_MISMATCH", "服务器接口")
    def test_old_wake_word_rejected(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/sessions",
            auth="device",
            body={"deviceId": "d_001", "wakeWord": "庆喜儿", "autoDialect": True},
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual("WAKE_WORD_MISMATCH", response.body["error"])

    @case("SA-005", "关闭自动方言识别被拒绝", "autoDialect=false 返回 AUTO_DIALECT_REQUIRED", "服务器接口")
    def test_auto_dialect_cannot_be_disabled(self) -> None:
        response = self.api.request(
            "PATCH",
            "/api/v1/devices/d_001/speech-profile",
            body={"autoDialect": False},
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual("AUTO_DIALECT_REQUIRED", response.body["error"])

    @case("SA-006", "不支持方言值校验", "未知方言返回 400001/UNSUPPORTED_DIALECT", "服务器接口")
    def test_unsupported_dialect(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/tts",
            auth="device",
            body={"text": "测试", "dialect": "unknown-dialect", "voiceId": "v1"},
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual("UNSUPPORTED_DIALECT", response.body["error"])

    @case("SA-007", "Qwen3-TTS 克隆音色冲突校验", "指定 qwen3-tts + voiceId 返回 409101", "服务器接口")
    def test_qwen_clone_conflict(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/tts",
            auth="device",
            body={
                "text": "测试",
                "dialect": "sichuan",
                "voiceId": "voice_clone_mom_001",
                "model": "qwen3-tts-flash",
            },
            raise_for_status=False,
        )
        self.assertEqual(409, response.status)
        self.assertEqual(409101, response.body["code"])
        self.assertEqual("VOICE_CLONE_UNSUPPORTED_BY_MODEL", response.body["error"])

    @case("SA-008", "TTS 空文本校验", "空白 text 返回 400001", "服务器接口")
    def test_empty_tts_text(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/speech/tts",
            auth="device",
            body={"text": "   ", "dialect": "mandarin"},
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual(400001, response.body["code"])

    @case("SA-009", "不存在设备返回 404", "未知 deviceId 返回 404001/NOT_FOUND", "服务器接口")
    def test_unknown_device(self) -> None:
        response = self.api.request(
            "GET",
            "/api/v1/devices/d_missing/wake-word/status",
            raise_for_status=False,
        )
        self.assertEqual(404, response.status)
        self.assertEqual("NOT_FOUND", response.body["error"])

    @case("SA-010", "管理员接口权限控制", "普通用户调用唤醒词包接口返回 403001", "服务器接口")
    def test_admin_permission(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/admin/wake-word-packages",
            auth="user",
            body={"wakeWord": "阿西", "modelFamily": "WakeNet9", "version": "1.0.1", "sha256": "a" * 64},
            raise_for_status=False,
        )
        self.assertEqual(403, response.status)
        self.assertEqual(403001, response.body["code"])

    @case("SA-011", "错误模型家族校验", "非 WakeNet9 包返回 INVALID_MODEL_FAMILY", "服务器接口")
    def test_invalid_wake_model_family(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/admin/wake-word-packages",
            auth="admin",
            body={"wakeWord": "阿西", "modelFamily": "OtherNet", "version": "1.0.1", "sha256": "a" * 64},
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual("INVALID_MODEL_FAMILY", response.body["error"])

    @case("SA-012", "唤醒词包哈希校验", "非法 sha256 返回 INVALID_ARGUMENT", "服务器接口")
    def test_invalid_wake_package_sha(self) -> None:
        response = self.api.request(
            "POST",
            "/api/v1/admin/wake-word-packages",
            auth="admin",
            body={"wakeWord": "阿西", "modelFamily": "WakeNet9", "version": "1.0.1", "sha256": "bad"},
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual("INVALID_ARGUMENT", response.body["error"])

    @case("SA-013", "标准响应与追踪 ID", "成功和失败响应均包含 code/message/data/traceId，X-Request-Id 可贯通", "服务器接口")
    def test_standard_response_and_trace(self) -> None:
        response = self.api.request("GET", "/api/v1/speech/capabilities")
        self.assertEqual({"code", "message", "data", "traceId"}, set(response.body.keys()))
        self.assertEqual("test-request-id", response.body["traceId"])
        self.assertEqual("test-request-id", response.headers["X-Trace-Id"])

    @case("SA-014", "能力接口模型字段完整", "返回 ASR 主模型、克隆 TTS 主模型、系统音色降级模型和唤醒模型版本", "服务器接口")
    def test_capability_schema(self) -> None:
        data = self.api.request("GET", "/api/v1/speech/capabilities").body["data"]
        self.assertEqual("fun-asr-realtime", data["asr"]["primaryModel"])
        self.assertEqual("cosyvoice-v3.5-flash", data["tts"]["clonePrimaryModel"])
        self.assertEqual("qwen3-tts-flash-realtime", data["tts"]["systemVoiceFallbackModel"])
        self.assertEqual("wakenet9-axi-1.0.0", data["wakeWord"]["currentVersion"])

    @case("SA-015", "置信度范围校验", "confidence 超出 0-1 返回 INVALID_ARGUMENT", "服务器接口")
    def test_confidence_range_validation(self) -> None:
        session = self.create_session()
        response = self.api.request(
            "POST",
            "/api/v1/speech/route",
            auth="device",
            body={"sessionId": session, "dialectCandidate": "henan", "confidence": 1.5},
            raise_for_status=False,
        )
        self.assertEqual(400, response.status)
        self.assertEqual("INVALID_ARGUMENT", response.body["error"])

    @case("SA-016", "未知接口统一 404", "不存在路径返回标准 404001，而非 HTML 错误页", "服务器接口")
    def test_unknown_route_standard_404(self) -> None:
        response = self.api.request("GET", "/api/v1/not-exist", raise_for_status=False)
        self.assertEqual(404, response.status)
        self.assertEqual(404001, response.body["code"])
        self.assertEqual("application/json; charset=utf-8", response.headers["Content-Type"])

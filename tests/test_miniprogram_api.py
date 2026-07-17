from __future__ import annotations

from urllib.parse import quote

from .base import ReferenceTestCase
from .case_meta import case
from .http_client import ApiClientError, HttpClient
from .mini_program_client import MiniProgramState


class MiniProgramApiTests(ReferenceTestCase):
    def setUp(self) -> None:
        self.client = HttpClient(self.server.base_url)
        self.state = MiniProgramState(self.client)

    @case("MA-001", "用户接口携带 Bearer Token", "小程序请求头包含 Authorization: Bearer，且无设备密钥", "小程序接口")
    def test_user_auth_header(self) -> None:
        self.client.request("GET", "/api/v1/speech/capabilities")
        headers = self.client.last_request["headers"]
        self.assertEqual("Bearer test-user-token", headers["Authorization"])
        self.assertNotIn("X-Device-Token", headers)

    @case("MA-002", "设备接口使用设备 Token", "语音路由/TTS 请求只携带 X-Device-Token", "小程序接口")
    def test_device_auth_header(self) -> None:
        self.client.request(
            "POST",
            "/api/v1/speech/tts",
            auth="device",
            body={"text": "测试", "dialect": "mandarin"},
        )
        headers = self.client.last_request["headers"]
        self.assertEqual("test-device-token", headers["X-Device-Token"])
        self.assertNotIn("Authorization", headers)

    @case("MA-003", "统一错误对象解析", "HTTP 4xx 可解析 code/error/message/traceId", "小程序接口")
    def test_standard_error_parsing(self) -> None:
        try:
            self.client.request(
                "POST",
                "/api/v1/speech/tts",
                auth="device",
                body={"text": "测试", "dialect": "bad"},
            )
            self.fail("Expected ApiClientError")
        except ApiClientError as exc:
            body = exc.response.body
            self.assertEqual(400001, body["code"])
            self.assertEqual("UNSUPPORTED_DIALECT", body["error"])
            self.assertTrue(body["traceId"])

    @case("MA-004", "语音配置 GET 契约", "返回 deviceId/autoDialect/fallbackDialect/阈值/cloneVoiceId", "小程序接口")
    def test_speech_profile_get_schema(self) -> None:
        data = self.client.request("GET", "/api/v1/devices/d_001/speech-profile").body["data"]
        required = {"deviceId", "autoDialect", "fallbackDialect", "highConfidenceThreshold", "mediumConfidenceThreshold", "cloneVoiceId"}
        self.assertTrue(required.issubset(data.keys()))

    @case("MA-005", "语音配置 PATCH 契约", "请求体仅提交可编辑字段并返回更新后的完整配置", "小程序接口")
    def test_speech_profile_patch_schema(self) -> None:
        response = self.client.request(
            "PATCH",
            "/api/v1/devices/d_001/speech-profile",
            body={"autoDialect": True, "fallbackDialect": "henan"},
        )
        self.assertEqual("henan", response.body["data"]["fallbackDialect"])
        self.assertEqual({"autoDialect": True, "fallbackDialect": "henan"}, self.client.last_request["body"])
        self.client.request(
            "PATCH",
            "/api/v1/devices/d_001/speech-profile",
            body={"autoDialect": True, "fallbackDialect": "mandarin"},
        )

    @case("MA-006", "方言路由请求字段", "请求包含 sessionId/dialectCandidate/confidence，可选 previousDialect", "小程序接口")
    def test_route_request_payload(self) -> None:
        self.state.bootstrap("d_001")
        session = self.create_session()
        self.state.route_speech(session, "shaanxi", 0.88, previous="henan")
        body = self.state.api.last_request["body"]
        self.assertEqual({"sessionId", "dialectCandidate", "confidence", "previousDialect"}, set(body.keys()))

    @case("MA-007", "方言路由响应字段", "响应包含 dialect/confidence/source/stability/manualSwitchRequired", "小程序接口")
    def test_route_response_schema(self) -> None:
        session = self.create_session()
        data = self.client.request(
            "POST",
            "/api/v1/speech/route",
            auth="device",
            body={"sessionId": session, "dialectCandidate": "shanghai", "confidence": 0.9},
        ).body["data"]
        required = {"dialect", "dialectConfidence", "dialectSource", "stability", "manualSwitchRequired"}
        self.assertTrue(required.issubset(data.keys()))

    @case("MA-008", "TTS 请求字段", "请求包含 text/dialect/voiceId，克隆场景不指定不兼容模型", "小程序接口")
    def test_tts_request_payload(self) -> None:
        self.state.preview_voice("你好", "sichuan", voice_id="voice_clone_mom_001")
        body = self.state.api.last_request["body"]
        self.assertEqual("你好", body["text"])
        self.assertEqual("sichuan", body["dialect"])
        self.assertEqual("voice_clone_mom_001", body["voiceId"])
        self.assertNotIn("model", body)

    @case("MA-009", "TTS 响应降级字段", "响应包含 model/voiceMode/providerDialect/degraded/fallbackReason", "小程序接口")
    def test_tts_response_schema(self) -> None:
        data = self.state.preview_voice("今朝好", "wu", voice_id="voice_clone_mom_001")
        required = {"model", "voiceMode", "providerDialect", "degraded", "fallbackReason", "audio"}
        self.assertTrue(required.issubset(data.keys()))

    @case("MA-010", "唤醒词状态接口契约", "返回 wakeWord/modelVersion/threshold/AFE/AEC/降噪/OTA 状态", "小程序接口")
    def test_wake_status_schema(self) -> None:
        data = self.client.request("GET", "/api/v1/devices/d_001/wake-word/status").body["data"]
        required = {"wakeWord", "modelVersion", "threshold", "afeEnabled", "aecEnabled", "noiseSuppressionEnabled", "ota"}
        self.assertTrue(required.issubset(data.keys()))

    @case("MA-011", "敏感凭据不进入 UI 状态", "序列化公共状态不含 user_token/device_token/Authorization", "小程序接口")
    def test_no_secret_leak_in_state(self) -> None:
        self.state.bootstrap("d_001")
        snapshot = str(self.state.public_snapshot())
        self.assertNotIn("test-user-token", snapshot)
        self.assertNotIn("test-device-token", snapshot)
        self.assertNotIn("Authorization", snapshot)

    @case("MA-012", "设备 ID URL 编码", "包含斜杠的 deviceId 经过 URL 编码，不形成路径注入", "小程序接口")
    def test_device_id_url_encoding(self) -> None:
        malicious = "d_001/../../admin"
        encoded = quote(malicious, safe="")
        self.assertNotIn("/", encoded)
        state = MiniProgramState(self.client)
        # The encoded ID is safely treated as a single resource ID and returns 404.
        with self.assertRaises(ApiClientError) as ctx:
            state.bootstrap(malicious)
        self.assertEqual(404, ctx.exception.response.status)

    @case("MA-013", "请求追踪 ID 记录", "小程序保存服务端 traceId 便于客服与日志定位", "小程序接口")
    def test_trace_id_capture(self) -> None:
        self.state.bootstrap("d_001")
        self.assertEqual("test-request-id", self.state.last_trace_id)

    @case("MA-014", "Qwen 克隆冲突错误可处理", "服务端 409101 被客户端识别为业务错误而非网络异常", "小程序接口")
    def test_qwen_clone_business_error(self) -> None:
        with self.assertRaises(ApiClientError) as ctx:
            self.state.preview_voice(
                "测试",
                "sichuan",
                voice_id="voice_clone_mom_001",
                model="qwen3-tts-flash",
            )
        self.assertEqual(409, ctx.exception.response.status)
        self.assertEqual(409101, ctx.exception.response.body["code"])

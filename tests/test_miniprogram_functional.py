from __future__ import annotations

from .base import ReferenceTestCase
from .case_meta import case
from .http_client import HttpClient
from .mini_program_client import MiniProgramState


class MiniProgramFunctionalTests(ReferenceTestCase):
    def setUp(self) -> None:
        self.state = MiniProgramState(HttpClient(self.server.base_url))

    @case("MF-001", "设备控制台初始化", "一次初始化加载能力、语音配置和唤醒词状态", "小程序功能")
    def test_bootstrap(self) -> None:
        self.state.bootstrap("d_001")
        self.assertIsNotNone(self.state.capabilities)
        self.assertIsNotNone(self.state.speech_profile)
        self.assertIsNotNone(self.state.wake_status)
        self.assertEqual("/pages/device/console", self.state.route)

    @case("MF-002", "不展示手动方言切换器", "自动识别启用时 UI 不出现手动方言选择控件", "小程序功能")
    def test_manual_selector_hidden(self) -> None:
        self.state.bootstrap("d_001")
        self.assertTrue(self.state.speech_profile["autoDialect"])
        self.assertFalse(self.state.manual_dialect_selector_visible)

    @case("MF-003", "控制台显示新唤醒词", "唤醒词区域显示“阿西”和当前模型版本", "小程序功能")
    def test_wake_word_display(self) -> None:
        self.state.bootstrap("d_001")
        self.assertEqual("阿西", self.state.wake_status["wakeWord"])
        self.assertEqual("wakenet9-axi-1.0.0", self.state.wake_status["modelVersion"])

    @case("MF-004", "高置信度方言状态更新", "收到粤语高置信度结果后显示“粤语”且无降级提示", "小程序功能")
    def test_high_confidence_dialect_indicator(self) -> None:
        self.state.bootstrap("d_001")
        session = self.create_session()
        data = self.state.route_speech(session, "cantonese", 0.92)
        self.assertEqual("cantonese", self.state.detected_dialect)
        self.assertEqual("粤语", self.state.detected_label)
        self.assertEqual("classifier", data["dialectSource"])
        self.assertIsNone(self.state.banner)

    @case("MF-005", "低置信度自动兜底提示", "低置信度时显示自动兜底说明而非要求用户手动切换", "小程序功能")
    def test_low_confidence_banner(self) -> None:
        self.state.bootstrap("d_001")
        session = self.create_session()
        data = self.state.route_speech(session, "minnan", 0.22)
        self.assertEqual("profile_fallback", data["dialectSource"])
        self.assertIn("自动使用", self.state.banner)
        self.assertFalse(self.state.manual_dialect_selector_visible)

    @case("MF-006", "会话滞回提示", "中置信度沿用上一轮四川话并向用户做轻量提示", "小程序功能")
    def test_hysteresis_banner(self) -> None:
        self.state.bootstrap("d_001")
        session = self.create_session()
        data = self.state.route_speech(session, "henan", 0.62, previous="sichuan")
        self.assertEqual("sichuan", data["dialect"])
        self.assertIn("沿用本轮对话", self.state.banner)

    @case("MF-007", "克隆音色试听", "试听闽南语时返回 CosyVoice 克隆音色", "小程序功能")
    def test_clone_voice_preview(self) -> None:
        self.state.bootstrap("d_001")
        data = self.state.preview_voice("食饱未", "minnan", voice_id="voice_clone_mom_001")
        self.assertEqual("cosyvoice-v3.5-flash", data["model"])
        self.assertEqual("cloned_voice", data["voiceMode"])

    @case("MF-008", "吴语泛化降级提示", "泛吴语映射上海话时展示可解释降级提示", "小程序功能")
    def test_wu_degradation_banner(self) -> None:
        self.state.bootstrap("d_001")
        data = self.state.preview_voice("今朝天气蛮好", "wu", voice_id="voice_clone_mom_001")
        self.assertTrue(data["degraded"])
        self.assertIn("映射为上海话", self.state.banner)

    @case("MF-009", "登录过期跳转", "Token 失效时跳转登录页并给出提示", "小程序功能")
    def test_expired_login_redirect(self) -> None:
        state = MiniProgramState(HttpClient(self.server.base_url, user_token="expired"))
        state.bootstrap("d_001")
        self.assertEqual("/pages/login", state.route)
        self.assertIn("登录已过期", state.banner)

    @case("MF-010", "网络异常重试状态", "接口不可达时展示重试按钮，不崩溃", "小程序功能")
    def test_network_error_state(self) -> None:
        state = MiniProgramState(HttpClient("http://127.0.0.1:1"))
        state.bootstrap("d_001")
        self.assertTrue(state.retry_visible)
        self.assertIn("网络异常", state.banner)

    @case("MF-011", "兜底方言配置保存", "小程序可保存自动识别的兜底方言，仍保持 autoDialect=true", "小程序功能")
    def test_update_fallback_dialect(self) -> None:
        self.state.bootstrap("d_001")
        self.state.update_fallback_dialect("sichuan")
        self.assertEqual("sichuan", self.state.speech_profile["fallbackDialect"])
        self.assertTrue(self.state.speech_profile["autoDialect"])
        self.state.update_fallback_dialect("mandarin")

    @case("MF-012", "能力覆盖完整展示", "小程序能力缓存包含七类目标方言和模型路由", "小程序功能")
    def test_capability_cache(self) -> None:
        self.state.bootstrap("d_001")
        codes = {d["code"] for d in self.state.capabilities["supportedDialects"]}
        self.assertTrue({"minnan", "wu", "cantonese", "sichuan", "shaanxi", "henan", "shanghai"}.issubset(codes))
        self.assertEqual("cosyvoice-v3.5-flash", self.state.capabilities["tts"]["clonePrimaryModel"])

    @case("MF-013", "操作审计事件记录", "初始化、方言路由和 TTS 试听生成可追踪的本地审计事件", "小程序功能")
    def test_local_audit_events(self) -> None:
        self.state.bootstrap("d_001")
        session = self.create_session()
        self.state.route_speech(session, "shanghai", 0.91)
        self.state.preview_voice("侬好", "shanghai", voice_id="voice_clone_mom_001")
        self.assertIn("bootstrap_success", self.state.audit_events)
        self.assertTrue(any(e.startswith("dialect:shanghai") for e in self.state.audit_events))
        self.assertTrue(any(e.startswith("tts:cosyvoice") for e in self.state.audit_events))

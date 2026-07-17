from __future__ import annotations

from typing import Any

from .domain import TtsRequest, WakeWordPackageCreate
from .errors import DomainError
from .security import Principal
from .services import SpeechService


class HardenedSpeechService(SpeechService):
    """服务器核心服务的安全与可用性保护层。

    REST 与 WebSocket 共用同一个服务实例，因此这里的校验不会因接入协议
    不同而被绕过。
    """

    def synthesize(
        self,
        principal: Principal,
        body: TtsRequest,
        trace_id: str,
    ) -> dict[str, Any]:
        session = self.repository.get_session(body.sessionId)
        if session:
            profile = self.repository.get_profile(session["deviceId"])
            configured_voice_id = profile.get("cloneVoiceId") if profile else None
            if body.voiceId is not None and body.voiceId != configured_voice_id:
                raise DomainError(
                    403,
                    403101,
                    "VOICE_NOT_BOUND",
                    "请求的克隆音色未绑定到当前设备",
                )

        approved_models = {
            self.settings.clone_tts_model,
            self.settings.qwen_system_tts_model,
        }
        if body.model is not None and body.model not in approved_models:
            raise DomainError(
                400,
                400105,
                "UNSUPPORTED_TTS_MODEL",
                "请求的 TTS 模型未在服务端允许列表中",
            )
        return super().synthesize(principal, body, trace_id)

    def register_wake_package(
        self,
        principal: Principal,
        body: WakeWordPackageCreate,
        idempotency_key: str | None,
        trace_id: str,
    ) -> tuple[dict[str, Any], bool]:
        if idempotency_key is not None:
            idempotency_key = idempotency_key.strip()
            if not idempotency_key or len(idempotency_key) > 128:
                raise DomainError(
                    400,
                    400001,
                    "INVALID_ARGUMENT",
                    "Idempotency-Key 长度必须为 1 到 128 个字符",
                )
        return super().register_wake_package(
            principal,
            body,
            idempotency_key,
            trace_id,
        )

    def readiness(self) -> dict[str, Any]:
        try:
            storage_ready = bool(self.repository.ping())
            reason = None
        except Exception as exc:  # 仓储适配器负责具体驱动异常类型
            storage_ready = False
            reason = type(exc).__name__
        return {
            "status": "ready" if storage_ready else "not_ready",
            "storage": self.settings.storage_backend,
            "events": self.settings.event_backend,
            "speechProvider": self.settings.provider_mode,
            "reason": reason,
        }

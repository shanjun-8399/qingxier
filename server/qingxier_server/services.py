from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any
from urllib.parse import quote

from .config import Settings
from .domain import (
    DialogTextRequest,
    DialectRouteRequest,
    SpeechProfileUpdate,
    SpeechSessionCreate,
    TtsRequest,
    WakeWordPackageCreate,
)
from .errors import DomainError
from .integrations import EventPublisher, LlmProvider, ProviderError, TtsProvider
from .repository import Repository, request_fingerprint, utc_now
from .security import Principal, ensure_device_access

DIALECT_LABELS = {
    "mandarin": "普通话",
    "minnan": "闽南语",
    "wu": "吴语",
    "cantonese": "粤语",
    "sichuan": "四川话",
    "shaanxi": "陕西话",
    "henan": "河南话",
    "shanghai": "上海话",
}
PROVIDER_DIALECTS = {
    "mandarin": "普通话",
    "minnan": "闽南话",
    "wu": "上海话",
    "cantonese": "广东话",
    "sichuan": "四川话",
    "shaanxi": "陕西话",
    "henan": "河南话",
    "shanghai": "上海话",
}
SUPPORTED_DIALECTS = tuple(DIALECT_LABELS)


class SpeechService:
    def __init__(
        self,
        settings: Settings,
        repository: Repository,
        publisher: EventPublisher,
        tts_provider: TtsProvider,
        llm_provider: LlmProvider,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.publisher = publisher
        self.tts_provider = tts_provider
        self.llm_provider = llm_provider

    def capabilities(self) -> dict[str, Any]:
        return {
            "autoDialect": True,
            "supportedDialects": [
                {"code": dialect, "label": DIALECT_LABELS[dialect]}
                for dialect in SUPPORTED_DIALECTS
            ],
            "asr": {
                "provider": "aliyun-dashscope",
                "primaryModel": "fun-asr-realtime",
                "languageHintsRequired": False,
                "dialectClassifier": "qingxier-dialect-router-v1",
            },
            "tts": {
                "provider": "aliyun-dashscope",
                "region": self.settings.dashscope_region,
                "clonePrimaryModel": self.settings.clone_tts_model,
                "systemVoiceFallbackModel": self.settings.qwen_system_tts_model,
                "clonePrimarySupportsDialectInstruction": True,
                "systemVoiceFallbackSupportsVoiceClone": False,
            },
            "wakeWord": {
                "text": self.settings.wake_word,
                "modelFamily": self.settings.wake_model_family,
                "currentVersion": self.settings.wake_model_version,
            },
        }

    def _profile_for_user(self, principal: Principal, device_id: str) -> dict[str, Any]:
        ensure_device_access(principal, device_id)
        if principal.role == "user" and not self.repository.is_bound(principal.subject, device_id):
            raise DomainError(403, 403001, "FORBIDDEN", "用户未绑定该设备")
        profile = self.repository.get_profile(device_id)
        if not profile:
            raise DomainError(404, 404001, "NOT_FOUND", "设备语音配置不存在")
        return profile

    def get_profile(self, principal: Principal, device_id: str) -> dict[str, Any]:
        return self._profile_for_user(principal, device_id)

    def update_profile(
        self,
        principal: Principal,
        device_id: str,
        body: SpeechProfileUpdate,
        trace_id: str,
    ) -> dict[str, Any]:
        self._profile_for_user(principal, device_id)
        if body.autoDialect is not True:
            raise DomainError(
                400,
                400101,
                "AUTO_DIALECT_REQUIRED",
                "V1.1 普通用户链路必须启用自动方言识别",
            )
        fallback = str(body.fallbackDialect)
        if fallback not in SUPPORTED_DIALECTS:
            raise DomainError(400, 400102, "UNSUPPORTED_DIALECT", "不支持的兜底方言")
        profile = self.repository.update_profile(
            device_id,
            body.version,
            {
                "autoDialect": True,
                "fallbackDialect": fallback,
                "cloneVoiceId": body.cloneVoiceId,
                "appliedAt": None,
            },
        )
        self.publisher.publish(
            f"device/{device_id}/command/down",
            {
                "commandId": f"cmd_{uuid.uuid4().hex[:12]}",
                "traceId": trace_id,
                "commandType": "speech_profile_update",
                "payload": {
                    "autoDialect": True,
                    "fallbackDialect": profile["fallbackDialect"],
                    "profileVersion": profile["version"],
                },
                "needAck": True,
                "expireAt": None,
            },
            qos=1,
        )
        return profile

    def get_wake_status(self, principal: Principal, device_id: str) -> dict[str, Any]:
        self._profile_for_user(principal, device_id)
        status = self.repository.get_wake_status(device_id)
        if not status:
            raise DomainError(404, 404001, "NOT_FOUND", "设备唤醒词状态不存在")
        return status

    def create_session(
        self, principal: Principal, body: SpeechSessionCreate
    ) -> dict[str, Any]:
        ensure_device_access(principal, body.deviceId)
        profile = self.repository.get_profile(body.deviceId)
        if not profile:
            raise DomainError(404, 404001, "NOT_FOUND", "设备不存在")
        if body.wakeWord != self.settings.wake_word:
            raise DomainError(
                400,
                400103,
                "WAKE_WORD_MISMATCH",
                f"唤醒词必须为“{self.settings.wake_word}”",
            )
        if body.autoDialect is not True:
            raise DomainError(
                400,
                400101,
                "AUTO_DIALECT_REQUIRED",
                "必须启用自动方言识别",
            )
        if body.audio.codec == "pcm" and body.audio.sampleRate != 16000:
            raise DomainError(
                400,
                400001,
                "INVALID_ARGUMENT",
                "PCM 主链路要求 16kHz 采样率",
            )
        legacy = not body.wakeWordModelVersion
        session = self.repository.create_session(
            {
                "deviceId": body.deviceId,
                "wakeWord": self.settings.wake_word,
                "wakeWordScore": body.wakeWordScore,
                "wakeWordModelVersion": body.wakeWordModelVersion
                or self.settings.wake_model_version,
                "legacyFirmware": legacy,
                "autoDialect": True,
                "fallbackDialect": profile["fallbackDialect"],
                "lockedDialect": None,
                "audio": body.audio.model_dump(),
            }
        )
        session["wsUrl"] = (
            f"{self.settings.speech_ws_base_url}?sessionId="
            f"{quote(session['sessionId'], safe='')}"
        )
        return session

    def route_dialect(
        self, principal: Principal, body: DialectRouteRequest
    ) -> dict[str, Any]:
        session = self.repository.get_session(body.sessionId)
        if not session:
            raise DomainError(404, 404001, "NOT_FOUND", "语音会话不存在")
        ensure_device_access(principal, session["deviceId"])
        candidate = str(body.dialectCandidate)
        if candidate not in SUPPORTED_DIALECTS:
            raise DomainError(400, 400102, "UNSUPPORTED_DIALECT", "方言候选值不受支持")
        confidence = float(body.confidence)
        if not 0 <= confidence <= 1:
            raise DomainError(400, 400104, "INVALID_CONFIDENCE", "方言置信度必须在 0 到 1 之间")
        profile = self.repository.get_profile(session["deviceId"])
        if not profile:
            raise DomainError(404, 404001, "NOT_FOUND", "设备语音配置不存在")
        previous = (
            str(body.previousDialect)
            if body.previousDialect is not None
            else session.get("lockedDialect")
        )
        if confidence >= float(profile["highConfidenceThreshold"]):
            selected = candidate
            source = "classifier"
            stability = "locked" if profile.get("sessionLockEnabled", True) else "selected"
            if profile.get("sessionLockEnabled", True):
                self.repository.update_session(body.sessionId, {"lockedDialect": selected})
        elif (
            confidence >= float(profile["mediumConfidenceThreshold"])
            and previous in SUPPORTED_DIALECTS
            and profile.get("sessionLockEnabled", True)
        ):
            selected = previous
            source = "session_hysteresis"
            stability = "retained"
        else:
            selected = str(profile["fallbackDialect"])
            source = "profile_fallback"
            stability = "fallback"
        return {
            "sessionId": body.sessionId,
            "language": "zh",
            "dialect": selected,
            "dialectLabel": DIALECT_LABELS[selected],
            "candidateDialect": candidate,
            "dialectConfidence": confidence,
            "dialectSource": source,
            "stability": stability,
            "manualSwitchRequired": False,
            "modelVersion": "qingxier-dialect-router-v1",
        }

    def _provider_instruction(self, dialect: str) -> str | None:
        if dialect == "mandarin":
            return None
        return f"请用{PROVIDER_DIALECTS[dialect]}表达。"

    def synthesize(
        self,
        principal: Principal,
        body: TtsRequest,
        trace_id: str,
    ) -> dict[str, Any]:
        session = self.repository.get_session(body.sessionId)
        if not session:
            raise DomainError(404, 404001, "NOT_FOUND", "语音会话不存在")
        ensure_device_access(principal, session["deviceId"])
        profile = self.repository.get_profile(session["deviceId"])
        if not profile:
            raise DomainError(404, 404001, "NOT_FOUND", "设备语音配置不存在")
        dialect = str(body.dialect)
        if dialect not in SUPPORTED_DIALECTS:
            raise DomainError(400, 400102, "UNSUPPORTED_DIALECT", "TTS 方言不受支持")
        voice_id = body.voiceId or profile.get("cloneVoiceId")
        if voice_id and body.model and body.model.startswith("qwen3-tts"):
            raise DomainError(
                409,
                409101,
                "VOICE_CLONE_UNSUPPORTED_BY_MODEL",
                "Qwen3-TTS-Flash 系统音色模型不能使用克隆 voiceId",
            )
        requested_model = body.model
        clone_model = requested_model or self.settings.clone_tts_model
        if voice_id and not clone_model.startswith("cosyvoice"):
            raise DomainError(
                409,
                409101,
                "VOICE_CLONE_UNSUPPORTED_BY_MODEL",
                "当前模型不支持该克隆音色",
            )
        if not voice_id:
            return self._system_voice_synthesis(
                text=body.text,
                requested_dialect=dialect,
                trace_id=trace_id,
                fallback_reason="CLONE_VOICE_UNAVAILABLE",
            )
        provider_dialect = PROVIDER_DIALECTS[dialect]
        degraded = dialect == "wu"
        fallback_reason = "WU_GENERIC_MAPPED_TO_SHANGHAI" if degraded else None
        try:
            result = self.tts_provider.synthesize(
                model=clone_model,
                text=body.text,
                voice=str(voice_id),
                instruction=self._provider_instruction(dialect),
                sample_rate=24000,
                trace_id=trace_id,
            )
        except ProviderError as exc:
            if not self.settings.tts_fallback_enabled:
                raise DomainError(
                    503,
                    503102,
                    "TTS_PROVIDER_UNAVAILABLE",
                    "克隆音色语音合成暂不可用",
                ) from exc
            return self._system_voice_synthesis(
                text=body.text,
                requested_dialect=dialect,
                trace_id=trace_id,
                fallback_reason="CLONE_PROVIDER_UNAVAILABLE",
            )
        return {
            "provider": "aliyun-dashscope",
            "providerRequestId": result.provider_request_id,
            "model": clone_model,
            "voiceMode": "cloned_voice",
            "voiceId": voice_id,
            "requestedDialect": dialect,
            "providerDialect": provider_dialect,
            "degraded": degraded,
            "fallbackReason": fallback_reason,
            "audio": {"codec": "mp3", "sampleRate": 24000},
            "audioUrl": result.audio_url,
            "firstAudioLatencyMs": result.latency_ms,
        }

    def _system_voice_synthesis(
        self,
        *,
        text: str,
        requested_dialect: str,
        trace_id: str,
        fallback_reason: str,
    ) -> dict[str, Any]:
        try:
            result = self.tts_provider.synthesize(
                model=self.settings.qwen_system_tts_model,
                text=text,
                voice=self.settings.qwen_system_voice,
                instruction=None,
                sample_rate=24000,
                trace_id=trace_id,
            )
        except ProviderError as exc:
            raise DomainError(
                503,
                503102,
                "TTS_PROVIDER_UNAVAILABLE",
                "语音合成暂不可用，降级也失败",
            ) from exc
        return {
            "provider": "aliyun-dashscope",
            "providerRequestId": result.provider_request_id,
            "model": self.settings.qwen_system_tts_model,
            "voiceMode": "system_voice",
            "voiceId": None,
            "requestedDialect": requested_dialect,
            "providerDialect": "普通话",
            "degraded": True,
            "fallbackReason": fallback_reason,
            "audio": {"codec": "mp3", "sampleRate": 24000},
            "audioUrl": result.audio_url,
            "firstAudioLatencyMs": result.latency_ms,
        }

    def register_wake_package(
        self,
        principal: Principal,
        body: WakeWordPackageCreate,
        idempotency_key: str | None,
        trace_id: str,
    ) -> tuple[dict[str, Any], bool]:
        if body.wakeWord != self.settings.wake_word:
            raise DomainError(
                400,
                400103,
                "WAKE_WORD_MISMATCH",
                f"唤醒词包只能包含“{self.settings.wake_word}”",
            )
        if body.modelFamily != self.settings.wake_model_family:
            raise DomainError(
                400,
                400001,
                "INVALID_MODEL_FAMILY",
                f"ESP32-S3 唤醒词包必须使用 {self.settings.wake_model_family}",
            )
        payload = body.model_dump(mode="json")
        fingerprint = request_fingerprint(payload)
        if idempotency_key:
            existing = self.repository.get_idempotency(idempotency_key)
            if existing:
                if existing["fingerprint"] != fingerprint:
                    raise DomainError(
                        409,
                        409103,
                        "IDEMPOTENCY_CONFLICT",
                        "同一幂等键对应了不同请求",
                    )
                return existing["response"], True
        if self.repository.get_wake_package_by_version(body.version):
            raise DomainError(409, 409001, "CONFLICT", "同一唤醒词模型版本已存在")
        package = self.repository.create_wake_package(
            {
                **payload,
                "url": str(body.url),
                "rollbackSupported": True,
                "createdBy": principal.subject,
                "traceId": trace_id,
            }
        )
        if idempotency_key:
            self.repository.put_idempotency(idempotency_key, fingerprint, package)
        self.repository.append_audit(
            {
                "actorId": principal.subject,
                "action": "wake_word_package.register",
                "resourceId": package["packageId"],
                "result": "success",
                "traceId": trace_id,
                "details": {"version": body.version, "rollout": payload["rollout"]},
            }
        )
        return package, False

    def dialog_text(
        self,
        principal: Principal,
        body: DialogTextRequest,
        trace_id: str,
    ) -> dict[str, Any]:
        profile = self._profile_for_user(principal, body.deviceId)
        system = (
            f"你是庆喜儿 AI 玩具，当前人格为 {body.persona}，模式为 {body.mode}。"
            "回复应温暖、简洁、安全，不输出敏感个人信息。"
        )
        try:
            reply = self.llm_provider.complete(
                system=system,
                user=body.text,
                trace_id=trace_id,
            )
        except ProviderError as exc:
            raise DomainError(503, 503001, "AI_PROVIDER_UNAVAILABLE", "对话服务暂不可用") from exc
        voice_id = profile.get("cloneVoiceId")
        dialect = str(body.dialect)
        if voice_id:
            try:
                audio = self.tts_provider.synthesize(
                    model=self.settings.clone_tts_model,
                    text=reply,
                    voice=str(voice_id),
                    instruction=self._provider_instruction(dialect),
                    sample_rate=24000,
                    trace_id=trace_id,
                )
                tts_model = self.settings.clone_tts_model
                voice_mode = "cloned_voice"
            except ProviderError:
                fallback = self._system_voice_synthesis(
                    text=reply,
                    requested_dialect=dialect,
                    trace_id=trace_id,
                    fallback_reason="CLONE_PROVIDER_UNAVAILABLE",
                )
                return {
                    "conversationId": f"c_{uuid.uuid4().hex[:16]}",
                    "replyText": reply,
                    "detectedDialect": dialect,
                    "autoDialect": True,
                    "voiceId": None,
                    "voiceMode": fallback["voiceMode"],
                    "ttsModel": fallback["model"],
                    "audioUrl": fallback["audioUrl"],
                    "degraded": True,
                    "fallbackReason": fallback["fallbackReason"],
                }
        else:
            fallback = self._system_voice_synthesis(
                text=reply,
                requested_dialect=dialect,
                trace_id=trace_id,
                fallback_reason="CLONE_VOICE_UNAVAILABLE",
            )
            return {
                "conversationId": f"c_{uuid.uuid4().hex[:16]}",
                "replyText": reply,
                "detectedDialect": dialect,
                "autoDialect": True,
                "voiceId": None,
                "voiceMode": fallback["voiceMode"],
                "ttsModel": fallback["model"],
                "audioUrl": fallback["audioUrl"],
                "degraded": True,
                "fallbackReason": fallback["fallbackReason"],
            }
        return {
            "conversationId": f"c_{uuid.uuid4().hex[:16]}",
            "replyText": reply,
            "detectedDialect": dialect,
            "autoDialect": True,
            "voiceId": voice_id,
            "voiceMode": voice_mode,
            "ttsModel": tts_model,
            "audioUrl": audio.audio_url,
            "degraded": dialect == "wu",
            "fallbackReason": "WU_GENERIC_MAPPED_TO_SHANGHAI" if dialect == "wu" else None,
        }

    def readiness(self) -> dict[str, Any]:
        return {
            "status": "ready" if self.repository.ping() else "not_ready",
            "storage": self.settings.storage_backend,
            "events": self.settings.event_backend,
            "speechProvider": self.settings.provider_mode,
            "timestamp": utc_now(),
        }

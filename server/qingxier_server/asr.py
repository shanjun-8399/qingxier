from __future__ import annotations

import queue
from dataclasses import dataclass
from typing import Any, Protocol

from .config import Settings
from .integrations import ProviderError


@dataclass(frozen=True, slots=True)
class DialectPrediction:
    dialect: str
    confidence: float


class LexicalDialectClassifier:
    """文本特征兜底分类器。

    正式量产可替换为声学+文本联合模型；该实现确保供应商未返回细粒度
    方言标签时，链路仍有可测试、可解释的候选值和置信度。
    """

    RULES: tuple[tuple[str, tuple[str, ...], float], ...] = (
        ("cantonese", ("唔", "冇", "係", "喺", "咩", "嘅", "啲"), 0.88),
        ("shanghai", ("侬", "阿拉", "勿", "伊拉"), 0.86),
        ("minnan", ("食饱未", "阮", "袂", "汝", "按呢"), 0.84),
        ("sichuan", ("巴适", "要得", "莫得", "啥子", "安逸"), 0.82),
        ("henan", ("中不中", "弄啥嘞", "得劲"), 0.82),
        ("shaanxi", ("嘹咋咧", "额滴神", "嫽扎咧"), 0.82),
    )

    def classify(self, text: str) -> DialectPrediction:
        normalized = text.strip()
        for dialect, markers, confidence in self.RULES:
            if any(marker in normalized for marker in markers):
                return DialectPrediction(dialect, confidence)
        return DialectPrediction("mandarin", 0.5)


@dataclass(frozen=True, slots=True)
class AsrEvent:
    text: str
    is_final: bool
    provider_request_id: str | None = None
    error: str | None = None


class AsrSession(Protocol):
    def start(self) -> None: ...
    def send_audio(self, data: bytes) -> None: ...
    def stop(self) -> None: ...
    def drain(self) -> list[AsrEvent]: ...


class UnsupportedAsrSession:
    def start(self) -> None:
        return None

    def send_audio(self, data: bytes) -> None:
        raise ProviderError("当前运行模式未启用实时 ASR")

    def stop(self) -> None:
        return None

    def drain(self) -> list[AsrEvent]:
        return []


class DashScopeAsrSession:
    """Fun-ASR-Realtime SDK 适配器。

    SDK 仅在 SPEECH_PROVIDER_MODE=dashscope 时动态加载，避免测试环境依赖
    真实密钥。回调结果进入线程安全队列，由 WebSocket 网关按帧排空。
    """

    def __init__(self, settings: Settings, audio: dict[str, Any]) -> None:
        try:
            import dashscope
            from dashscope.audio.asr import Recognition, RecognitionCallback
        except ImportError as exc:  # pragma: no cover - optional runtime dependency
            raise RuntimeError("DashScope ASR 模式需要安装 dashscope") from exc
        self._events: queue.Queue[AsrEvent] = queue.Queue()
        dashscope.api_key = settings.dashscope_api_key
        dashscope.base_websocket_api_url = settings.dashscope_asr_ws_url
        event_queue = self._events

        class Callback(RecognitionCallback):
            def on_event(self, result):  # type: ignore[no-untyped-def]
                sentence = result.get_sentence() or {}
                text = sentence.get("text")
                if text:
                    is_final = bool(
                        sentence.get("sentence_end")
                        or sentence.get("is_sentence_end")
                        or sentence.get("end_time") is not None
                    )
                    event_queue.put(
                        AsrEvent(
                            text=str(text),
                            is_final=is_final,
                            provider_request_id=getattr(result, "request_id", None)
                            or getattr(result, "get_request_id", lambda: None)(),
                        )
                    )

            def on_error(self, result):  # type: ignore[no-untyped-def]
                request_id = getattr(result, "request_id", None) or getattr(
                    result, "get_request_id", lambda: None
                )()
                message = getattr(result, "message", None) or "Fun-ASR 识别失败"
                event_queue.put(
                    AsrEvent(
                        text="",
                        is_final=True,
                        provider_request_id=request_id,
                        error=str(message),
                    )
                )

            def on_complete(self):
                return None

        self.recognition = Recognition(
            model="fun-asr-realtime",
            format=audio.get("codec", "pcm"),
            sample_rate=int(audio.get("sampleRate", 16000)),
            semantic_punctuation_enabled=False,
            callback=Callback(),
        )
        self.started = False

    def start(self) -> None:
        try:
            self.recognition.start()
            self.started = True
        except Exception as exc:  # pragma: no cover - requires provider
            raise ProviderError(f"Fun-ASR 启动失败: {exc}") from exc

    def send_audio(self, data: bytes) -> None:
        if not self.started:
            raise ProviderError("ASR 会话尚未启动")
        try:
            self.recognition.send_audio_frame(data)
        except Exception as exc:  # pragma: no cover - requires provider
            raise ProviderError(f"Fun-ASR 音频发送失败: {exc}") from exc

    def stop(self) -> None:
        if not self.started:
            return
        try:
            self.recognition.stop()
        except Exception as exc:  # pragma: no cover - requires provider
            raise ProviderError(f"Fun-ASR 停止失败: {exc}") from exc
        finally:
            self.started = False

    def drain(self) -> list[AsrEvent]:
        events: list[AsrEvent] = []
        while True:
            try:
                events.append(self._events.get_nowait())
            except queue.Empty:
                return events


def build_asr_session(settings: Settings, audio: dict[str, Any]) -> AsrSession:
    if settings.provider_mode == "dashscope":
        return DashScopeAsrSession(settings, audio)
    return UnsupportedAsrSession()

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import urlparse

import httpx

from .config import Settings


class ProviderError(RuntimeError):
    pass


class EventPublisher(Protocol):
    def publish(self, topic: str, payload: dict[str, Any], qos: int = 1) -> None: ...
    def close(self) -> None: ...


class MemoryEventPublisher:
    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def publish(self, topic: str, payload: dict[str, Any], qos: int = 1) -> None:
        self.events.append({"topic": topic, "payload": payload, "qos": qos})

    def close(self) -> None:
        return None


class MqttEventPublisher:
    def __init__(self, settings: Settings) -> None:
        try:
            import paho.mqtt.client as mqtt
        except ImportError as exc:  # pragma: no cover - optional runtime dependency
            raise RuntimeError("MQTT 模式需要安装 paho-mqtt") from exc
        parsed = urlparse(settings.mqtt_url)
        if not parsed.hostname:
            raise ValueError("MQTT_URL 非法")
        self._mqtt = mqtt
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        if settings.mqtt_username:
            self.client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        if settings.mqtt_tls:
            self.client.tls_set()
        port = parsed.port or (8883 if settings.mqtt_tls else 1883)
        self.client.connect(parsed.hostname, port, keepalive=60)
        self.client.loop_start()

    def publish(self, topic: str, payload: dict[str, Any], qos: int = 1) -> None:
        info = self.client.publish(
            topic,
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
            qos=qos,
        )
        info.wait_for_publish(timeout=5)
        if info.rc != self._mqtt.MQTT_ERR_SUCCESS:
            raise ProviderError(f"MQTT 发布失败: rc={info.rc}")

    def close(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()


@dataclass(frozen=True, slots=True)
class SynthesisResult:
    audio_url: str
    latency_ms: int
    provider_request_id: str | None = None


class TtsProvider(Protocol):
    def synthesize(
        self,
        *,
        model: str,
        text: str,
        voice: str,
        instruction: str | None,
        sample_rate: int,
        trace_id: str,
    ) -> SynthesisResult: ...

    def close(self) -> None: ...


class DeterministicTtsProvider:
    def synthesize(
        self,
        *,
        model: str,
        text: str,
        voice: str,
        instruction: str | None,
        sample_rate: int,
        trace_id: str,
    ) -> SynthesisResult:
        digest = hashlib.sha256(
            f"{model}|{voice}|{instruction}|{text}".encode("utf-8")
        ).hexdigest()[:24]
        return SynthesisResult(
            audio_url=f"https://cdn.invalid/tts/{digest}.mp3",
            latency_ms=12,
            provider_request_id=f"mock_{digest}",
        )

    def close(self) -> None:
        return None


class DashScopeTtsProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = httpx.Client(timeout=settings.dashscope_timeout_seconds)

    @staticmethod
    def _extract_audio_url(payload: dict[str, Any]) -> str | None:
        candidates = [
            payload.get("output", {}).get("audio", {}).get("url"),
            payload.get("output", {}).get("url"),
            payload.get("output", {}).get("audio_url"),
            payload.get("audio", {}).get("url"),
            payload.get("url"),
        ]
        return next((str(item) for item in candidates if item), None)

    def synthesize(
        self,
        *,
        model: str,
        text: str,
        voice: str,
        instruction: str | None,
        sample_rate: int,
        trace_id: str,
    ) -> SynthesisResult:
        started = time.perf_counter()
        headers = {
            "Authorization": f"Bearer {self.settings.dashscope_api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Request-Id": trace_id,
        }
        if model.startswith("cosyvoice"):
            url = self.settings.dashscope_cosyvoice_url
            input_data: dict[str, Any] = {
                "text": text,
                "voice": voice,
                "format": "mp3",
                "sample_rate": sample_rate,
            }
            if instruction:
                input_data["instruction"] = instruction
            body = {"model": model, "input": input_data}
        else:
            url = self.settings.dashscope_qwen_tts_url
            body = {
                "model": model,
                "input": {
                    "text": text,
                    "voice": voice,
                    "language_type": "Chinese",
                },
            }
        try:
            response = self.client.post(url, headers=headers, json=body)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderError(f"DashScope TTS 调用失败: {exc}") from exc
        audio_url = self._extract_audio_url(payload)
        if not audio_url:
            raise ProviderError("DashScope TTS 响应缺少音频 URL")
        latency_ms = int((time.perf_counter() - started) * 1000)
        return SynthesisResult(
            audio_url=audio_url,
            latency_ms=latency_ms,
            provider_request_id=payload.get("request_id") or payload.get("requestId"),
        )

    def close(self) -> None:
        self.client.close()


class LlmProvider(Protocol):
    def complete(self, *, system: str, user: str, trace_id: str) -> str: ...
    def close(self) -> None: ...


class EchoLlmProvider:
    def complete(self, *, system: str, user: str, trace_id: str) -> str:
        return f"收到：{user}"

    def close(self) -> None:
        return None


class OpenAICompatibleLlmProvider:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = httpx.Client(timeout=settings.llm_timeout_seconds)

    def complete(self, *, system: str, user: str, trace_id: str) -> str:
        url = self.settings.llm_base_url.rstrip("/") + "/chat/completions"
        try:
            response = self.client.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.settings.llm_api_key}",
                    "Content-Type": "application/json",
                    "X-Request-Id": trace_id,
                },
                json={
                    "model": self.settings.llm_model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.6,
                    "stream": False,
                },
            )
            response.raise_for_status()
            payload = response.json()
            text = payload["choices"][0]["message"]["content"]
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"LLM 调用失败: {exc}") from exc
        if not str(text).strip():
            raise ProviderError("LLM 返回空内容")
        return str(text).strip()

    def close(self) -> None:
        self.client.close()


def build_event_publisher(settings: Settings) -> EventPublisher:
    if settings.event_backend == "mqtt":
        return MqttEventPublisher(settings)
    return MemoryEventPublisher()


def build_tts_provider(settings: Settings) -> TtsProvider:
    if settings.provider_mode == "dashscope":
        return DashScopeTtsProvider(settings)
    return DeterministicTtsProvider()


def build_llm_provider(settings: Settings) -> LlmProvider:
    if settings.llm_mode == "openai-compatible":
        return OpenAICompatibleLlmProvider(settings)
    return EchoLlmProvider()

from __future__ import annotations

import json
import sys
import types

import httpx
import pytest

from qingxier_server.asr import DashScopeAsrSession, UnsupportedAsrSession, build_asr_session
from qingxier_server.config import Settings
from qingxier_server.integrations import (
    DashScopeTtsProvider,
    DeterministicTtsProvider,
    EchoLlmProvider,
    MemoryEventPublisher,
    OpenAICompatibleLlmProvider,
    ProviderError,
    build_event_publisher,
    build_llm_provider,
    build_tts_provider,
)


def _client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_dashscope_cosyvoice_request_shape():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        captured["json"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "output": {"audio": {"url": "https://cdn.example/cosy.mp3"}},
                "request_id": "req_cosy",
            },
        )

    settings = Settings(
        provider_mode="dashscope",
        dashscope_api_key="key",
        dashscope_cosyvoice_url="https://dashscope.example/cosy",
    )
    provider = DashScopeTtsProvider(settings)
    provider.client.close()
    provider.client = _client(handler)
    result = provider.synthesize(
        model="cosyvoice-v3.5-flash",
        text="巴适得很",
        voice="voice_clone_1",
        instruction="请用四川话表达。",
        sample_rate=24000,
        trace_id="trc_cosy",
    )
    provider.close()

    assert captured["url"] == "https://dashscope.example/cosy"
    assert captured["headers"]["authorization"] == "Bearer key"
    assert captured["json"] == {
        "model": "cosyvoice-v3.5-flash",
        "input": {
            "text": "巴适得很",
            "voice": "voice_clone_1",
            "format": "mp3",
            "sample_rate": 24000,
            "instruction": "请用四川话表达。",
        },
    }
    assert result.audio_url == "https://cdn.example/cosy.mp3"
    assert result.provider_request_id == "req_cosy"


def test_dashscope_qwen_system_voice_request_shape():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["json"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"output": {"audio": {"url": "https://cdn.example/qwen.wav"}}},
        )

    settings = Settings(
        provider_mode="dashscope",
        dashscope_api_key="key",
        dashscope_qwen_tts_url="https://dashscope.example/qwen",
    )
    provider = DashScopeTtsProvider(settings)
    provider.client.close()
    provider.client = _client(handler)
    result = provider.synthesize(
        model="qwen3-tts-flash",
        text="你好",
        voice="Cherry",
        instruction=None,
        sample_rate=24000,
        trace_id="trc_qwen",
    )
    provider.close()

    assert captured["json"] == {
        "model": "qwen3-tts-flash",
        "input": {"text": "你好", "voice": "Cherry", "language_type": "Chinese"},
    }
    assert result.audio_url == "https://cdn.example/qwen.wav"


def test_dashscope_tts_provider_errors_are_normalized():
    settings = Settings(provider_mode="dashscope", dashscope_api_key="key")
    provider = DashScopeTtsProvider(settings)
    provider.client.close()
    provider.client = _client(lambda request: httpx.Response(200, json={"output": {}}))
    with pytest.raises(ProviderError, match="缺少音频 URL"):
        provider.synthesize(
            model="cosyvoice-v3.5-flash",
            text="测试",
            voice="voice_1",
            instruction=None,
            sample_rate=24000,
            trace_id="trc_missing",
        )
    provider.close()


def test_openai_compatible_llm_request_and_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["json"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": "  温暖回复  "}}]},
        )

    settings = Settings(
        llm_mode="openai-compatible",
        llm_base_url="https://llm.example/v1/",
        llm_api_key="llm-key",
        llm_model="deepseek-chat",
    )
    provider = OpenAICompatibleLlmProvider(settings)
    provider.client.close()
    provider.client = _client(handler)
    text = provider.complete(system="系统", user="用户", trace_id="trc_llm")
    provider.close()

    assert captured["url"] == "https://llm.example/v1/chat/completions"
    assert captured["json"]["model"] == "deepseek-chat"
    assert captured["json"]["messages"][1] == {"role": "user", "content": "用户"}
    assert text == "温暖回复"


def test_openai_compatible_llm_rejects_empty_content():
    settings = Settings(
        llm_mode="openai-compatible",
        llm_base_url="https://llm.example/v1",
        llm_api_key="llm-key",
    )
    provider = OpenAICompatibleLlmProvider(settings)
    provider.client.close()
    provider.client = _client(
        lambda request: httpx.Response(
            200, json={"choices": [{"message": {"content": "   "}}]}
        )
    )
    with pytest.raises(ProviderError, match="空内容"):
        provider.complete(system="system", user="user", trace_id="trc_empty")
    provider.close()


def test_provider_factories_default_to_local_adapters():
    settings = Settings()
    assert isinstance(build_event_publisher(settings), MemoryEventPublisher)
    assert isinstance(build_tts_provider(settings), DeterministicTtsProvider)
    assert isinstance(build_llm_provider(settings), EchoLlmProvider)
    assert isinstance(build_asr_session(settings, {}), UnsupportedAsrSession)


def test_dashscope_asr_sdk_adapter(monkeypatch):
    dashscope_module = types.ModuleType("dashscope")
    audio_module = types.ModuleType("dashscope.audio")
    asr_module = types.ModuleType("dashscope.audio.asr")

    class RecognitionCallback:
        pass

    class Recognition:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.callback = kwargs["callback"]
            self.started = False
            self.frames = []

        def start(self):
            self.started = True

        def send_audio_frame(self, data):
            self.frames.append(data)

        def stop(self):
            self.started = False

    asr_module.Recognition = Recognition
    asr_module.RecognitionCallback = RecognitionCallback
    audio_module.asr = asr_module
    dashscope_module.audio = audio_module
    monkeypatch.setitem(sys.modules, "dashscope", dashscope_module)
    monkeypatch.setitem(sys.modules, "dashscope.audio", audio_module)
    monkeypatch.setitem(sys.modules, "dashscope.audio.asr", asr_module)

    settings = Settings(
        provider_mode="dashscope",
        dashscope_api_key="asr-key",
        dashscope_asr_ws_url="wss://asr.example/api-ws/v1/inference",
    )
    session = DashScopeAsrSession(
        settings, {"codec": "pcm", "sampleRate": 16000, "channels": 1}
    )
    assert session.recognition.kwargs["model"] == "fun-asr-realtime"
    session.start()
    session.send_audio(b"pcm")

    class Result:
        request_id = "asr_req_1"

        @staticmethod
        def get_sentence():
            return {"text": "侬好呀", "sentence_end": True}

    session.recognition.callback.on_event(Result())
    events = session.drain()
    assert events[0].text == "侬好呀"
    assert events[0].is_final is True
    assert events[0].provider_request_id == "asr_req_1"

    class ErrorResult:
        request_id = "asr_req_2"
        message = "provider failed"

    session.recognition.callback.on_error(ErrorResult())
    error_event = session.drain()[0]
    assert error_event.error == "provider failed"
    session.stop()
    assert session.started is False

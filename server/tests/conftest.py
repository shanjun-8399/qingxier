from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from qingxier_server.api import create_app  # noqa: E402
from qingxier_server.config import Settings  # noqa: E402
from qingxier_server.integrations import (  # noqa: E402
    EchoLlmProvider,
    MemoryEventPublisher,
    ProviderError,
    SynthesisResult,
)
from qingxier_server.repository import InMemoryRepository  # noqa: E402


class RecordingTtsProvider:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.fail_models: set[str] = set()

    def synthesize(self, **kwargs: Any) -> SynthesisResult:
        self.calls.append(dict(kwargs))
        if kwargs["model"] in self.fail_models:
            raise ProviderError(f"forced failure: {kwargs['model']}")
        return SynthesisResult(
            audio_url=f"https://cdn.test/{len(self.calls)}.mp3",
            latency_ms=25,
            provider_request_id=f"provider_{len(self.calls)}",
        )

    def close(self) -> None:
        return None


@pytest.fixture
def settings() -> Settings:
    return Settings(
        app_env="test",
        admin_require_mfa=True,
        provider_mode="mock",
        speech_ws_base_url="wss://voice.test/ws/v1/voice",
    )


@pytest.fixture
def repository(settings: Settings) -> InMemoryRepository:
    return InMemoryRepository(settings)


@pytest.fixture
def publisher() -> MemoryEventPublisher:
    return MemoryEventPublisher()


@pytest.fixture
def tts_provider() -> RecordingTtsProvider:
    return RecordingTtsProvider()


@pytest.fixture
def app(settings, repository, publisher, tts_provider):
    return create_app(
        settings=settings,
        repository=repository,
        publisher=publisher,
        tts_provider=tts_provider,
        llm_provider=EchoLlmProvider(),
    )


@pytest.fixture
def client(app):
    with TestClient(app) as value:
        yield value


@pytest.fixture
def user_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-user-token"}


@pytest.fixture
def device_headers() -> dict[str, str]:
    return {"X-Device-Token": "test-device-token"}


@pytest.fixture
def admin_headers() -> dict[str, str]:
    return {
        "Authorization": "Bearer test-admin-token",
        "X-MFA-Verified": "true",
    }

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from qingxier_server.api import create_app
from qingxier_server.config import Settings
from qingxier_server.errors import DomainError
from qingxier_server.integrations import (
    DeterministicTtsProvider,
    EchoLlmProvider,
    MemoryEventPublisher,
)
from qingxier_server.repository import InMemoryRepository


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def sign_jwt(payload: dict, secret: str) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    head = b64url(json.dumps(header, separators=(",", ":")).encode())
    body = b64url(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(secret.encode(), f"{head}.{body}".encode(), hashlib.sha256).digest()
    return f"{head}.{body}.{b64url(sig)}"


def test_production_hs256_user_token():
    settings = Settings(
        app_env="prod",
        jwt_secret="strong-test-secret",
        admin_require_mfa=True,
        provider_mode="mock",
    )
    repository = InMemoryRepository(settings)
    app = create_app(
        settings=settings,
        repository=repository,
        publisher=MemoryEventPublisher(),
        tts_provider=DeterministicTtsProvider(),
        llm_provider=EchoLlmProvider(),
    )
    token = sign_jwt(
        {
            "iss": "qingxier",
            "sub": "u_001",
            "role": "user",
            "bound_devices": ["d_001"],
            "exp": time.time() + 60,
        },
        settings.jwt_secret,
    )
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/devices/d_001/speech-profile",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 200


def test_expired_jwt_is_rejected():
    settings = Settings(app_env="prod", jwt_secret="strong-test-secret")
    app = create_app(
        settings=settings,
        repository=InMemoryRepository(settings),
        publisher=MemoryEventPublisher(),
        tts_provider=DeterministicTtsProvider(),
        llm_provider=EchoLlmProvider(),
    )
    token = sign_jwt(
        {
            "iss": "qingxier",
            "sub": "u_001",
            "role": "user",
            "bound_devices": ["d_001"],
            "exp": time.time() - 1,
        },
        settings.jwt_secret,
    )
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/speech/capabilities",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert response.status_code == 401
    assert response.json()["message"] == "Token 已过期"


def test_production_requires_jwt_secret():
    settings = Settings(app_env="prod", jwt_secret="")
    with pytest.raises(ValueError, match="JWT_SECRET"):
        settings.validate_startup()


def test_threshold_order_is_validated():
    settings = Settings(high_confidence_threshold=0.5, medium_confidence_threshold=0.8)
    with pytest.raises(ValueError, match="medium"):
        settings.validate_startup()


def test_repository_profile_conflict(settings):
    repository = InMemoryRepository(settings)
    repository.update_profile("d_001", 1, {"fallbackDialect": "henan"})
    with pytest.raises(DomainError) as caught:
        repository.update_profile("d_001", 1, {"fallbackDialect": "sichuan"})
    assert caught.value.code == 409102


def test_settings_from_env_reads_runtime_configuration(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("ADMIN_REQUIRE_MFA", "yes")
    monkeypatch.setenv("MQTT_TLS", "false")
    monkeypatch.setenv("TTS_FALLBACK_ENABLED", "0")
    monkeypatch.setenv("DASHSCOPE_REGION", "singapore")
    monkeypatch.setenv("DASHSCOPE_TIMEOUT_SECONDS", "12.5")
    monkeypatch.setenv("DIALECT_HIGH_THRESHOLD", "0.81")
    monkeypatch.setenv("DIALECT_MEDIUM_THRESHOLD", "0.61")
    monkeypatch.setenv("WAKE_THRESHOLD", "0.7")
    monkeypatch.setenv("SPEECH_WS_BASE_URL", "wss://voice.example/ws/v1/voice")

    settings = Settings.from_env()

    assert settings.app_env == "test"
    assert settings.admin_require_mfa is True
    assert settings.mqtt_tls is False
    assert settings.tts_fallback_enabled is False
    assert settings.dashscope_timeout_seconds == 12.5
    assert settings.high_confidence_threshold == 0.81
    assert settings.medium_confidence_threshold == 0.61
    assert settings.wake_threshold == 0.7
    assert settings.clone_tts_model == "cosyvoice-v3-flash"
    assert settings.speech_ws_base_url == "wss://voice.example/ws/v1/voice"
    settings.validate_startup()


@pytest.mark.parametrize(
    ("settings", "message"),
    [
        (Settings(wake_threshold=1.2), "唤醒阈值"),
        (Settings(storage_backend="mongo", mongo_uri=""), "MONGO_URI"),
        (Settings(event_backend="mqtt", mqtt_url=""), "MQTT_URL"),
        (Settings(provider_mode="dashscope", dashscope_api_key=""), "DASHSCOPE_API_KEY"),
        (
            Settings(llm_mode="openai-compatible", llm_base_url="", llm_api_key=""),
            "LLM_BASE_URL",
        ),
    ],
)
def test_startup_dependencies_are_validated(settings, message):
    with pytest.raises(ValueError, match=message):
        settings.validate_startup()

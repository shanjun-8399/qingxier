from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    return int(raw)


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    return float(raw)


@dataclass(frozen=True, slots=True)
class Settings:
    app_env: str = "dev"
    app_name: str = "qingxier-speech-server"
    app_version: str = "1.2.0"
    log_level: str = "INFO"

    user_token: str = "test-user-token"
    device_token: str = "test-device-token"
    admin_token: str = "test-admin-token"
    jwt_secret: str = ""
    jwt_issuer: str = "qingxier"
    admin_require_mfa: bool = False

    storage_backend: str = "memory"
    mongo_uri: str = ""
    mongo_database: str = "qingxier"

    event_backend: str = "memory"
    mqtt_url: str = ""
    mqtt_username: str = ""
    mqtt_password: str = ""
    mqtt_tls: bool = True

    provider_mode: str = "mock"
    dashscope_api_key: str = ""
    dashscope_region: str = "beijing"
    dashscope_asr_ws_url: str = "wss://dashscope.aliyuncs.com/api-ws/v1/inference"
    dashscope_cosyvoice_url: str = (
        "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer"
    )
    dashscope_qwen_tts_url: str = (
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
    )
    dashscope_timeout_seconds: float = 20.0
    cosyvoice_model: str = "cosyvoice-v3.5-flash"
    cosyvoice_singapore_model: str = "cosyvoice-v3-flash"
    qwen_system_tts_model: str = "qwen3-tts-flash"
    qwen_system_voice: str = "Cherry"
    tts_fallback_enabled: bool = True

    llm_mode: str = "echo"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "deepseek-chat"
    llm_timeout_seconds: float = 20.0

    speech_ws_base_url: str = "wss://voice.invalid/ws/v1/voice"
    high_confidence_threshold: float = 0.75
    medium_confidence_threshold: float = 0.55
    wake_word: str = "阿西"
    wake_model_family: str = "WakeNet9"
    wake_model_version: str = "wakenet9-axi-1.0.0"
    wake_threshold: float = 0.72

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() in {"prod", "production"}

    @property
    def clone_tts_model(self) -> str:
        if self.dashscope_region.lower() in {"singapore", "sg"}:
            return self.cosyvoice_singapore_model
        return self.cosyvoice_model

    def validate_startup(self) -> None:
        if not 0 <= self.medium_confidence_threshold <= self.high_confidence_threshold <= 1:
            raise ValueError("方言阈值必须满足 0 <= medium <= high <= 1")
        if not 0 <= self.wake_threshold <= 1:
            raise ValueError("唤醒阈值必须在 0 到 1 之间")
        if self.is_production and not self.jwt_secret:
            raise ValueError("生产环境必须配置 JWT_SECRET")
        if self.storage_backend == "mongo" and not self.mongo_uri:
            raise ValueError("MongoDB 存储模式必须配置 MONGO_URI")
        if self.event_backend == "mqtt" and not self.mqtt_url:
            raise ValueError("MQTT 事件模式必须配置 MQTT_URL")
        if self.provider_mode == "dashscope" and not self.dashscope_api_key:
            raise ValueError("DashScope 模式必须配置 DASHSCOPE_API_KEY")
        if self.llm_mode == "openai-compatible" and not (
            self.llm_base_url and self.llm_api_key
        ):
            raise ValueError("OpenAI 兼容 LLM 模式必须配置 LLM_BASE_URL/LLM_API_KEY")

    @classmethod
    def from_env(cls) -> "Settings":
        env = os.getenv("APP_ENV", "dev")
        return cls(
            app_env=env,
            app_name=os.getenv("APP_NAME", "qingxier-speech-server"),
            app_version=os.getenv("APP_VERSION", "1.2.0"),
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            user_token=os.getenv("DEV_USER_TOKEN", "test-user-token"),
            device_token=os.getenv("DEV_DEVICE_TOKEN", "test-device-token"),
            admin_token=os.getenv("DEV_ADMIN_TOKEN", "test-admin-token"),
            jwt_secret=os.getenv("JWT_SECRET", ""),
            jwt_issuer=os.getenv("JWT_ISSUER", "qingxier"),
            admin_require_mfa=_env_bool("ADMIN_REQUIRE_MFA", env.lower() in {"prod", "production"}),
            storage_backend=os.getenv("STORAGE_BACKEND", "memory"),
            mongo_uri=os.getenv("MONGO_URI", ""),
            mongo_database=os.getenv("MONGO_DATABASE", "qingxier"),
            event_backend=os.getenv("EVENT_BACKEND", "memory"),
            mqtt_url=os.getenv("MQTT_URL", ""),
            mqtt_username=os.getenv("MQTT_USERNAME", ""),
            mqtt_password=os.getenv("MQTT_PASSWORD", ""),
            mqtt_tls=_env_bool("MQTT_TLS", True),
            provider_mode=os.getenv("SPEECH_PROVIDER_MODE", "mock"),
            dashscope_api_key=os.getenv("DASHSCOPE_API_KEY", ""),
            dashscope_region=os.getenv("DASHSCOPE_REGION", "beijing"),
            dashscope_asr_ws_url=os.getenv(
                "DASHSCOPE_ASR_WS_URL",
                "wss://dashscope.aliyuncs.com/api-ws/v1/inference",
            ),
            dashscope_cosyvoice_url=os.getenv(
                "DASHSCOPE_COSYVOICE_URL",
                "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer",
            ),
            dashscope_qwen_tts_url=os.getenv(
                "DASHSCOPE_QWEN_TTS_URL",
                (
                    "https://dashscope.aliyuncs.com/api/v1/services/aigc/"
                    "multimodal-generation/generation"
                ),
            ),
            dashscope_timeout_seconds=_env_float("DASHSCOPE_TIMEOUT_SECONDS", 20.0),
            cosyvoice_model=os.getenv("COSYVOICE_MODEL", "cosyvoice-v3.5-flash"),
            cosyvoice_singapore_model=os.getenv(
                "COSYVOICE_SINGAPORE_MODEL", "cosyvoice-v3-flash"
            ),
            qwen_system_tts_model=os.getenv("QWEN_SYSTEM_TTS_MODEL", "qwen3-tts-flash"),
            qwen_system_voice=os.getenv("QWEN_SYSTEM_VOICE", "Cherry"),
            tts_fallback_enabled=_env_bool("TTS_FALLBACK_ENABLED", True),
            llm_mode=os.getenv("LLM_MODE", "echo"),
            llm_base_url=os.getenv("LLM_BASE_URL", ""),
            llm_api_key=os.getenv("LLM_API_KEY", ""),
            llm_model=os.getenv("LLM_MODEL", "deepseek-chat"),
            llm_timeout_seconds=_env_float("LLM_TIMEOUT_SECONDS", 20.0),
            speech_ws_base_url=os.getenv(
                "SPEECH_WS_BASE_URL", "wss://voice.invalid/ws/v1/voice"
            ),
            high_confidence_threshold=_env_float("DIALECT_HIGH_THRESHOLD", 0.75),
            medium_confidence_threshold=_env_float("DIALECT_MEDIUM_THRESHOLD", 0.55),
            wake_word=os.getenv("WAKE_WORD", "阿西"),
            wake_model_family=os.getenv("WAKE_MODEL_FAMILY", "WakeNet9"),
            wake_model_version=os.getenv("WAKE_MODEL_VERSION", "wakenet9-axi-1.0.0"),
            wake_threshold=_env_float("WAKE_THRESHOLD", 0.72),
        )

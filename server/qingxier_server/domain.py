from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=True)


class DialectCode(str, Enum):
    mandarin = "mandarin"
    minnan = "minnan"
    wu = "wu"
    cantonese = "cantonese"
    sichuan = "sichuan"
    shaanxi = "shaanxi"
    henan = "henan"
    shanghai = "shanghai"


class AudioInput(StrictModel):
    codec: Literal["pcm", "wav", "opus", "mp3"] = "pcm"
    sampleRate: int = Field(default=16000, ge=8000, le=48000)
    channels: Literal[1, 2] = 1


class SpeechProfileUpdate(StrictModel):
    autoDialect: bool = True
    fallbackDialect: DialectCode
    cloneVoiceId: str | None = Field(default=None, max_length=128)
    version: int = Field(ge=1)


class SpeechSessionCreate(StrictModel):
    deviceId: str = Field(min_length=1, max_length=128)
    wakeWord: str = Field(min_length=1, max_length=16)
    wakeWordScore: float = Field(ge=0, le=1)
    wakeWordModelVersion: str | None = Field(default=None, max_length=128)
    autoDialect: bool = True
    audio: AudioInput = Field(default_factory=AudioInput)


class DialectRouteRequest(StrictModel):
    sessionId: str = Field(min_length=1, max_length=128)
    dialectCandidate: DialectCode
    confidence: float = Field(ge=0, le=1)
    previousDialect: DialectCode | None = None
    featuresVersion: str | None = Field(default=None, max_length=128)


class TtsRequest(StrictModel):
    sessionId: str = Field(min_length=1, max_length=128)
    text: str = Field(min_length=1, max_length=2000)
    dialect: DialectCode
    voiceId: str | None = Field(default=None, max_length=128)
    persona: str | None = Field(default=None, max_length=32)
    stream: bool = False
    model: str | None = Field(default=None, max_length=128)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text 不能为空")
        return value


class DialogTextRequest(StrictModel):
    deviceId: str = Field(min_length=1, max_length=128)
    mode: Literal["child", "adult"] = "adult"
    persona: Literal["mom", "dad", "lover", "teacher", "bestie"] = "mom"
    text: str = Field(min_length=1, max_length=2000)
    dialect: DialectCode = DialectCode.mandarin
    context: dict[str, Any] = Field(default_factory=dict)

    @field_validator("text")
    @classmethod
    def strip_dialog_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text 不能为空")
        return value


class Rollout(StrictModel):
    percent: int = Field(ge=1, le=100)
    batchTags: list[str] = Field(default_factory=list, max_length=32)


class WakeWordPackageCreate(StrictModel):
    packageType: Literal["wake_words"] = "wake_words"
    wakeWord: str = Field(min_length=1, max_length=16)
    modelFamily: str = Field(min_length=1, max_length=64)
    version: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$")
    url: HttpUrl
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    threshold: float = Field(ge=0, le=1)
    hardwareRevisions: list[str] = Field(min_length=1, max_length=32)
    rollbackVersion: str = Field(pattern=r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$")
    rollout: Rollout

    @model_validator(mode="after")
    def validate_versions(self) -> "WakeWordPackageCreate":
        if self.version == self.rollbackVersion:
            raise ValueError("version 与 rollbackVersion 不能相同")
        return self

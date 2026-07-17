from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any
from urllib.parse import quote

from .http_client import ApiClientError, HttpClient, NetworkError


@dataclass
class MiniProgramState:
    api: HttpClient
    route: str = "/pages/device/console"
    device_id: str | None = None
    capabilities: dict[str, Any] | None = None
    speech_profile: dict[str, Any] | None = None
    wake_status: dict[str, Any] | None = None
    detected_dialect: str | None = None
    detected_label: str | None = None
    banner: str | None = None
    retry_visible: bool = False
    manual_dialect_selector_visible: bool = False
    last_trace_id: str | None = None
    audit_events: list[str] = field(default_factory=list)

    def bootstrap(self, device_id: str) -> None:
        self.device_id = device_id
        encoded = quote(device_id, safe="")
        try:
            cap = self.api.request("GET", "/api/v1/speech/capabilities")
            profile = self.api.request("GET", f"/api/v1/devices/{encoded}/speech-profile")
            wake = self.api.request("GET", f"/api/v1/devices/{encoded}/wake-word/status")
        except ApiClientError as exc:
            if exc.response.status == 401:
                self.route = "/pages/login"
                self.banner = "登录已过期，请重新登录"
                return
            raise
        except NetworkError:
            self.retry_visible = True
            self.banner = "网络异常，请重试"
            return
        self.capabilities = cap.body["data"]
        self.speech_profile = profile.body["data"]
        self.wake_status = wake.body["data"]
        self.manual_dialect_selector_visible = False
        self.retry_visible = False
        self.last_trace_id = wake.body["traceId"]
        self.audit_events.append("bootstrap_success")

    def route_speech(self, session_id: str, candidate: str, confidence: float, previous: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "sessionId": session_id,
            "dialectCandidate": candidate,
            "confidence": confidence,
        }
        if previous:
            payload["previousDialect"] = previous
        resp = self.api.request("POST", "/api/v1/speech/route", body=payload, auth="device")
        data = resp.body["data"]
        self.detected_dialect = data["dialect"]
        self.detected_label = data["dialectLabel"]
        self.last_trace_id = resp.body["traceId"]
        if data["dialectSource"] == "profile_fallback":
            self.banner = f"方言置信度较低，已自动使用{data['dialectLabel']}"
        elif data["dialectSource"] == "session_hysteresis":
            self.banner = f"已沿用本轮对话的{data['dialectLabel']}"
        else:
            self.banner = None
        self.audit_events.append(f"dialect:{data['dialect']}:{data['dialectSource']}")
        return data

    def preview_voice(self, text: str, dialect: str, *, voice_id: str | None = None, model: str | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {"text": text, "dialect": dialect, "voiceId": voice_id}
        if model:
            payload["model"] = model
        resp = self.api.request("POST", "/api/v1/speech/tts", body=payload, auth="device")
        data = resp.body["data"]
        self.last_trace_id = resp.body["traceId"]
        if data.get("degraded"):
            self.banner = "当前吴语泛化音色映射为上海话，已记录降级原因"
        self.audit_events.append(f"tts:{data['model']}:{data['requestedDialect']}")
        return data

    def update_fallback_dialect(self, dialect: str) -> None:
        if not self.device_id:
            raise RuntimeError("bootstrap must be called first")
        encoded = quote(self.device_id, safe="")
        resp = self.api.request(
            "PATCH",
            f"/api/v1/devices/{encoded}/speech-profile",
            body={"autoDialect": True, "fallbackDialect": dialect},
        )
        self.speech_profile = resp.body["data"]
        self.last_trace_id = resp.body["traceId"]
        self.audit_events.append(f"fallback:{dialect}")

    def public_snapshot(self) -> dict[str, Any]:
        """Return serializable UI state without credentials or request headers."""
        data = asdict(self)
        data.pop("api", None)
        return data

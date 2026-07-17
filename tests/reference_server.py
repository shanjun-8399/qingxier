from __future__ import annotations

import json
import re
import threading
import time
import uuid
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

SUPPORTED_DIALECTS = [
    "mandarin",
    "minnan",
    "wu",
    "cantonese",
    "sichuan",
    "shaanxi",
    "henan",
    "shanghai",
]
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


@dataclass
class AppState:
    profiles: dict[str, dict[str, Any]] = field(default_factory=lambda: {
        "d_001": {
            "deviceId": "d_001",
            "autoDialect": True,
            "fallbackDialect": "mandarin",
            "sessionLockEnabled": True,
            "highConfidenceThreshold": 0.75,
            "mediumConfidenceThreshold": 0.55,
            "cloneVoiceId": "voice_clone_mom_001",
            "updatedAt": "2026-07-17T00:00:00Z",
        }
    })
    sessions: dict[str, dict[str, Any]] = field(default_factory=dict)
    wake_packages: dict[str, dict[str, Any]] = field(default_factory=dict)
    idempotency: dict[str, dict[str, Any]] = field(default_factory=dict)


STATE = AppState()


def reset_state() -> None:
    global STATE
    STATE = AppState()


class ApiError(Exception):
    def __init__(self, status: int, code: int, name: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.name = name
        self.message = message


class Handler(BaseHTTPRequestHandler):
    server_version = "QingxierReference/1.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        return

    def _trace_id(self) -> str:
        request_id = self.headers.get("X-Request-Id")
        return request_id or f"trc_{uuid.uuid4().hex[:16]}"

    def _send(self, status: int, data: Any = None, *, code: int = 0, message: str = "OK", error_name: str | None = None) -> None:
        payload: dict[str, Any] = {
            "code": code,
            "message": message,
            "data": data,
            "traceId": self._trace_id(),
        }
        if error_name:
            payload["error"] = error_name
        raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("X-Trace-Id", payload["traceId"])
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> dict[str, Any]:
        length_header = self.headers.get("Content-Length", "0")
        try:
            length = int(length_header)
        except ValueError as exc:
            raise ApiError(400, 400001, "INVALID_ARGUMENT", "Content-Length 非法") from exc
        raw = self.rfile.read(length) if length else b"{}"
        try:
            obj = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ApiError(400, 400001, "INVALID_JSON", "JSON 报文无法解析") from exc
        if not isinstance(obj, dict):
            raise ApiError(400, 400001, "INVALID_ARGUMENT", "请求体必须是 JSON 对象")
        return obj

    def _require_user(self) -> None:
        if self.headers.get("Authorization") != "Bearer test-user-token":
            raise ApiError(401, 401001, "UNAUTHORIZED", "用户 Token 无效或过期")

    def _require_admin(self) -> None:
        if self.headers.get("Authorization") != "Bearer test-admin-token":
            raise ApiError(403, 403001, "FORBIDDEN", "需要管理员权限")

    def _require_device(self) -> None:
        if self.headers.get("X-Device-Token") != "test-device-token":
            raise ApiError(401, 401001, "UNAUTHORIZED", "设备 Token 无效或过期")

    def _handle_error(self, exc: Exception) -> None:
        if isinstance(exc, ApiError):
            self._send(exc.status, None, code=exc.code, message=exc.message, error_name=exc.name)
        else:
            self._send(500, None, code=500001, message="服务器内部错误", error_name="INTERNAL_ERROR")

    def do_GET(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            if path == "/health":
                self._send(200, {"status": "ok", "version": "1.1.0"})
                return
            if path == "/api/v1/speech/capabilities":
                self._require_user()
                self._send(200, {
                    "autoDialect": True,
                    "supportedDialects": [
                        {"code": d, "label": DIALECT_LABELS[d]} for d in SUPPORTED_DIALECTS
                    ],
                    "asr": {
                        "provider": "aliyun-dashscope",
                        "primaryModel": "fun-asr-realtime",
                        "languageHintsRequired": False,
                        "dialectClassifier": "qingxier-dialect-router-v1",
                    },
                    "tts": {
                        "clonePrimaryModel": "cosyvoice-v3.5-flash",
                        "systemVoiceFallbackModel": "qwen3-tts-flash-realtime",
                        "clonePrimarySupportsDialectInstruction": True,
                        "systemVoiceFallbackSupportsVoiceClone": False,
                    },
                    "wakeWord": {
                        "text": "阿西",
                        "modelFamily": "WakeNet9",
                        "currentVersion": "wakenet9-axi-1.0.0",
                    },
                })
                return

            match = re.fullmatch(r"/api/v1/devices/([^/]+)/speech-profile", path)
            if match:
                self._require_user()
                device_id = match.group(1)
                profile = STATE.profiles.get(device_id)
                if not profile:
                    raise ApiError(404, 404001, "NOT_FOUND", "设备语音配置不存在")
                self._send(200, profile)
                return

            match = re.fullmatch(r"/api/v1/devices/([^/]+)/wake-word/status", path)
            if match:
                self._require_user()
                device_id = match.group(1)
                if device_id not in STATE.profiles:
                    raise ApiError(404, 404001, "NOT_FOUND", "设备不存在")
                self._send(200, {
                    "deviceId": device_id,
                    "wakeWord": "阿西",
                    "syllableCount": 2,
                    "modelFamily": "WakeNet9",
                    "modelVersion": "wakenet9-axi-1.0.0",
                    "threshold": 0.72,
                    "afeEnabled": True,
                    "aecEnabled": True,
                    "noiseSuppressionEnabled": True,
                    "ota": {"packageType": "wake_words", "rollbackSupported": True},
                    "status": "active",
                })
                return

            raise ApiError(404, 404001, "NOT_FOUND", "接口不存在")
        except Exception as exc:  # pragma: no cover - unified handler
            self._handle_error(exc)

    def do_PATCH(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            match = re.fullmatch(r"/api/v1/devices/([^/]+)/speech-profile", path)
            if not match:
                raise ApiError(404, 404001, "NOT_FOUND", "接口不存在")
            self._require_user()
            device_id = match.group(1)
            profile = STATE.profiles.get(device_id)
            if not profile:
                raise ApiError(404, 404001, "NOT_FOUND", "设备语音配置不存在")
            body = self._read_json()
            if "autoDialect" in body and body["autoDialect"] is not True:
                raise ApiError(400, 400001, "AUTO_DIALECT_REQUIRED", "新需求要求设备保持自动方言识别")
            fallback = body.get("fallbackDialect", profile["fallbackDialect"])
            if fallback not in SUPPORTED_DIALECTS:
                raise ApiError(400, 400001, "UNSUPPORTED_DIALECT", "不支持的兜底方言")
            clone_voice_id = body.get("cloneVoiceId", profile.get("cloneVoiceId"))
            profile.update({
                "autoDialect": True,
                "fallbackDialect": fallback,
                "cloneVoiceId": clone_voice_id,
                "updatedAt": "2026-07-17T00:00:01Z",
            })
            self._send(200, profile)
        except Exception as exc:  # pragma: no cover
            self._handle_error(exc)

    def do_POST(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path
            if path == "/api/v1/speech/sessions":
                self._require_device()
                body = self._read_json()
                if body.get("wakeWord") != "阿西":
                    raise ApiError(400, 400001, "WAKE_WORD_MISMATCH", "唤醒词必须为“阿西”")
                if body.get("autoDialect") is not True:
                    raise ApiError(400, 400001, "AUTO_DIALECT_REQUIRED", "必须启用自动方言识别")
                device_id = body.get("deviceId")
                if device_id not in STATE.profiles:
                    raise ApiError(404, 404001, "NOT_FOUND", "设备不存在")
                session_id = f"ssn_{uuid.uuid4().hex[:12]}"
                session = {
                    "sessionId": session_id,
                    "deviceId": device_id,
                    "wakeWord": "阿西",
                    "wakeWordModelVersion": body.get("wakeWordModelVersion", "wakenet9-axi-1.0.0"),
                    "autoDialect": True,
                    "lockedDialect": None,
                    "createdAt": "2026-07-17T00:00:00Z",
                }
                STATE.sessions[session_id] = session
                self._send(201, session)
                return

            if path == "/api/v1/speech/route":
                self._require_device()
                body = self._read_json()
                session = STATE.sessions.get(str(body.get("sessionId", "")))
                if not session:
                    raise ApiError(404, 404001, "NOT_FOUND", "语音会话不存在")
                candidate = body.get("dialectCandidate")
                if candidate not in SUPPORTED_DIALECTS:
                    raise ApiError(400, 400001, "UNSUPPORTED_DIALECT", "方言候选值不受支持")
                try:
                    confidence = float(body.get("confidence"))
                except (TypeError, ValueError) as exc:
                    raise ApiError(400, 400001, "INVALID_ARGUMENT", "confidence 必须是数值") from exc
                if confidence < 0 or confidence > 1:
                    raise ApiError(400, 400001, "INVALID_ARGUMENT", "confidence 必须在 0 到 1 之间")
                profile = STATE.profiles[session["deviceId"]]
                previous = body.get("previousDialect") or session.get("lockedDialect")
                if confidence >= profile["highConfidenceThreshold"]:
                    selected = candidate
                    source = "classifier"
                    session["lockedDialect"] = candidate
                    stability = "locked"
                elif confidence >= profile["mediumConfidenceThreshold"] and previous in SUPPORTED_DIALECTS:
                    selected = previous
                    source = "session_hysteresis"
                    stability = "retained"
                else:
                    selected = profile["fallbackDialect"]
                    source = "profile_fallback"
                    stability = "fallback"
                self._send(200, {
                    "sessionId": session["sessionId"],
                    "language": "zh",
                    "dialect": selected,
                    "dialectLabel": DIALECT_LABELS[selected],
                    "candidateDialect": candidate,
                    "dialectConfidence": confidence,
                    "dialectSource": source,
                    "stability": stability,
                    "manualSwitchRequired": False,
                })
                return

            if path == "/api/v1/speech/tts":
                self._require_device()
                body = self._read_json()
                text = str(body.get("text", "")).strip()
                if not text:
                    raise ApiError(400, 400001, "INVALID_ARGUMENT", "text 不能为空")
                dialect = body.get("dialect")
                if dialect not in SUPPORTED_DIALECTS:
                    raise ApiError(400, 400001, "UNSUPPORTED_DIALECT", "TTS 方言不受支持")
                voice_id = body.get("voiceId")
                requested_model = body.get("model")
                if voice_id and requested_model and str(requested_model).startswith("qwen3-tts"):
                    raise ApiError(409, 409101, "VOICE_CLONE_UNSUPPORTED_BY_MODEL", "Qwen3-TTS-Flash 不支持声音克隆")
                degraded = dialect == "wu"
                fallback_reason = "WU_GENERIC_MAPPED_TO_SHANGHAI" if degraded else None
                if voice_id:
                    model = "cosyvoice-v3.5-flash"
                    mode = "cloned_voice"
                else:
                    model = "qwen3-tts-flash-realtime"
                    mode = "system_voice"
                self._send(200, {
                    "audioUrl": f"https://cdn.invalid/tts/{uuid.uuid4().hex}.mp3",
                    "provider": "aliyun-dashscope",
                    "model": model,
                    "voiceMode": mode,
                    "voiceId": voice_id,
                    "requestedDialect": dialect,
                    "providerDialect": PROVIDER_DIALECTS[dialect],
                    "degraded": degraded,
                    "fallbackReason": fallback_reason,
                    "audio": {"codec": "mp3", "sampleRate": 24000},
                    "firstAudioLatencyMs": 420,
                })
                return

            if path == "/api/v1/dialogs/text":
                self._require_user()
                body = self._read_json()
                text = str(body.get("text", "")).strip()
                if not text:
                    raise ApiError(400, 400001, "INVALID_ARGUMENT", "text 不能为空")
                dialect = body.get("dialect", "mandarin")
                if dialect not in SUPPORTED_DIALECTS:
                    raise ApiError(400, 400001, "UNSUPPORTED_DIALECT", "方言不受支持")
                self._send(200, {
                    "conversationId": "c_contract_001",
                    "replyText": f"收到：{text}",
                    "detectedDialect": dialect,
                    "autoDialect": True,
                    "voiceId": STATE.profiles["d_001"].get("cloneVoiceId"),
                    "ttsModel": "cosyvoice-v3.5-flash",
                })
                return

            if path == "/api/v1/admin/wake-word-packages":
                self._require_admin()
                body = self._read_json()
                idem = self.headers.get("Idempotency-Key")
                if idem and idem in STATE.idempotency:
                    self._send(200, STATE.idempotency[idem])
                    return
                if body.get("wakeWord") != "阿西":
                    raise ApiError(400, 400001, "WAKE_WORD_MISMATCH", "唤醒词包只能包含“阿西”")
                if body.get("modelFamily") != "WakeNet9":
                    raise ApiError(400, 400001, "INVALID_MODEL_FAMILY", "ESP32-S3 唤醒词包必须使用 WakeNet9")
                sha256 = str(body.get("sha256", ""))
                if not re.fullmatch(r"[0-9a-f]{64}", sha256):
                    raise ApiError(400, 400001, "INVALID_ARGUMENT", "sha256 必须为 64 位小写十六进制")
                package_id = f"wwp_{uuid.uuid4().hex[:10]}"
                package = {
                    "packageId": package_id,
                    "packageType": "wake_words",
                    "wakeWord": "阿西",
                    "modelFamily": "WakeNet9",
                    "version": body.get("version"),
                    "sha256": sha256,
                    "rollbackSupported": True,
                    "status": "registered",
                }
                STATE.wake_packages[package_id] = package
                if idem:
                    STATE.idempotency[idem] = package
                self._send(201, package)
                return

            raise ApiError(404, 404001, "NOT_FOUND", "接口不存在")
        except Exception as exc:  # pragma: no cover
            self._handle_error(exc)


class ReferenceServer:
    def __init__(self) -> None:
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.base_url = f"http://127.0.0.1:{self.httpd.server_port}"

    def start(self) -> "ReferenceServer":
        self.thread.start()
        # Avoid a race in very slow CI environments.
        time.sleep(0.01)
        return self

    def stop(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=2)

    def __enter__(self) -> "ReferenceServer":
        return self.start()

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.stop()

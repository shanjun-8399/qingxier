from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from .asr import LexicalDialectClassifier, build_asr_session
from .domain import DialectRouteRequest, TtsRequest
from .errors import DomainError
from .integrations import ProviderError
from .security import authenticate_device_token, ensure_device_access


def _ws_error(exc: DomainError, trace_id: str) -> dict[str, Any]:
    return {
        "type": "error",
        "code": exc.code,
        "error": exc.name,
        "message": exc.message,
        "recoverable": exc.status < 500 or exc.code in {503101, 503102},
        "traceId": trace_id,
    }


def register_voice_websocket(app: FastAPI) -> None:
    classifier = LexicalDialectClassifier()

    @app.websocket("/ws/v1/voice")
    async def voice_socket(websocket: WebSocket) -> None:
        settings = websocket.app.state.settings
        repository = websocket.app.state.repository
        speech = websocket.app.state.service
        session_id = websocket.query_params.get("sessionId", "")
        token = websocket.headers.get("X-Device-Token") or websocket.query_params.get("token")
        trace_id = websocket.headers.get("X-Request-Id") or f"trc_ws_{session_id[-12:]}"
        try:
            if not token:
                raise DomainError(401, 401001, "UNAUTHORIZED", "WebSocket 缺少设备 Token")
            principal = authenticate_device_token(token, settings)
            session = await asyncio.to_thread(repository.get_session, session_id)
            if not session:
                raise DomainError(404, 404001, "NOT_FOUND", "语音会话不存在")
            ensure_device_access(principal, session["deviceId"])
        except DomainError as exc:
            await websocket.close(code=4401 if exc.status == 401 else 4403, reason=exc.message)
            return

        await websocket.accept()
        asr_session = build_asr_session(settings, session.get("audio") or {})
        await websocket.send_json(
            {
                "type": "session_ready",
                "sessionId": session_id,
                "traceId": trace_id,
                "autoDialect": True,
                "fallbackDialect": session["fallbackDialect"],
                "wakeWord": session["wakeWord"],
                "wakeWordModelVersion": session["wakeWordModelVersion"],
            }
        )

        async def emit_asr(text: str, is_final: bool, provider_request_id: str | None = None):
            prediction = classifier.classify(text)
            routed = await asyncio.to_thread(
                speech.route_dialect,
                principal,
                DialectRouteRequest(
                    sessionId=session_id,
                    dialectCandidate=prediction.dialect,
                    confidence=prediction.confidence,
                ),
            )
            await websocket.send_json(
                {
                    "type": "asr_result",
                    "text": text,
                    "isFinal": is_final,
                    "language": "zh",
                    "dialect": routed["dialect"],
                    "dialectConfidence": routed["dialectConfidence"],
                    "dialectSource": routed["dialectSource"],
                    "stability": routed["stability"],
                    "asrModel": "fun-asr-realtime",
                    "dialectModel": routed["modelVersion"],
                    "providerRequestId": provider_request_id,
                    "traceId": trace_id,
                }
            )

        try:
            while True:
                message = await websocket.receive()
                if message.get("type") == "websocket.disconnect":
                    raise WebSocketDisconnect(message.get("code", 1000))
                if message.get("bytes") is not None:
                    try:
                        await asyncio.to_thread(asr_session.send_audio, message["bytes"])
                        events = await asyncio.to_thread(asr_session.drain)
                        for event in events:
                            if event.error:
                                raise ProviderError(event.error)
                            if event.text:
                                await emit_asr(
                                    event.text, event.is_final, event.provider_request_id
                                )
                    except ProviderError as exc:
                        await websocket.send_json(
                            _ws_error(
                                DomainError(
                                    503,
                                    503101,
                                    "ASR_PROVIDER_UNAVAILABLE",
                                    str(exc),
                                ),
                                trace_id,
                            )
                        )
                    continue
                raw = message.get("text")
                if raw is None:
                    continue
                try:
                    payload = json.loads(raw)
                    if not isinstance(payload, dict):
                        raise ValueError("payload must be object")
                except (json.JSONDecodeError, ValueError):
                    await websocket.send_json(
                        _ws_error(
                            DomainError(400, 400001, "INVALID_JSON", "WebSocket JSON 非法"),
                            trace_id,
                        )
                    )
                    continue
                event_type = payload.get("type")
                try:
                    if event_type == "ping":
                        await websocket.send_json({"type": "pong", "traceId": trace_id})
                    elif event_type == "start":
                        if payload.get("sessionId") not in {None, session_id}:
                            raise DomainError(400, 400001, "INVALID_ARGUMENT", "sessionId 不匹配")
                        if payload.get("wakeWord", session["wakeWord"]) != settings.wake_word:
                            raise DomainError(400, 400103, "WAKE_WORD_MISMATCH", "唤醒词不匹配")
                        await asyncio.to_thread(asr_session.start)
                        await websocket.send_json(
                            {"type": "started", "sessionId": session_id, "traceId": trace_id}
                        )
                    elif event_type == "asr_result":
                        text = str(payload.get("text", "")).strip()
                        if not text:
                            raise DomainError(400, 400001, "INVALID_ARGUMENT", "ASR 文本不能为空")
                        if payload.get("dialectCandidate"):
                            routed = await asyncio.to_thread(
                                speech.route_dialect,
                                principal,
                                DialectRouteRequest(
                                    sessionId=session_id,
                                    dialectCandidate=payload["dialectCandidate"],
                                    confidence=payload.get("confidence", 0.5),
                                    previousDialect=payload.get("previousDialect"),
                                ),
                            )
                            await websocket.send_json(
                                {
                                    "type": "asr_result",
                                    "text": text,
                                    "isFinal": bool(payload.get("isFinal", True)),
                                    "language": "zh",
                                    "dialect": routed["dialect"],
                                    "dialectConfidence": routed["dialectConfidence"],
                                    "dialectSource": routed["dialectSource"],
                                    "stability": routed["stability"],
                                    "asrModel": "fun-asr-realtime",
                                    "dialectModel": routed["modelVersion"],
                                    "traceId": trace_id,
                                }
                            )
                        else:
                            await emit_asr(text, bool(payload.get("isFinal", True)))
                    elif event_type == "tts_request":
                        result = await asyncio.to_thread(
                            speech.synthesize,
                            principal,
                            TtsRequest(
                                sessionId=session_id,
                                text=payload.get("text", ""),
                                dialect=payload.get(
                                    "dialect",
                                    session.get("lockedDialect") or session["fallbackDialect"],
                                ),
                                voiceId=payload.get("voiceId"),
                                persona=payload.get("persona"),
                                stream=bool(payload.get("stream", False)),
                                model=payload.get("model"),
                            ),
                            trace_id,
                        )
                        await websocket.send_json(
                            {
                                "type": "tts_start",
                                "model": result["model"],
                                "voiceMode": result["voiceMode"],
                                "voiceId": result["voiceId"],
                                "requestedDialect": result["requestedDialect"],
                                "providerDialect": result["providerDialect"],
                                "degraded": result["degraded"],
                                "fallbackReason": result["fallbackReason"],
                                "traceId": trace_id,
                            }
                        )
                        await websocket.send_json(
                            {
                                "type": "tts_result",
                                "audioUrl": result["audioUrl"],
                                "audio": result["audio"],
                                "firstAudioLatencyMs": result["firstAudioLatencyMs"],
                                "traceId": trace_id,
                            }
                        )
                    elif event_type == "end":
                        await asyncio.to_thread(asr_session.stop)
                        events = await asyncio.to_thread(asr_session.drain)
                        for event in events:
                            if event.error:
                                raise ProviderError(event.error)
                            if event.text:
                                await emit_asr(
                                    event.text, event.is_final, event.provider_request_id
                                )
                        await websocket.send_json(
                            {"type": "completed", "sessionId": session_id, "traceId": trace_id}
                        )
                        await websocket.close(code=1000)
                        return
                    else:
                        raise DomainError(400, 400001, "INVALID_ARGUMENT", "不支持的 WebSocket 事件")
                except ValidationError:
                    await websocket.send_json(
                        _ws_error(
                            DomainError(
                                400,
                                400001,
                                "INVALID_ARGUMENT",
                                "WebSocket 请求参数校验失败",
                            ),
                            trace_id,
                        )
                    )
                except DomainError as exc:
                    await websocket.send_json(_ws_error(exc, trace_id))
                except ProviderError as exc:
                    await websocket.send_json(
                        _ws_error(
                            DomainError(503, 503101, "ASR_PROVIDER_UNAVAILABLE", str(exc)),
                            trace_id,
                        )
                    )
        except WebSocketDisconnect:
            try:
                await asyncio.to_thread(asr_session.stop)
            except ProviderError:
                pass

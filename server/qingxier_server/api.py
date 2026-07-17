from __future__ import annotations

import re
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings
from .domain import (
    DialogTextRequest,
    DialectRouteRequest,
    SpeechProfileUpdate,
    SpeechSessionCreate,
    TtsRequest,
    WakeWordPackageCreate,
)
from .errors import DomainError, install_exception_handlers, ok
from .hardened_service import HardenedSpeechService
from .integrations import (
    EventPublisher,
    LlmProvider,
    TtsProvider,
    build_event_publisher,
    build_llm_provider,
    build_tts_provider,
)
from .repository import Repository, build_repository
from .security import Principal, require_admin, require_device, require_user
from .services import SpeechService
from .websocket_api import register_voice_websocket

_TRACE_RE = re.compile(r"^[A-Za-z0-9_.:-]{1,128}$")


def _service(request: Request) -> SpeechService:
    return request.app.state.service


def create_app(
    *,
    settings: Settings | None = None,
    repository: Repository | None = None,
    publisher: EventPublisher | None = None,
    tts_provider: TtsProvider | None = None,
    llm_provider: LlmProvider | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    settings.validate_startup()
    repository = repository or build_repository(settings)
    publisher = publisher or build_event_publisher(settings)
    tts_provider = tts_provider or build_tts_provider(settings)
    llm_provider = llm_provider or build_llm_provider(settings)
    service = HardenedSpeechService(
        settings, repository, publisher, tts_provider, llm_provider
    )

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        llm_provider.close()
        tts_provider.close()
        publisher.close()
        repository.close()

    app = FastAPI(
        title="庆喜儿语音服务",
        description="V1.1 自动方言、克隆音色 TTS 与‘阿西’唤醒词服务",
        version=settings.app_version,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.repository = repository
    app.state.publisher = publisher
    app.state.tts_provider = tts_provider
    app.state.llm_provider = llm_provider
    app.state.service = service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-Device-Token",
            "X-Request-Id",
            "X-MFA-Verified",
            "Idempotency-Key",
        ],
    )

    @app.middleware("http")
    async def trace_middleware(request: Request, call_next):
        requested = request.headers.get("X-Request-Id", "")
        request.state.trace_id = (
            requested
            if _TRACE_RE.fullmatch(requested)
            else f"trc_{uuid.uuid4().hex[:20]}"
        )
        response = await call_next(request)
        response.headers["X-Trace-Id"] = request.state.trace_id
        return response

    install_exception_handlers(app)
    register_voice_websocket(app)

    @app.get("/health")
    def health(request: Request):
        return ok(
            request,
            {
                "status": "ok",
                "service": settings.app_name,
                "version": settings.app_version,
                "environment": settings.app_env,
            },
        )

    @app.get("/ready")
    def ready(request: Request, speech: SpeechService = Depends(_service)):
        data = speech.readiness()
        if data["status"] != "ready":
            raise DomainError(503, 503000, "NOT_READY", "服务尚未就绪")
        return ok(request, data)

    @app.get("/api/v1/speech/capabilities")
    def capabilities(
        request: Request,
        _: Principal = Depends(require_user),
        speech: SpeechService = Depends(_service),
    ):
        return ok(request, speech.capabilities())

    @app.get("/api/v1/devices/{device_id}/speech-profile")
    def get_profile(
        device_id: str,
        request: Request,
        principal: Principal = Depends(require_user),
        speech: SpeechService = Depends(_service),
    ):
        return ok(request, speech.get_profile(principal, device_id))

    @app.patch("/api/v1/devices/{device_id}/speech-profile")
    def update_profile(
        device_id: str,
        body: SpeechProfileUpdate,
        request: Request,
        principal: Principal = Depends(require_user),
        speech: SpeechService = Depends(_service),
    ):
        return ok(
            request,
            speech.update_profile(principal, device_id, body, request.state.trace_id),
        )

    @app.get("/api/v1/devices/{device_id}/wake-word/status")
    def wake_status(
        device_id: str,
        request: Request,
        principal: Principal = Depends(require_user),
        speech: SpeechService = Depends(_service),
    ):
        return ok(request, speech.get_wake_status(principal, device_id))

    @app.post("/api/v1/speech/sessions")
    def create_session(
        body: SpeechSessionCreate,
        request: Request,
        principal: Principal = Depends(require_device),
        speech: SpeechService = Depends(_service),
    ):
        return ok(request, speech.create_session(principal, body), status_code=201)

    @app.post("/api/v1/speech/route")
    def route_dialect(
        body: DialectRouteRequest,
        request: Request,
        principal: Principal = Depends(require_device),
        speech: SpeechService = Depends(_service),
    ):
        return ok(request, speech.route_dialect(principal, body))

    @app.post("/api/v1/speech/tts")
    def synthesize(
        body: TtsRequest,
        request: Request,
        principal: Principal = Depends(require_device),
        speech: SpeechService = Depends(_service),
    ):
        return ok(
            request,
            speech.synthesize(principal, body, request.state.trace_id),
        )

    @app.post("/api/v1/dialogs/text")
    def dialog_text(
        body: DialogTextRequest,
        request: Request,
        principal: Principal = Depends(require_user),
        speech: SpeechService = Depends(_service),
    ):
        return ok(
            request,
            speech.dialog_text(principal, body, request.state.trace_id),
        )

    @app.post("/api/v1/admin/wake-word-packages")
    def create_wake_package(
        body: WakeWordPackageCreate,
        request: Request,
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
        principal: Principal = Depends(require_admin),
        speech: SpeechService = Depends(_service),
    ):
        package, replayed = speech.register_wake_package(
            principal,
            body,
            idempotency_key,
            request.state.trace_id,
        )
        response = ok(request, package, status_code=200 if replayed else 201)
        response.headers["Idempotency-Replayed"] = "true" if replayed else "false"
        return response

    return app

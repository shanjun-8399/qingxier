from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class DomainError(Exception):
    def __init__(
        self,
        status: int,
        code: int,
        name: str,
        message: str,
        data: Any = None,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.code = code
        self.name = name
        self.message = message
        self.data = data


def trace_id(request: Request) -> str:
    return getattr(request.state, "trace_id", "trc_unknown")


def ok(request: Request, data: Any = None, status_code: int = 200) -> JSONResponse:
    trace = trace_id(request)
    return JSONResponse(
        status_code=status_code,
        content={"code": 0, "message": "OK", "data": data, "traceId": trace},
        headers={"X-Trace-Id": trace},
    )


def _error_response(request: Request, exc: DomainError) -> JSONResponse:
    trace = trace_id(request)
    return JSONResponse(
        status_code=exc.status,
        content={
            "code": exc.code,
            "message": exc.message,
            "error": exc.name,
            "data": exc.data,
            "traceId": trace,
        },
        headers={"X-Trace-Id": trace},
    )


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        return _error_response(request, exc)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return _error_response(
            request,
            DomainError(
                400,
                400001,
                "INVALID_ARGUMENT",
                "请求参数校验失败",
                {
                    "details": jsonable_encoder(
                        [
                            {key: value for key, value in item.items() if key != "ctx"}
                            for item in exc.errors()
                        ]
                    )
                },
            ),
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled server error", exc_info=exc)
        return _error_response(
            request,
            DomainError(500, 500001, "INTERNAL_ERROR", "服务器内部错误"),
        )

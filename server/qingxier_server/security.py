from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import Header, Request

from .config import Settings
from .errors import DomainError


@dataclass(frozen=True, slots=True)
class Principal:
    subject: str
    role: str
    device_id: str | None = None
    bound_devices: frozenset[str] = field(default_factory=frozenset)


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def _decode_hs256(token: str, settings: Settings) -> dict[str, Any]:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        header = json.loads(_b64url_decode(encoded_header))
        payload = json.loads(_b64url_decode(encoded_payload))
    except (ValueError, binascii.Error, json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 格式非法") from exc
    if header.get("alg") != "HS256":
        raise DomainError(401, 401001, "UNAUTHORIZED", "仅支持 HS256 Token")
    expected = hmac.new(
        settings.jwt_secret.encode("utf-8"),
        f"{encoded_header}.{encoded_payload}".encode("ascii"),
        hashlib.sha256,
    ).digest()
    try:
        actual = _b64url_decode(encoded_signature)
    except (ValueError, binascii.Error) as exc:
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 签名非法") from exc
    if not hmac.compare_digest(expected, actual):
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 签名无效")
    if payload.get("iss") != settings.jwt_issuer:
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 签发方无效")
    try:
        expires_at = float(payload.get("exp", 0))
    except (TypeError, ValueError) as exc:
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 过期时间非法") from exc
    if expires_at <= time.time():
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 已过期")
    return payload


def _principal_from_token(token: str, settings: Settings) -> Principal:
    if not settings.is_production:
        if token == settings.user_token:
            return Principal("u_001", "user", bound_devices=frozenset({"d_001"}))
        if token == settings.admin_token:
            return Principal("admin_001", "admin", bound_devices=frozenset({"d_001"}))
        if token == settings.device_token:
            return Principal("d_001", "device", device_id="d_001")
    if not settings.jwt_secret:
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 无效或过期")
    payload = _decode_hs256(token, settings)
    role = str(payload.get("role", ""))
    subject = str(payload.get("sub", ""))
    if not role or not subject:
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 缺少身份字段")
    bound = payload.get("bound_devices") or []
    if not isinstance(bound, list):
        raise DomainError(401, 401001, "UNAUTHORIZED", "Token 设备权限字段非法")
    return Principal(
        subject=subject,
        role=role,
        device_id=str(payload["device_id"]) if payload.get("device_id") else None,
        bound_devices=frozenset(str(item) for item in bound),
    )


def authenticate_device_token(token: str, settings: Settings) -> Principal:
    principal = _principal_from_token(token, settings)
    if principal.role != "device" or not principal.device_id:
        raise DomainError(403, 403001, "FORBIDDEN", "需要设备权限")
    return principal


def _settings(request: Request) -> Settings:
    return request.app.state.settings


async def require_user(
    request: Request, authorization: str | None = Header(default=None)
) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise DomainError(401, 401001, "UNAUTHORIZED", "缺少 Bearer Token")
    principal = _principal_from_token(
        authorization.removeprefix("Bearer ").strip(), _settings(request)
    )
    if principal.role not in {"user", "admin"}:
        raise DomainError(403, 403001, "FORBIDDEN", "需要用户权限")
    return principal


async def require_device(
    request: Request, x_device_token: str | None = Header(default=None, alias="X-Device-Token")
) -> Principal:
    if not x_device_token:
        raise DomainError(401, 401001, "UNAUTHORIZED", "缺少设备 Token")
    principal = _principal_from_token(x_device_token, _settings(request))
    if principal.role != "device" or not principal.device_id:
        raise DomainError(403, 403001, "FORBIDDEN", "需要设备权限")
    return principal


async def require_admin(
    request: Request,
    authorization: str | None = Header(default=None),
    x_mfa_verified: str | None = Header(default=None, alias="X-MFA-Verified"),
) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise DomainError(401, 401001, "UNAUTHORIZED", "缺少管理员 Token")
    principal = _principal_from_token(
        authorization.removeprefix("Bearer ").strip(), _settings(request)
    )
    if principal.role != "admin":
        raise DomainError(403, 403001, "FORBIDDEN", "需要管理员权限")
    if _settings(request).admin_require_mfa and str(x_mfa_verified).lower() != "true":
        raise DomainError(403, 403002, "MFA_REQUIRED", "该操作需要完成 MFA")
    return principal


def ensure_device_access(principal: Principal, device_id: str) -> None:
    if principal.role == "admin":
        return
    if principal.role == "device" and principal.device_id == device_id:
        return
    if principal.role == "user" and device_id in principal.bound_devices:
        return
    raise DomainError(403, 403001, "FORBIDDEN", "无权访问该设备")

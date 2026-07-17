from __future__ import annotations

import copy
import hashlib
import json
import threading
import uuid
from datetime import UTC, datetime
from typing import Any, Protocol

from .config import Settings
from .errors import DomainError


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def request_fingerprint(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class Repository(Protocol):
    def ping(self) -> bool: ...
    def close(self) -> None: ...
    def is_bound(self, user_id: str, device_id: str) -> bool: ...
    def get_profile(self, device_id: str) -> dict[str, Any] | None: ...
    def update_profile(
        self, device_id: str, expected_version: int, changes: dict[str, Any]
    ) -> dict[str, Any]: ...
    def get_wake_status(self, device_id: str) -> dict[str, Any] | None: ...
    def create_session(self, data: dict[str, Any]) -> dict[str, Any]: ...
    def get_session(self, session_id: str) -> dict[str, Any] | None: ...
    def update_session(self, session_id: str, changes: dict[str, Any]) -> dict[str, Any]: ...
    def get_idempotency(self, key: str) -> dict[str, Any] | None: ...
    def put_idempotency(
        self, key: str, fingerprint: str, response: dict[str, Any]
    ) -> None: ...
    def get_wake_package_by_version(self, version: str) -> dict[str, Any] | None: ...
    def create_wake_package(self, data: dict[str, Any]) -> dict[str, Any]: ...
    def append_audit(self, data: dict[str, Any]) -> None: ...


class InMemoryRepository:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = threading.RLock()
        self._profiles: dict[str, dict[str, Any]] = {
            "d_001": {
                "deviceId": "d_001",
                "autoDialect": True,
                "fallbackDialect": "mandarin",
                "sessionLockEnabled": True,
                "highConfidenceThreshold": settings.high_confidence_threshold,
                "mediumConfidenceThreshold": settings.medium_confidence_threshold,
                "cloneVoiceId": "voice_clone_mom_001",
                "version": 1,
                "appliedAt": None,
                "updatedAt": utc_now(),
            }
        }
        self._wake_status: dict[str, dict[str, Any]] = {
            "d_001": {
                "deviceId": "d_001",
                "wakeWord": settings.wake_word,
                "syllableCount": 2,
                "modelFamily": settings.wake_model_family,
                "modelVersion": settings.wake_model_version,
                "threshold": settings.wake_threshold,
                "afeEnabled": True,
                "aecEnabled": True,
                "noiseSuppressionEnabled": True,
                "ota": {
                    "packageType": "wake_words",
                    "targetVersion": None,
                    "status": "active",
                    "rollbackSupported": True,
                },
            }
        }
        self._bindings = {("u_001", "d_001")}
        self._sessions: dict[str, dict[str, Any]] = {}
        self._wake_packages: dict[str, dict[str, Any]] = {}
        self._wake_versions: dict[str, str] = {}
        self._idempotency: dict[str, dict[str, Any]] = {}
        self._audit: list[dict[str, Any]] = []

    def ping(self) -> bool:
        return True

    def close(self) -> None:
        return None

    def is_bound(self, user_id: str, device_id: str) -> bool:
        with self._lock:
            return (user_id, device_id) in self._bindings

    def get_profile(self, device_id: str) -> dict[str, Any] | None:
        with self._lock:
            value = self._profiles.get(device_id)
            return copy.deepcopy(value) if value else None

    def update_profile(
        self, device_id: str, expected_version: int, changes: dict[str, Any]
    ) -> dict[str, Any]:
        with self._lock:
            current = self._profiles.get(device_id)
            if not current:
                raise DomainError(404, 404001, "NOT_FOUND", "设备语音配置不存在")
            if current["version"] != expected_version:
                raise DomainError(
                    409,
                    409102,
                    "SPEECH_PROFILE_CONFLICT",
                    "语音配置已被其他请求修改",
                    {"currentVersion": current["version"]},
                )
            current.update(copy.deepcopy(changes))
            current["version"] += 1
            current["updatedAt"] = utc_now()
            return copy.deepcopy(current)

    def get_wake_status(self, device_id: str) -> dict[str, Any] | None:
        with self._lock:
            value = self._wake_status.get(device_id)
            return copy.deepcopy(value) if value else None

    def create_session(self, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            session = copy.deepcopy(data)
            session.setdefault("sessionId", f"ssn_{uuid.uuid4().hex[:16]}")
            session.setdefault("createdAt", utc_now())
            self._sessions[session["sessionId"]] = session
            return copy.deepcopy(session)

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            value = self._sessions.get(session_id)
            return copy.deepcopy(value) if value else None

    def update_session(self, session_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            current = self._sessions.get(session_id)
            if not current:
                raise DomainError(404, 404001, "NOT_FOUND", "语音会话不存在")
            current.update(copy.deepcopy(changes))
            current["updatedAt"] = utc_now()
            return copy.deepcopy(current)

    def get_idempotency(self, key: str) -> dict[str, Any] | None:
        with self._lock:
            value = self._idempotency.get(key)
            return copy.deepcopy(value) if value else None

    def put_idempotency(
        self, key: str, fingerprint: str, response: dict[str, Any]
    ) -> None:
        with self._lock:
            self._idempotency[key] = {
                "fingerprint": fingerprint,
                "response": copy.deepcopy(response),
                "createdAt": utc_now(),
            }

    def get_wake_package_by_version(self, version: str) -> dict[str, Any] | None:
        with self._lock:
            package_id = self._wake_versions.get(version)
            value = self._wake_packages.get(package_id or "")
            return copy.deepcopy(value) if value else None

    def create_wake_package(self, data: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            version = str(data["version"])
            if version in self._wake_versions:
                raise DomainError(409, 409001, "CONFLICT", "同一唤醒词模型版本已存在")
            package = copy.deepcopy(data)
            package["packageId"] = f"wwp_{uuid.uuid4().hex[:12]}"
            package["status"] = "registered"
            package["registeredAt"] = utc_now()
            self._wake_packages[package["packageId"]] = package
            self._wake_versions[version] = package["packageId"]
            return copy.deepcopy(package)

    def append_audit(self, data: dict[str, Any]) -> None:
        with self._lock:
            event = copy.deepcopy(data)
            event.setdefault("auditId", f"aud_{uuid.uuid4().hex[:12]}")
            event.setdefault("createdAt", utc_now())
            self._audit.append(event)

    @property
    def audit_events(self) -> list[dict[str, Any]]:
        with self._lock:
            return copy.deepcopy(self._audit)


class MongoRepository:
    """MongoDB 生产适配器。仅在 STORAGE_BACKEND=mongo 时加载 pymongo。"""

    def __init__(self, settings: Settings) -> None:
        try:
            from pymongo import ASCENDING, MongoClient, ReturnDocument
            from pymongo.errors import DuplicateKeyError
        except ImportError as exc:  # pragma: no cover - optional runtime dependency
            raise RuntimeError("MongoDB 模式需要安装 pymongo") from exc
        self._ReturnDocument = ReturnDocument
        self._DuplicateKeyError = DuplicateKeyError
        self.client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=3000)
        self.db = self.client[settings.mongo_database]
        self.profiles = self.db.speech_profiles
        self.bindings = self.db.device_bindings
        self.sessions = self.db.speech_sessions
        self.wake_status = self.db.wake_word_status
        self.wake_packages = self.db.wake_word_packages
        self.idempotency = self.db.idempotency_keys
        self.audit = self.db.audit_logs
        self.profiles.create_index("deviceId", unique=True)
        self.bindings.create_index([("userId", ASCENDING), ("deviceId", ASCENDING)], unique=True)
        self.sessions.create_index("sessionId", unique=True)
        self.wake_status.create_index("deviceId", unique=True)
        self.wake_packages.create_index("version", unique=True)
        self.idempotency.create_index("key", unique=True)

    @staticmethod
    def _clean(doc: dict[str, Any] | None) -> dict[str, Any] | None:
        if not doc:
            return None
        value = copy.deepcopy(doc)
        value.pop("_id", None)
        return value

    def ping(self) -> bool:
        self.client.admin.command("ping")
        return True

    def close(self) -> None:
        self.client.close()

    def is_bound(self, user_id: str, device_id: str) -> bool:
        return self.bindings.count_documents(
            {"userId": user_id, "deviceId": device_id, "bindStatus": {"$ne": "revoked"}},
            limit=1,
        ) > 0

    def get_profile(self, device_id: str) -> dict[str, Any] | None:
        return self._clean(self.profiles.find_one({"deviceId": device_id}))

    def update_profile(
        self, device_id: str, expected_version: int, changes: dict[str, Any]
    ) -> dict[str, Any]:
        update = copy.deepcopy(changes)
        update["updatedAt"] = utc_now()
        result = self.profiles.find_one_and_update(
            {"deviceId": device_id, "version": expected_version},
            {"$set": update, "$inc": {"version": 1}},
            return_document=self._ReturnDocument.AFTER,
        )
        if result:
            return self._clean(result) or {}
        current = self.profiles.find_one({"deviceId": device_id})
        if not current:
            raise DomainError(404, 404001, "NOT_FOUND", "设备语音配置不存在")
        raise DomainError(
            409,
            409102,
            "SPEECH_PROFILE_CONFLICT",
            "语音配置已被其他请求修改",
            {"currentVersion": current.get("version")},
        )

    def get_wake_status(self, device_id: str) -> dict[str, Any] | None:
        return self._clean(self.wake_status.find_one({"deviceId": device_id}))

    def create_session(self, data: dict[str, Any]) -> dict[str, Any]:
        value = copy.deepcopy(data)
        value.setdefault("sessionId", f"ssn_{uuid.uuid4().hex[:16]}")
        value.setdefault("createdAt", utc_now())
        self.sessions.insert_one(copy.deepcopy(value))
        return value

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        return self._clean(self.sessions.find_one({"sessionId": session_id}))

    def update_session(self, session_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        update = copy.deepcopy(changes)
        update["updatedAt"] = utc_now()
        result = self.sessions.find_one_and_update(
            {"sessionId": session_id},
            {"$set": update},
            return_document=self._ReturnDocument.AFTER,
        )
        if not result:
            raise DomainError(404, 404001, "NOT_FOUND", "语音会话不存在")
        return self._clean(result) or {}

    def get_idempotency(self, key: str) -> dict[str, Any] | None:
        return self._clean(self.idempotency.find_one({"key": key}))

    def put_idempotency(
        self, key: str, fingerprint: str, response: dict[str, Any]
    ) -> None:
        self.idempotency.update_one(
            {"key": key},
            {
                "$setOnInsert": {
                    "key": key,
                    "fingerprint": fingerprint,
                    "response": copy.deepcopy(response),
                    "createdAt": utc_now(),
                }
            },
            upsert=True,
        )

    def get_wake_package_by_version(self, version: str) -> dict[str, Any] | None:
        return self._clean(self.wake_packages.find_one({"version": version}))

    def create_wake_package(self, data: dict[str, Any]) -> dict[str, Any]:
        value = copy.deepcopy(data)
        value["packageId"] = f"wwp_{uuid.uuid4().hex[:12]}"
        value["status"] = "registered"
        value["registeredAt"] = utc_now()
        try:
            self.wake_packages.insert_one(copy.deepcopy(value))
        except self._DuplicateKeyError as exc:
            raise DomainError(409, 409001, "CONFLICT", "同一唤醒词模型版本已存在") from exc
        return value

    def append_audit(self, data: dict[str, Any]) -> None:
        value = copy.deepcopy(data)
        value.setdefault("auditId", f"aud_{uuid.uuid4().hex[:12]}")
        value.setdefault("createdAt", utc_now())
        self.audit.insert_one(value)


def build_repository(settings: Settings) -> Repository:
    if settings.storage_backend == "mongo":
        return MongoRepository(settings)
    return InMemoryRepository(settings)

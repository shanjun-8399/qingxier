from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass
class ApiResponse:
    status: int
    body: dict[str, Any]
    headers: dict[str, str]


class ApiClientError(Exception):
    def __init__(self, response: ApiResponse):
        self.response = response
        super().__init__(f"HTTP {response.status}: {response.body.get('error')} {response.body.get('message')}")


class NetworkError(Exception):
    pass


class HttpClient:
    def __init__(self, base_url: str, *, user_token: str = "test-user-token", device_token: str = "test-device-token") -> None:
        self.base_url = base_url.rstrip("/")
        self.user_token = user_token
        self.device_token = device_token
        self.last_request: dict[str, Any] | None = None

    def request(
        self,
        method: str,
        path: str,
        *,
        body: dict[str, Any] | None = None,
        auth: str = "user",
        headers: dict[str, str] | None = None,
        raise_for_status: bool = True,
        raw_body: bytes | None = None,
    ) -> ApiResponse:
        req_headers = {"Accept": "application/json", "X-Request-Id": "test-request-id"}
        if auth == "user":
            req_headers["Authorization"] = f"Bearer {self.user_token}"
        elif auth == "device":
            req_headers["X-Device-Token"] = self.device_token
        elif auth == "admin":
            req_headers["Authorization"] = "Bearer test-admin-token"
        elif auth == "none":
            pass
        else:
            raise ValueError(f"Unknown auth mode: {auth}")
        if headers:
            req_headers.update(headers)
        data = raw_body
        if body is not None:
            data = json.dumps(body, ensure_ascii=False).encode("utf-8")
            req_headers["Content-Type"] = "application/json"
        self.last_request = {"method": method, "path": path, "body": body, "headers": dict(req_headers)}
        req = Request(self.base_url + path, data=data, headers=req_headers, method=method)
        try:
            with urlopen(req, timeout=2) as resp:
                raw = resp.read()
                parsed = json.loads(raw.decode("utf-8"))
                result = ApiResponse(resp.status, parsed, {k: v for k, v in resp.headers.items()})
        except HTTPError as exc:
            raw = exc.read()
            parsed = json.loads(raw.decode("utf-8"))
            result = ApiResponse(exc.code, parsed, {k: v for k, v in exc.headers.items()})
        except (URLError, TimeoutError, OSError) as exc:
            raise NetworkError(str(exc)) from exc
        if raise_for_status and result.status >= 400:
            raise ApiClientError(result)
        return result

from __future__ import annotations

import unittest

from .http_client import HttpClient
from .reference_server import ReferenceServer, reset_state


class ReferenceTestCase(unittest.TestCase):
    server: ReferenceServer
    api: HttpClient

    @classmethod
    def setUpClass(cls) -> None:
        reset_state()
        cls.server = ReferenceServer().start()
        cls.api = HttpClient(cls.server.base_url)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.stop()

    def create_session(self) -> str:
        resp = self.api.request(
            "POST",
            "/api/v1/speech/sessions",
            auth="device",
            body={
                "deviceId": "d_001",
                "wakeWord": "阿西",
                "wakeWordModelVersion": "wakenet9-axi-1.0.0",
                "autoDialect": True,
            },
        )
        return resp.body["data"]["sessionId"]

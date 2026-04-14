from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .config import Settings


class Storage:
    def __init__(self, settings: Settings):
        self.settings = settings

    def _issued_path(self, certificate_id: str, suffix: str) -> Path:
        return self.settings.issued_dir / f"{certificate_id}.{suffix}"

    def _public_path(self, certificate_id: str, suffix: str) -> Path:
        return self.settings.public_dir / "certificates" / f"{certificate_id}.{suffix}"

    def save_certificate(
        self,
        certificate_id: str,
        certificate_json: dict[str, Any],
        request_json: dict[str, Any],
        svg_content: str,
        pdf_bytes: bytes,
        metadata: dict[str, Any],
    ) -> None:
        self._issued_path(certificate_id, "json").write_text(
            json.dumps(certificate_json, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        self._issued_path(certificate_id, "request.json").write_text(
            json.dumps(request_json, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        self._issued_path(certificate_id, "meta.json").write_text(
            json.dumps(metadata, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        self._public_path(certificate_id, "json").write_text(
            json.dumps(certificate_json, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        self._public_path(certificate_id, "svg").write_text(svg_content, encoding="utf-8")
        self._public_path(certificate_id, "pdf").write_bytes(pdf_bytes)

    def get_certificate(self, certificate_id: str) -> dict[str, Any]:
        return json.loads(self._public_path(certificate_id, "json").read_text(encoding="utf-8"))

    def get_certificate_svg(self, certificate_id: str) -> str:
        return self._public_path(certificate_id, "svg").read_text(encoding="utf-8")

    def get_certificate_pdf(self, certificate_id: str) -> bytes:
        return self._public_path(certificate_id, "pdf").read_bytes()

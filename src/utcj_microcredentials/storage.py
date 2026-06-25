from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from .config import Settings


def _write_atomic(path: Path, content: str | bytes) -> None:
    temp_dir = path.parent
    prefix = f".tmp-{path.name}-"
    
    if isinstance(content, str):
        with tempfile.NamedTemporaryFile("w", dir=temp_dir, prefix=prefix, delete=False, encoding="utf-8") as f:
            f.write(content)
            temp_name = f.name
    else:
        with tempfile.NamedTemporaryFile("wb", dir=temp_dir, prefix=prefix, delete=False) as f:
            f.write(content)
            temp_name = f.name
            
    try:
        os.replace(temp_name, path)
    except Exception:
        if os.path.exists(temp_name):
            os.remove(temp_name)
        raise


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
        _write_atomic(self._issued_path(certificate_id, "json"), json.dumps(certificate_json, indent=2, ensure_ascii=False))
        _write_atomic(self._issued_path(certificate_id, "request.json"), json.dumps(request_json, indent=2, ensure_ascii=False))
        _write_atomic(self._issued_path(certificate_id, "meta.json"), json.dumps(metadata, indent=2, ensure_ascii=False))
        _write_atomic(self._public_path(certificate_id, "json"), json.dumps(certificate_json, indent=2, ensure_ascii=False))
        _write_atomic(self._public_path(certificate_id, "svg"), svg_content)
        _write_atomic(self._public_path(certificate_id, "pdf"), pdf_bytes)

    def get_certificate(self, certificate_id: str) -> dict[str, Any]:
        return json.loads(self._public_path(certificate_id, "json").read_text(encoding="utf-8"))

    def get_certificate_svg(self, certificate_id: str) -> str:
        return self._public_path(certificate_id, "svg").read_text(encoding="utf-8")

    def get_certificate_pdf(self, certificate_id: str) -> bytes:
        return self._public_path(certificate_id, "pdf").read_bytes()

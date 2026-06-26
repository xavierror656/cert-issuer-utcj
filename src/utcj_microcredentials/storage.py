from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from .config import Settings


def _base58_encode(raw_bytes: bytes) -> str:
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    num = int.from_bytes(raw_bytes, byteorder="big")
    result = ""
    while num > 0:
        num, remainder = divmod(num, 58)
        result = alphabet[remainder] + result
    for b in raw_bytes:
        if b == 0:
            result = alphabet[0] + result
        else:
            break
    return result


def upload_to_ipfs(settings: Settings, content: bytes, filename: str) -> str | None:
    import os
    import urllib.request
    import json
    import logging
    import hashlib
    
    pinata_api_key = os.getenv("PINATA_API_KEY")
    pinata_secret_api_key = os.getenv("PINATA_SECRET_API_KEY")
    pinata_jwt = os.getenv("PINATA_JWT")
    
    if not (pinata_api_key or pinata_jwt):
        h = hashlib.sha256(content).digest()
        multihash = b"\x12\x20" + h
        cid = _base58_encode(multihash)
        logging.getLogger(__name__).info(f"Simulating IPFS upload for {filename} -> CID: {cid}")
        return cid

    try:
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        body = []
        body.append(f"--{boundary}".encode("utf-8"))
        body.append(f'Content-Disposition: form-data; name="file"; filename="{filename}"'.encode("utf-8"))
        body.append(b"Content-Type: application/octet-stream\r\n")
        body.append(content)
        body.append(f"--{boundary}--".encode("utf-8"))
        
        payload = b"\r\n".join(body)
        
        headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(payload))
        }
        
        if pinata_jwt:
            headers["Authorization"] = f"Bearer {pinata_jwt}"
        else:
            headers["pinata_api_key"] = pinata_api_key
            headers["pinata_secret_api_key"] = pinata_secret_api_key
            
        req = urllib.request.Request(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            data=payload,
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            cid = res.get("IpfsHash")
            logging.getLogger(__name__).info(f"Successfully uploaded {filename} to IPFS via Pinata -> CID: {cid}")
            return cid
    except Exception as e:
        logging.getLogger(__name__).error(f"Error uploading to IPFS: {e}")
        h = hashlib.sha256(content).digest()
        multihash = b"\x12\x20" + h
        cid = _base58_encode(multihash)
        return cid


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
    ) -> str | None:
        _write_atomic(self._issued_path(certificate_id, "json"), json.dumps(certificate_json, indent=2, ensure_ascii=False))
        _write_atomic(self._issued_path(certificate_id, "request.json"), json.dumps(request_json, indent=2, ensure_ascii=False))
        _write_atomic(self._issued_path(certificate_id, "meta.json"), json.dumps(metadata, indent=2, ensure_ascii=False))
        _write_atomic(self._public_path(certificate_id, "json"), json.dumps(certificate_json, indent=2, ensure_ascii=False))
        _write_atomic(self._public_path(certificate_id, "svg"), svg_content)
        _write_atomic(self._public_path(certificate_id, "pdf"), pdf_bytes)
        
        json_bytes = json.dumps(certificate_json, indent=2, ensure_ascii=False).encode("utf-8")
        cid = upload_to_ipfs(self.settings, json_bytes, f"{certificate_id}.json")
        return cid

    def get_certificate(self, certificate_id: str) -> dict[str, Any]:
        return json.loads(self._public_path(certificate_id, "json").read_text(encoding="utf-8"))

    def get_certificate_svg(self, certificate_id: str) -> str:
        return self._public_path(certificate_id, "svg").read_text(encoding="utf-8")

    def get_certificate_pdf(self, certificate_id: str) -> bytes:
        return self._public_path(certificate_id, "pdf").read_bytes()

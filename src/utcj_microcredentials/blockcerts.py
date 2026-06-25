from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

import cert_issuer.config as issuer_config
from cert_issuer.issuer import Issuer

from .config import Settings
from .models import IssueRequest
from .rendering import build_display_html

import threading

logger = logging.getLogger(__name__)

issuance_lock = threading.Lock()


class IssueError(RuntimeError):
    pass


def build_unsigned_credential(request: IssueRequest, settings: Settings) -> dict[str, Any]:
    certificate_id = str(uuid.uuid4())
    issue_date = request.credential.issue_date.isoformat()
    issued_at = f"{issue_date}T00:00:00Z"
    subject_name = f"{request.recipient.given_name} {request.recipient.family_name}".strip()
    certificate_url = settings.certificate_url(certificate_id)
    visual_url = settings.certificate_visual_url(certificate_id)
    credential = {
        "@context": [
            "https://www.w3.org/ns/credentials/v2",
            {
                "certificateId": "https://microcredenciales.utcj.edu.mx/ns#certificateId",
                "givenName": "https://schema.org/givenName",
                "familyName": "https://schema.org/familyName",
                "courseName": "https://microcredenciales.utcj.edu.mx/ns#courseName",
                "hours": "https://microcredenciales.utcj.edu.mx/ns#hours",
                "skills": {
                    "@id": "https://microcredenciales.utcj.edu.mx/ns#skills",
                    "@container": "@set",
                },
                "grade": "https://microcredenciales.utcj.edu.mx/ns#grade",
                "issuerName": "https://microcredenciales.utcj.edu.mx/ns#issuerName",
                "programType": "https://microcredenciales.utcj.edu.mx/ns#programType",
                "issueDate": "https://microcredenciales.utcj.edu.mx/ns#issueDate",
                "evidenceUrl": "https://microcredenciales.utcj.edu.mx/ns#evidenceUrl",
            },
            "https://w3id.org/blockcerts/v3.2",
        ],
        "id": f"urn:uuid:{certificate_id}",
        "type": ["VerifiableCredential", "BlockcertsCredential"],
        "issuer": settings.issuer_profile_url,
        "validFrom": issued_at,
        "name": request.credential.title,
        "description": request.credential.description,
        "credentialSubject": {
            "id": f"urn:uuid:{uuid.uuid4()}",
            "certificateId": certificate_id,
            "givenName": request.recipient.given_name,
            "familyName": request.recipient.family_name,
            "name": subject_name,
            "email": request.recipient.email,
            "issueDate": issue_date,
            "courseName": request.credential.course_name,
            "hours": request.credential.hours,
            "skills": request.credential.skills,
            "grade": request.credential.grade,
            "issuerName": settings.issuer_name,
            "programType": "Microcredencial verificable",
            "evidenceUrl": str(request.credential.evidence_url) if request.credential.evidence_url else None,
        },
    }
    credential["display"] = {
        "contentMediaType": "text/html",
        "content": build_display_html(certificate_url, visual_url, credential, settings),
    }
    return credential


def issue_with_cert_issuer(unsigned_credential: dict[str, Any], chain_name: str, settings: Settings) -> tuple[dict[str, Any], str]:
    issued_list, tx_id = issue_batch_with_cert_issuer([unsigned_credential], chain_name, settings)
    return issued_list[0], tx_id


def issue_batch_with_cert_issuer(unsigned_credentials: list[dict[str, Any]], chain_name: str, settings: Settings) -> tuple[list[dict[str, Any]], str]:
    with issuance_lock:
        app_config = settings.build_cert_issuer_config(chain_name)
        issuer_config.CONFIG = app_config
        if app_config.chain.is_ethereum_type():
            from cert_issuer.blockchain_handlers import ethereum as blockchain_module
        else:
            from cert_issuer.blockchain_handlers import bitcoin as blockchain_module

        certificate_batch_handler, transaction_handler, _ = blockchain_module.instantiate_blockchain_handlers(app_config, file_mode=False)
        certificate_batch_handler.set_certificates_in_batch(unsigned_credentials)
        try:
            transaction_handler.ensure_balance()
            tx_id = Issuer(certificate_batch_handler, transaction_handler, app_config.max_retry).issue(app_config.chain)
        except Exception as exc:  # pragma: no cover - real network/runtime path
            logger.exception("Issuance failed")
            raise IssueError(str(exc)) from exc
            
        issued_certificates = []
        for i in range(len(unsigned_credentials)):
            issued_certificates.append(certificate_batch_handler.proof[i])
            
        return issued_certificates, tx_id


def issuance_metadata(chain_name: str, transaction_id: str) -> dict[str, Any]:
    return {
        "chain": chain_name,
        "transaction_id": transaction_id,
        "issued_at": datetime.now(timezone.utc).isoformat(),
    }

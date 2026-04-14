from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from . import __version__
from .blockcerts import IssueError, build_unsigned_credential, issue_with_cert_issuer, issuance_metadata
from .config import Settings
from .logging_utils import configure_logging
from .models import IssueRequest, IssueResponse
from .rendering import render_certificate_pdf, render_certificate_svg
from .storage import Storage

configure_logging()
logger = logging.getLogger(__name__)

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=False)

settings = Settings.load()
settings.ensure_directories()
storage = Storage(settings)

app = FastAPI(title=settings.app_name, version=__version__)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": __version__,
        "environment": settings.app_env,
        "chain": settings.default_chain,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/issuer-profile")
def issuer_profile() -> dict:
    return settings.issuer_profile()


@app.get("/public-keys")
def public_keys() -> dict:
    profile = settings.issuer_profile()
    return {
        "issuer": profile["id"],
        "publicKey": profile.get("publicKey", []),
        "verificationMethod": profile.get("verificationMethod", []),
        "assertionMethod": profile.get("assertionMethod", []),
    }


@app.get("/revocation-list")
def revocation_list() -> dict:
    return settings.revocation_list()


@app.post("/issue", response_model=IssueResponse)
def issue_credential(request: IssueRequest) -> IssueResponse:
    chain_name = request.chain or settings.default_chain
    unsigned_credential = build_unsigned_credential(request, settings)
    try:
        issued_certificate, transaction_id = issue_with_cert_issuer(unsigned_credential, chain_name, settings)
    except IssueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    certificate_id = issued_certificate["credentialSubject"]["certificateId"]
    svg = render_certificate_svg(issued_certificate, settings, transaction_id)
    pdf = render_certificate_pdf(issued_certificate, settings, transaction_id)
    metadata = issuance_metadata(chain_name, transaction_id)
    storage.save_certificate(certificate_id, issued_certificate, request.model_dump(mode="json"), svg, pdf, metadata)
    logger.info("Certificate issued: %s", certificate_id)
    return IssueResponse(
        status="issued",
        id=certificate_id,
        chain=chain_name,
        transaction_id=transaction_id,
        certificate_url=settings.certificate_url(certificate_id),
        visual_svg_url=settings.certificate_visual_url(certificate_id),
        pdf_url=settings.certificate_pdf_url(certificate_id),
        issuer_profile_url=settings.issuer_profile_url,
        issued_json=issued_certificate,
    )


@app.get("/certificate/{certificate_id}")
def get_certificate(certificate_id: str) -> JSONResponse:
    try:
        data = storage.get_certificate(certificate_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Certificate not found") from exc
    return JSONResponse(data)


@app.get("/certificate/{certificate_id}/visual.svg")
def get_certificate_svg(certificate_id: str) -> Response:
    try:
        content = storage.get_certificate_svg(certificate_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Certificate visual not found") from exc
    return Response(content=content, media_type="image/svg+xml")


@app.get("/certificate/{certificate_id}/pdf")
def get_certificate_pdf(certificate_id: str) -> Response:
    try:
        content = storage.get_certificate_pdf(certificate_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Certificate PDF not found") from exc
    return Response(content=content, media_type="application/pdf")

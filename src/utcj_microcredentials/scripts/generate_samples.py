from __future__ import annotations

import json
from pathlib import Path

from utcj_microcredentials.blockcerts import build_unsigned_credential, issue_with_cert_issuer
from utcj_microcredentials.branding import BADGES, badge_svg
from utcj_microcredentials.config import Settings
from utcj_microcredentials.models import IssueRequest
from utcj_microcredentials.rendering import render_certificate_pdf, render_certificate_svg
from utcj_microcredentials.storage import Storage


def save_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def sample_requests() -> list[tuple[str, dict]]:
    return [
        (
            "issue-request.json",
            {
                "recipient": {
                    "given_name": "Javier Alejandro",
                    "family_name": "Flores Flores",
                    "email": "javier.alejandro.flores@ejemplo.utcj.mx",
                },
                "credential": {
                    "title": "Microcredencial en Inteligencia Artificial Aplicada a Manufactura Inteligente",
                    "description": "Acredita competencias en aprendizaje automatico, analitica industrial, mantenimiento predictivo y despliegue de soluciones de IA para entornos de manufactura inteligente.",
                    "issue_date": "2026-04-15",
                    "course_name": "Diplomado de IA Aplicada a Manufactura Inteligente",
                    "hours": 40,
                    "skills": [
                        "Machine Learning industrial",
                        "Mantenimiento predictivo",
                        "Python para analitica",
                        "Modelado de datos",
                        "Automatizacion inteligente",
                    ],
                    "grade": "Acreditado",
                    "evidence_url": "https://example.org/evidence/ia-manufactura",
                },
                "issuer": {
                    "name": "Universidad Tecnologica de Ciudad Juarez",
                    "id": "utcj",
                },
                "chain": "mockchain",
            },
        ),
        (
            "issue-request-vision.json",
            {
                "recipient": {
                    "given_name": "Sofia Fernanda",
                    "family_name": "Ramirez Ortega",
                    "email": "sofia.ramirez@ejemplo.utcj.mx",
                },
                "credential": {
                    "title": "Microcredencial en Vision por Computadora Industrial",
                    "description": "Acredita competencias en deteccion de objetos, inspeccion visual automatizada, entrenamiento de modelos YOLO y despliegue edge AI en lineas de produccion.",
                    "issue_date": "2026-04-20",
                    "course_name": "Diplomado de IA Aplicada a Manufactura Inteligente",
                    "hours": 40,
                    "skills": [
                        "Computer Vision",
                        "YOLO",
                        "Deep Learning",
                        "Edge AI",
                        "Inspeccion industrial automatizada",
                    ],
                    "grade": "Acreditado",
                    "evidence_url": "https://example.org/evidence/vision-industrial",
                },
                "issuer": {
                    "name": "Universidad Tecnologica de Ciudad Juarez",
                    "id": "utcj",
                },
                "chain": "mockchain",
            },
        ),
    ]


def main() -> None:
    settings = Settings.load()
    settings.ensure_directories()
    storage = Storage(settings)
    examples_dir = Path(__file__).resolve().parents[3] / "examples"
    branding_dir = Path(__file__).resolve().parents[3] / "assets" / "branding"
    certificates_dir = Path(__file__).resolve().parents[3] / "assets" / "certificates"
    examples_dir.mkdir(parents=True, exist_ok=True)
    branding_dir.mkdir(parents=True, exist_ok=True)
    certificates_dir.mkdir(parents=True, exist_ok=True)

    for name, payload in sample_requests():
        save_json(examples_dir / name, payload)
        request = IssueRequest.model_validate(payload)
        unsigned = build_unsigned_credential(request, settings)
        issued, tx_id = issue_with_cert_issuer(unsigned, request.chain or settings.default_chain, settings)
        certificate_id = issued["credentialSubject"]["certificateId"]
        svg = render_certificate_svg(issued, settings, tx_id)
        pdf = render_certificate_pdf(issued, settings, tx_id, chain=request.chain or settings.default_chain)
        storage.save_certificate(certificate_id, issued, payload, svg, pdf, {"chain": request.chain, "transaction_id": tx_id})
        suffix = "vision" if "vision" in name else "ai-manufactura"
        save_json(examples_dir / f"issued-certificate-{suffix}.json", issued)
        (certificates_dir / f"utcj-{suffix}.svg").write_text(svg, encoding="utf-8")
        (certificates_dir / f"utcj-{suffix}.pdf").write_bytes(pdf)

    for badge_name, (label, color) in BADGES.items():
        (branding_dir / f"badge-{badge_name}.svg").write_text(badge_svg(label, color), encoding="utf-8")


if __name__ == "__main__":
    main()

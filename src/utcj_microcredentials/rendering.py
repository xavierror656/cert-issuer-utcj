from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Any

import qrcode
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from .branding import PALETTE
from .config import Settings


def _qr_data_uri(value: str) -> str:
    qr = qrcode.QRCode(box_size=5, border=1)
    qr.add_data(value)
    qr.make(fit=True)
    image = qr.make_image(fill_color=PALETTE["graphite"], back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_display_html(certificate_url: str, visual_url: str, payload: dict[str, Any]) -> str:
    recipient = payload["credentialSubject"]["name"]
    title = payload["name"]
    course = payload["credentialSubject"]["courseName"]
    skills = "".join(
        f'<span style="display:inline-block;padding:6px 10px;margin:4px;border-radius:999px;background:#E8F1EE;color:#0F6A52;font:600 12px Arial,sans-serif;">{skill}</span>'
        for skill in payload["credentialSubject"]["skills"]
    )
    return f"""<div style=\"max-width:900px;margin:0 auto;padding:28px;border-radius:24px;background:linear-gradient(135deg,#F7FBFA,#E8F1EE);border:1px solid #d7e6e1;color:#1F2937;font-family:Georgia,serif;\">
  <div style=\"font:700 13px Arial,sans-serif;letter-spacing:0.18em;text-transform:uppercase;color:#0F6A52;\">UTCJ | Microcredenciales verificables</div>
  <h1 style=\"margin:14px 0 6px;font-size:34px;line-height:1.1;color:#0F3E4A;\">{title}</h1>
  <div style=\"font-size:24px;color:#1F2937;margin-bottom:14px;\">{recipient}</div>
  <p style=\"font:16px/1.5 Arial,sans-serif;margin:0 0 16px;\">Emision institucional UTCJ para <strong>{course}</strong>.</p>
  <div>{skills}</div>
  <p style=\"font:14px/1.5 Arial,sans-serif;margin-top:18px;\">Artefacto principal verificable: JSON Blockcerts. Representacion visual: <a href=\"{visual_url}\">SVG institucional</a>. Descarga: <a href=\"{certificate_url}\">JSON emitido</a>.</p>
</div>"""


def render_certificate_svg(certificate: dict[str, Any], settings: Settings, transaction_id: str) -> str:
    subject = certificate["credentialSubject"]
    qr_uri = _qr_data_uri(settings.certificate_url(subject["certificateId"]))
    skills = "\n".join(
        f'<tspan x="72" dy="28">- {skill}</tspan>' for skill in subject["skills"][:6]
    )
    logo_href = ""
    if settings.issuer_logo_path.exists():
        logo_bytes = settings.issuer_logo_path.read_bytes()
        logo_href = f"data:image/png;base64,{base64.b64encode(logo_bytes).decode('ascii')}"
    return f"""<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1600\" height=\"900\" viewBox=\"0 0 1600 900\" fill=\"none\">
  <defs>
    <linearGradient id=\"bg\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"1\">
      <stop offset=\"0%\" stop-color=\"#F7FBFA\"/>
      <stop offset=\"100%\" stop-color=\"#E2ECE8\"/>
    </linearGradient>
    <linearGradient id=\"line\" x1=\"0\" x2=\"1\" y1=\"0\" y2=\"0\">
      <stop offset=\"0%\" stop-color=\"#0F6A52\"/>
      <stop offset=\"100%\" stop-color=\"#0F3E4A\"/>
    </linearGradient>
  </defs>
  <rect width=\"1600\" height=\"900\" rx=\"40\" fill=\"url(#bg)\"/>
  <rect x=\"40\" y=\"40\" width=\"1520\" height=\"820\" rx=\"34\" fill=\"#FFFFFF\" stroke=\"#D6E3DE\" stroke-width=\"4\"/>
  <path d=\"M56 146h1488\" stroke=\"url(#line)\" stroke-width=\"10\" stroke-linecap=\"round\"/>
  <circle cx=\"1400\" cy=\"130\" r=\"66\" fill=\"#0F6A52\" fill-opacity=\"0.08\"/>
  <circle cx=\"1480\" cy=\"210\" r=\"34\" fill=\"#B88A3B\" fill-opacity=\"0.15\"/>
  <text x=\"72\" y=\"104\" fill=\"#0F6A52\" font-family=\"Roboto Slab, Georgia, serif\" font-size=\"26\" font-weight=\"700\" letter-spacing=\"4\">MICROCREDENCIALES VERIFICABLES UTCJ</text>
  <text x=\"72\" y=\"208\" fill=\"#0F3E4A\" font-family=\"Roboto Slab, Georgia, serif\" font-size=\"56\" font-weight=\"700\">{certificate['name']}</text>
  <text x=\"72\" y=\"266\" fill=\"#6B7280\" font-family=\"Arial, sans-serif\" font-size=\"24\">Credencial academica verificable emitida por {settings.issuer_name}</text>
  <text x=\"72\" y=\"362\" fill=\"#111827\" font-family=\"Georgia, serif\" font-size=\"24\">Reconoce a</text>
  <text x=\"72\" y=\"428\" fill=\"#1F2937\" font-family=\"Georgia, serif\" font-size=\"46\" font-weight=\"700\">{subject['name']}</text>
  <foreignObject x=\"72\" y=\"460\" width=\"940\" height=\"120\"><div xmlns=\"http://www.w3.org/1999/xhtml\" style=\"font:18px Arial,sans-serif;color:#374151;line-height:1.55;\">{certificate['description']}</div></foreignObject>
  <rect x=\"68\" y=\"620\" width=\"560\" height=\"176\" rx=\"24\" fill=\"#F8FBFA\" stroke=\"#D9E6E1\"/>
  <text x=\"92\" y=\"668\" fill=\"#0F6A52\" font-family=\"Arial, sans-serif\" font-size=\"18\" font-weight=\"700\" letter-spacing=\"2\">COMPETENCIAS ACREDITADAS</text>
  <text x=\"72\" y=\"696\" fill=\"#1F2937\" font-family=\"Arial, sans-serif\" font-size=\"24\">{skills}</text>
  <rect x=\"1080\" y=\"216\" width=\"400\" height=\"310\" rx=\"30\" fill=\"#0F3E4A\"/>
  <text x=\"1112\" y=\"270\" fill=\"#E8F1EE\" font-family=\"Arial, sans-serif\" font-size=\"18\" font-weight=\"700\" letter-spacing=\"2\">TRAZABILIDAD CRIPTOGRAFICA</text>
  <text x=\"1112\" y=\"334\" fill=\"#FFFFFF\" font-family=\"Arial, sans-serif\" font-size=\"24\">ID: {subject['certificateId']}</text>
  <text x=\"1112\" y=\"380\" fill=\"#FFFFFF\" font-family=\"Arial, sans-serif\" font-size=\"22\">Fecha: {subject['issueDate']}</text>
  <text x=\"1112\" y=\"426\" fill=\"#FFFFFF\" font-family=\"Arial, sans-serif\" font-size=\"22\">Horas: {subject['hours']}</text>
  <text x=\"1112\" y=\"472\" fill=\"#FFFFFF\" font-family=\"Arial, sans-serif\" font-size=\"18\">Anclaje: {transaction_id[:28]}...</text>
  <rect x=\"1080\" y=\"560\" width=\"180\" height=\"180\" rx=\"24\" fill=\"white\"/>
  <image href=\"{qr_uri}\" x=\"1100\" y=\"580\" width=\"140\" height=\"140\"/>
  <text x=\"1290\" y=\"612\" fill=\"#0F3E4A\" font-family=\"Arial, sans-serif\" font-size=\"20\" font-weight=\"700\">Validez verificable</text>
  <text x=\"1290\" y=\"646\" fill=\"#374151\" font-family=\"Arial, sans-serif\" font-size=\"18\">Escanea para descargar</text>
  <text x=\"1290\" y=\"674\" fill=\"#374151\" font-family=\"Arial, sans-serif\" font-size=\"18\">el JSON Blockcerts.</text>
  <text x=\"1290\" y=\"730\" fill=\"#B88A3B\" font-family=\"Arial, sans-serif\" font-size=\"16\" font-weight=\"700\">Prueba de autenticidad y no alteracion</text>
  <text x=\"72\" y=\"836\" fill=\"#6B7280\" font-family=\"Arial, sans-serif\" font-size=\"18\">Emision institucional • Portabilidad profesional del logro academico • Validacion por terceros</text>
  {f'<image href="{logo_href}" x="1240" y="72" width="220" height="80" preserveAspectRatio="xMidYMid meet"/>' if logo_href else ''}
</svg>"""


def render_certificate_pdf(certificate: dict[str, Any], settings: Settings, transaction_id: str) -> bytes:
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)
    c.setFillColor(HexColor(PALETTE["mist"]))
    c.rect(0, 0, width, height, stroke=0, fill=1)
    c.setFillColor(HexColor(PALETTE["white"]))
    c.roundRect(24, 24, width - 48, height - 48, 24, stroke=0, fill=1)
    c.setStrokeColor(HexColor(PALETTE["green"]))
    c.setLineWidth(5)
    c.line(36, height - 60, width - 36, height - 60)
    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(HexColor(PALETTE["green"]))
    c.drawString(48, height - 42, "UTCJ | MICROCREDENCIALES VERIFICABLES")

    if settings.issuer_logo_path.exists():
        c.drawImage(ImageReader(str(settings.issuer_logo_path)), width - 190, height - 82, width=130, height=44, mask="auto")

    subject = certificate["credentialSubject"]
    c.setFillColor(HexColor(PALETTE["teal"]))
    c.setFont("Helvetica-Bold", 24)
    c.drawString(48, height - 110, certificate["name"][:80])
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(48, height - 155, subject["name"])
    c.setFont("Helvetica", 13)
    text = c.beginText(48, height - 185)
    text.setLeading(18)
    for line in _wrap_text(certificate["description"], 92):
        text.textLine(line)
    c.drawText(text)

    c.setFont("Helvetica-Bold", 12)
    c.setFillColor(HexColor(PALETTE["green"]))
    c.drawString(48, 220, "COMPETENCIAS")
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.setFont("Helvetica", 12)
    y = 200
    for skill in subject["skills"][:6]:
        c.drawString(56, y, f"- {skill}")
        y -= 18

    c.setFillColor(HexColor(PALETTE["teal"]))
    c.roundRect(width - 250, 150, 180, 180, 18, stroke=0, fill=1)
    qr = qrcode.make(settings.certificate_url(subject["certificateId"]))
    qr_buffer = io.BytesIO()
    qr.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    c.drawImage(ImageReader(qr_buffer), width - 225, 175, width=130, height=130, mask="auto")

    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.drawString(48, 110, f"ID: {subject['certificateId']}")
    c.drawString(48, 92, f"Fecha de emision: {subject['issueDate']}")
    c.drawString(48, 74, f"Horas: {subject['hours']}")
    c.drawString(48, 56, f"Blockchain anchor: {transaction_id}")
    c.drawString(48, 38, "Artefacto principal verificable: JSON Blockcerts compatible con validacion por terceros.")
    c.showPage()
    c.save()
    return buffer.getvalue()


def _wrap_text(text: str, limit: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= limit:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

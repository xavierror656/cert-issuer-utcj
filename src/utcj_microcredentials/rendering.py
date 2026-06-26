from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Any

import qrcode
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

from .branding import PALETTE, get_palette
from .config import Settings


def _qr_data_uri(value: str, fill_color: str = "#1F2937") -> str:
    qr = qrcode.QRCode(box_size=5, border=1)
    qr.add_data(value)
    qr.make(fit=True)
    image = qr.make_image(fill_color=fill_color, back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def build_display_html(certificate_url: str, visual_url: str, payload: dict[str, Any], settings: Settings | None = None) -> str:
    palette = get_palette(settings)
    recipient = payload["credentialSubject"]["name"]
    title = payload["name"]
    course = payload["credentialSubject"]["courseName"]
    skills = "".join(
        f'<span style="display:inline-block;padding:6px 10px;margin:4px;border-radius:999px;background:{palette["mist"]};color:{palette["green"]};font:600 12px Arial,sans-serif;">{skill}</span>'
        for skill in payload["credentialSubject"]["skills"]
    )
    return f"""<div style=\"max-width:900px;margin:0 auto;padding:28px;border-radius:24px;background:linear-gradient(135deg,{palette["white"]},{palette["mist"]});border:1px solid {palette["silver"]};color:{palette["graphite"]};font-family:Georgia,serif;\">
  <div style=\"font:700 13px Arial,sans-serif;letter-spacing:0.18em;text-transform:uppercase;color:{palette["green"]};\">UTCJ | Microcredenciales verificables</div>
  <h1 style=\"margin:14px 0 6px;font-size:34px;line-height:1.1;color:{palette["teal"]};\">{title}</h1>
  <div style=\"font-size:24px;color:{palette["graphite"]};margin-bottom:14px;\">{recipient}</div>
  <p style=\"font:16px/1.5 Arial,sans-serif;margin:0 0 16px;\">Emision institucional UTCJ para <strong>{course}</strong>.</p>
  <div>{skills}</div>
  <p style=\"font:14px/1.5 Arial,sans-serif;margin-top:18px;\">Artefacto principal verificable: JSON Blockcerts. Representacion visual: <a href=\"{visual_url}\">SVG institucional</a>. Descarga: <a href=\"{certificate_url}\">JSON emitido</a>.</p>
</div>"""


def render_certificate_svg(certificate: dict[str, Any], settings: Settings, transaction_id: str, palette: dict[str, str] | None = None) -> str:
    if palette is None:
        palette = get_palette(settings)
    subject = certificate["credentialSubject"]
    qr_uri = _qr_data_uri(settings.certificate_render_url(subject["certificateId"]), fill_color=palette["graphite"])
    
    # Dynamic sizing and pure SVG wrapping for course title
    title_lines = _wrap_text(certificate['name'], 38)
    if len(certificate['name']) > 60:
        title_font_size = 28
        dy_offset = 34
    elif len(certificate['name']) > 40:
        title_font_size = 36
        dy_offset = 42
    else:
        title_font_size = 48
        dy_offset = 54

    title_tspans = []
    if len(title_lines) == 1:
        title_tspans.append(f'<tspan x="72" y="208">{title_lines[0]}</tspan>')
    else:
        title_tspans.append(f'<tspan x="72" y="190">{title_lines[0]}</tspan>')
        for line in title_lines[1:2]: # limit to 2 lines
            title_tspans.append(f'<tspan x="72" dy="{dy_offset}">{line}</tspan>')
    title_svg_text = "\n  ".join(title_tspans)

    # Dynamic sizing for recipient name in SVG
    recipient_name = subject['name']
    if len(recipient_name) > 40:
        recipient_font_size = 28
    elif len(recipient_name) > 30:
        recipient_font_size = 34
    elif len(recipient_name) > 20:
        recipient_font_size = 40
    else:
        recipient_font_size = 46

    # Dynamic pure SVG wrapping for description
    desc_lines = _wrap_text(certificate['description'], 75)
    desc_tspans = []
    if len(desc_lines) == 1:
        desc_tspans.append(f'<tspan x="72" y="490">{desc_lines[0]}</tspan>')
    elif len(desc_lines) == 2:
        desc_tspans.append(f'<tspan x="72" y="480">{desc_lines[0]}</tspan>')
        desc_tspans.append(f'<tspan x="72" dy="26">{desc_lines[1]}</tspan>')
    elif len(desc_lines) == 3:
        desc_tspans.append(f'<tspan x="72" y="470">{desc_lines[0]}</tspan>')
        for line in desc_lines[1:3]:
            desc_tspans.append(f'<tspan x="72" dy="26">{line}</tspan>')
    else:
        desc_tspans.append(f'<tspan x="72" y="460">{desc_lines[0]}</tspan>')
        for line in desc_lines[1:4]:
            desc_tspans.append(f'<tspan x="72" dy="26">{line}</tspan>')
    desc_svg_text = "\n  ".join(desc_tspans)

    # Clean and restrict skills to prevent overflow in SVG box
    cleaned_skills = []
    for skill in subject["skills"][:6]:
        if len(skill) > 35:
            cleaned_skills.append(skill[:32] + "...")
        else:
            cleaned_skills.append(skill)
    skills = "\n".join(
        f'<tspan x="92" dy="18">- {skill}</tspan>' for skill in cleaned_skills
    )

    logo_href = ""
    if settings.issuer_logo_path.exists():
        logo_bytes = settings.issuer_logo_path.read_bytes()
        logo_href = f"data:image/png;base64,{base64.b64encode(logo_bytes).decode('ascii')}"

    sig_href = ""
    for ext in ("png", "jpg", "jpeg"):
        p = settings.data_dir / f"rector_signature.{ext}"
        if p.exists():
            sig_bytes = p.read_bytes()
            sig_href = f"data:image/{ext};base64,{base64.b64encode(sig_bytes).decode('ascii')}"
            break

    seal_href = ""
    for ext in ("png", "jpg", "jpeg"):
        p = settings.data_dir / f"rector_seal.{ext}"
        if p.exists():
            seal_bytes = p.read_bytes()
            seal_href = f"data:image/{ext};base64,{base64.b64encode(seal_bytes).decode('ascii')}"
            break

    # We position signatures and seal in the bottom-middle area: x from 660 to 1070
    rector_sig_section = (
        f'<image href="{sig_href}" x="670" y="650" width="140" height="50" preserveAspectRatio="xMidYMid meet"/>'
        if sig_href else
        f'<text x="740" y="690" fill="#3B82F6" font-family="Georgia, serif" font-size="20" font-style="italic" text-anchor="middle">Dr. Ó. Fidencio I. H.</text>'
    )

    seal_section = (
        f'<image href="{seal_href}" x="830" y="640" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>'
        if seal_href else
        f'<circle cx="865" cy="675" r="35" fill="none" stroke="{palette["gold"]}" stroke-width="2"/>'
        f'<circle cx="865" cy="675" r="31" fill="none" stroke="{palette["gold"]}" stroke-width="1"/>'
        f'<text x="865" y="677" fill="{palette["gold"]}" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle">UTCJ</text>'
        f'<text x="865" y="691" fill="{palette["gold"]}" font-family="Arial, sans-serif" font-size="8" font-weight="700" text-anchor="middle">OFICIAL</text>'
    )

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="{palette["white"]}"/>
      <stop offset="100%" stop-color="{palette["mist"]}"/>
    </linearGradient>
    <linearGradient id="line" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="{palette["green"]}"/>
      <stop offset="100%" stop-color="{palette["teal"]}"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" rx="40" fill="url(#bg)"/>
  <rect x="40" y="40" width="1520" height="820" rx="34" fill="#FFFFFF" stroke="{palette["silver"]}" stroke-width="4"/>
  <path d="M56 146h1488" stroke="url(#line)" stroke-width="10" stroke-linecap="round"/>
  <circle cx="1400" cy="130" r="66" fill="{palette["green"]}" fill-opacity="0.08"/>
  <circle cx="1480" cy="210" r="34" fill="{palette["gold"]}" fill-opacity="0.15"/>
  <text x="72" y="104" fill="{palette["green"]}" font-family="Roboto Slab, Georgia, serif" font-size="26" font-weight="700" letter-spacing="4">MICROCREDENCIALES VERIFICABLES UTCJ</text>
  <text fill="{palette["teal"]}" font-family="Roboto Slab, Georgia, serif" font-size="{title_font_size}" font-weight="700">
    {title_svg_text}
  </text>
  <text x="72" y="266" fill="{palette["silver"]}" font-family="Arial, sans-serif" font-size="24">Credencial academica verificable emitida por {settings.issuer_name}</text>
  <text x="72" y="362" fill="{palette["graphite"]}" font-family="Georgia, serif" font-size="24">Reconoce a</text>
  <text x="72" y="428" fill="{palette["graphite"]}" font-family="Georgia, serif" font-size="{recipient_font_size}" font-weight="700">{recipient_name}</text>
  <text fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="18">
    {desc_svg_text}
  </text>
  <rect x="68" y="620" width="560" height="176" rx="24" fill="{palette["white"]}" stroke="{palette["silver"]}"/>
  <text x="92" y="668" fill="{palette["green"]}" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">COMPETENCIAS ACREDITADAS</text>
  <text x="92" y="675" fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="14">{skills}</text>

  <!-- Firmas y Sello -->
  <line x1="660" y1="710" x2="820" y2="710" stroke="{palette["silver"]}" stroke-width="2"/>
  {rector_sig_section}
  <text x="740" y="738" fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Dr. Óscar F. Ibáñez Hernández</text>
  <text x="740" y="762" fill="{palette["silver"]}" font-family="Arial, sans-serif" font-size="13" text-anchor="middle">Rector de la UTCJ</text>

  {seal_section}

  <line x1="910" y1="710" x2="1070" y2="710" stroke="{palette["silver"]}" stroke-width="2"/>
  <text x="990" y="690" fill="{palette["teal"]}" font-family="Georgia, serif" font-size="20" font-style="italic" text-anchor="middle">Firma Digital</text>
  <text x="990" y="738" fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Firma Criptográfica</text>
  <text x="990" y="762" fill="{palette["silver"]}" font-family="Arial, sans-serif" font-size="13" text-anchor="middle">Validación Blockchain</text>

  <rect x="1080" y="216" width="400" height="310" rx="30" fill="{palette["teal"]}"/>
  <text x="1112" y="270" fill="{palette["mist"]}" font-family="Arial, sans-serif" font-size="18" font-weight="700" letter-spacing="2">TRAZABILIDAD CRIPTOGRAFICA</text>
  <text x="1112" y="334" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="24">ID: {subject['certificateId']}</text>
  <text x="1112" y="380" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="22">Fecha: {subject['issueDate']}</text>
  <text x="1112" y="426" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="22">Horas: {subject['hours']}</text>
  <text x="1112" y="472" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="18">Anclaje: {transaction_id[:28]}...</text>
  <rect x="1080" y="560" width="180" height="180" rx="24" fill="white"/>
  <image href="{qr_uri}" x="1100" y="580" width="140" height="140"/>
  <text x="1290" y="612" fill="{palette["teal"]}" font-family="Arial, sans-serif" font-size="20" font-weight="700">Validez verificable</text>
  <text x="1290" y="646" fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="18">Escanea para descargar</text>
  <text x="1290" y="674" fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="18">el JSON Blockcerts.</text>
  <text x="1290" y="730" fill="{palette["gold"]}" font-family="Arial, sans-serif" font-size="16" font-weight="700">Prueba de autenticidad y no alteracion</text>
  <text x="72" y="836" fill="{palette["silver"]}" font-family="Arial, sans-serif" font-size="18">Emision institucional • Portabilidad profesional del logro academico • Validacion por terceros</text>
  {f'<image href="{logo_href}" x="1240" y="72" width="220" height="80" preserveAspectRatio="xMidYMid meet"/>' if logo_href else ''}
</svg>"""


def render_certificate_pdf(certificate: dict[str, Any], settings: Settings, transaction_id: str, chain: str | None = None, palette: dict[str, str] | None = None) -> bytes:
    if chain is None:
        chain = settings.default_chain
    if palette is None:
        PALETTE = get_palette(settings)
    else:
        PALETTE = palette
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # 1. Background Fill
    c.setFillColor(HexColor("#F8FAF9"))
    c.rect(0, 0, width, height, stroke=0, fill=1)

    # 2. Outer Border Frame
    c.setStrokeColor(HexColor(PALETTE["gold"]))
    c.setLineWidth(2)
    c.roundRect(24, 24, width - 48, height - 48, 16, fill=0, stroke=1)
    
    c.setStrokeColor(HexColor(PALETTE["green"]))
    c.setLineWidth(1)
    c.roundRect(30, 30, width - 60, height - 60, 12, fill=0, stroke=1)

    # 3. Corner Decorations (Gold Brackets)
    c.setStrokeColor(HexColor(PALETTE["gold"]))
    c.setLineWidth(2.5)
    # Top-Left Corner
    c.line(36, height - 36, 56, height - 36)
    c.line(36, height - 36, 36, height - 56)
    # Top-Right Corner
    c.line(width - 36, height - 36, width - 56, height - 36)
    c.line(width - 36, height - 36, width - 36, height - 56)
    # Bottom-Left Corner
    c.line(36, 36, 56, 36)
    c.line(36, 36, 36, 56)
    # Bottom-Right Corner
    c.line(width - 36, 36, width - 56, 36)
    c.line(width - 36, 36, width - 36, 56)

    # 4. Header Branding
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(HexColor(PALETTE["green"]))
    c.drawCentredString(width / 2, height - 76, "UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ")
    
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(HexColor(PALETTE["gold"]))
    c.drawCentredString(width / 2, height - 92, "MICROCREDENCIAL VERIFICABLE")

    if settings.issuer_logo_path.exists():
        c.drawImage(ImageReader(str(settings.issuer_logo_path)), (width / 2) - 60, height - 150, width=120, height=44, mask="auto")

    subject = certificate["credentialSubject"]
    
    # 5. Diploma Wording
    c.setFont("Helvetica-Oblique", 13)
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.drawCentredString(width / 2, height - 180, "Otorga la presente credencial de competencias a:")

    # 6. Recipient Name with dynamic scaling
    recipient_name = subject["name"]
    if len(recipient_name) > 40:
        recipient_font_size = 18
    elif len(recipient_name) > 30:
        recipient_font_size = 22
    else:
        recipient_font_size = 26
    c.setFont("Helvetica-Bold", recipient_font_size)
    c.setFillColor(HexColor(PALETTE["teal"]))
    c.drawCentredString(width / 2, height - 215, recipient_name)

    c.setFont("Helvetica-Oblique", 11)
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.drawCentredString(width / 2, height - 240, "Por haber acreditado satisfactoriamente los conocimientos del programa académico:")

    # 7. Credential Title (Wrapped, Centered and Dynamic Font Size)
    title_style = ParagraphStyle(
        name="CertTitleStyle",
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=HexColor(PALETTE["green_deep"]),
        alignment=1 # Centered
    )
    title_name = certificate["name"]
    if len(title_name) > 60:
        title_style.fontSize = 11
        title_style.leading = 14
    elif len(title_name) > 40:
        title_style.fontSize = 13
        title_style.leading = 16

    title_p = Paragraph(title_name, title_style)
    title_w = width - 200
    _, title_h = title_p.wrap(title_w, height)
    title_y = height - 250 - title_h
    title_p.drawOn(c, 100, title_y)

    # 8. Description (Wrapped and Centered dynamically relative to title)
    desc_style = ParagraphStyle(
        name="CertDescStyle",
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=HexColor(PALETTE["graphite"]),
        alignment=1 # Centered
    )
    desc_p = Paragraph(certificate["description"], desc_style)
    desc_w = width - 240
    _, desc_h = desc_p.wrap(desc_w, height)
    desc_y = title_y - 15 - desc_h
    desc_p.drawOn(c, 120, desc_y)

    # 9. Competencies / Habilidades Acreditadas
    skills_y = desc_y - 22
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(HexColor(PALETTE["gold"]))
    c.drawCentredString(width / 2, skills_y, "COMPETENCIAS ACREDITADAS")
    
    # Clean skills to prevent line overflow in PDF
    cleaned_skills = []
    for s in subject["skills"][:6]:
        if len(s) > 30:
            cleaned_skills.append(s[:27] + "...")
        else:
            cleaned_skills.append(s)
    skills_str = "   •   ".join(cleaned_skills)
    c.setFont("Helvetica", 9.5)
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.drawCentredString(width / 2, skills_y - 16, skills_str)

    # 10. Signatures and Seal
    sig_y = 110
    # Left Signature: Rector
    rector_sig_file = None
    for ext in ("png", "jpg", "jpeg"):
        p = settings.data_dir / f"rector_signature.{ext}"
        if p.exists():
            rector_sig_file = p
            break

    if rector_sig_file:
        c.drawImage(ImageReader(str(rector_sig_file)), 140, sig_y + 2, width=120, height=35, mask="auto")
    else:
        c.setFont("Helvetica-Oblique", 14)
        c.setFillColor(HexColor("#3B82F6"))
        c.drawCentredString(200, sig_y + 15, "Dr. Ó. Fidencio I. H.")

    c.setStrokeColor(HexColor(PALETTE["silver"]))
    c.setLineWidth(1)
    c.line(120, sig_y + 8, 280, sig_y + 8)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.drawCentredString(200, sig_y - 4, "Dr. Óscar F. Ibáñez Hernández")
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor(PALETTE["silver"]))
    c.drawCentredString(200, sig_y - 15, "Rector de la UTCJ")

    # Center Gold Seal
    seal_x = width / 2
    rector_seal_file = None
    for ext in ("png", "jpg", "jpeg"):
        p = settings.data_dir / f"rector_seal.{ext}"
        if p.exists():
            rector_seal_file = p
            break

    if rector_seal_file:
        c.drawImage(ImageReader(str(rector_seal_file)), seal_x - 28, sig_y - 28, width=56, height=56, mask="auto")
    else:
        c.setStrokeColor(HexColor(PALETTE["gold"]))
        c.setLineWidth(1.5)
        c.circle(seal_x, sig_y, 28, fill=0, stroke=1)
        c.circle(seal_x, sig_y, 25, fill=0, stroke=1)
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(HexColor(PALETTE["gold"]))
        c.drawCentredString(seal_x, sig_y + 2, "UTCJ")
        c.drawCentredString(seal_x, sig_y - 8, "OFICIAL")

    # Right Signature: Criptográfica
    c.setFont("Helvetica-Oblique", 12)
    c.setFillColor(HexColor(PALETTE["teal"]))
    c.drawCentredString(width - 200, sig_y + 15, "Firma Digital")
    c.line(width - 280, sig_y + 8, width - 120, sig_y + 8)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.drawCentredString(width - 200, sig_y - 4, "Firma Criptográfica")
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor(PALETTE["silver"]))
    c.drawCentredString(width - 200, sig_y - 15, "Validación Blockchain")

    # 11. QR Code and Technical Metadata Block
    qr = qrcode.make(settings.certificate_render_url(subject["certificateId"]))
    qr_buffer = io.BytesIO()
    qr.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    c.drawImage(ImageReader(qr_buffer), 56, 40, width=54, height=54, mask="auto")

    c.setFont("Helvetica", 7.5)
    c.setFillColor(HexColor(PALETTE["silver"]))
    c.drawString(120, 75, f"ID Credencial: {subject['certificateId']}")
    c.drawString(120, 65, f"Fecha Emisión: {subject['issueDate']}   |   Duración: {subject['hours']} horas   |   Calificación: {subject['grade']}")
    c.drawString(120, 55, f"Anclaje Criptográfico ({chain}): {transaction_id}")
    c.drawString(120, 45, "Este documento PDF es una representación visual. El artefacto principal verificable es el JSON Blockcerts.")

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

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

    # MEJORA 3: Competencias en píldoras (Pill Badges)
    cleaned_skills = []
    for skill in subject["skills"][:4]:
        if len(skill) > 26:
            cleaned_skills.append(skill[:23] + "...")
        else:
            cleaned_skills.append(skill)
    
    skill_badges = []
    curr_x = 92
    curr_y = 675
    for skill in cleaned_skills:
        w = max(110, len(skill) * 9 + 26)
        if curr_x + w > 610:
            curr_x = 92
            curr_y += 38
        skill_badges.append(
            f'<rect x="{curr_x}" y="{curr_y}" width="{w}" height="30" rx="15" fill="{palette["mist"]}" stroke="{palette["green"]}" stroke-width="1.5"/>'
            f'<text x="{curr_x + w/2}" y="{curr_y + 20}" fill="{palette["green_deep"]}" font-family="Arial, sans-serif" font-size="12" font-weight="700" text-anchor="middle">{skill}</text>'
        )
        curr_x += w + 10
    skills_svg = "\n  ".join(skill_badges)

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

    rector_sig_section = (
        f'<image href="{sig_href}" x="670" y="650" width="140" height="50" preserveAspectRatio="xMidYMid meet"/>'
        if sig_href else
        f'<text x="740" y="690" fill="#3B82F6" font-family="Georgia, serif" font-size="20" font-style="italic" text-anchor="middle">Dr. Ó. Fidencio I. H.</text>'
    )

    # MEJORA 2: Sello Oficial Medallón Dorado
    seal_section = (
        f'<image href="{seal_href}" x="830" y="640" width="70" height="70" preserveAspectRatio="xMidYMid meet"/>'
        if seal_href else
        f'<circle cx="865" cy="675" r="35" fill="none" stroke="{palette["gold"]}" stroke-width="2.5"/>'
        f'<circle cx="865" cy="675" r="30" fill="none" stroke="{palette["gold"]}" stroke-width="1" stroke-dasharray="3 2"/>'
        f'<circle cx="865" cy="675" r="25" fill="{palette["mist"]}" fill-opacity="0.4"/>'
        f'<text x="865" y="672" fill="{palette["gold"]}" font-family="Arial, sans-serif" font-size="10" font-weight="700" text-anchor="middle">UTCJ</text>'
        f'<text x="865" y="685" fill="{palette["green"]}" font-family="Arial, sans-serif" font-size="7" font-weight="700" text-anchor="middle">SELLO OFICIAL</text>'
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

  <!-- MEJORA 1: Marca de agua / Patrón de seguridad Guilloche -->
  <g opacity="0.035" stroke="{palette["green"]}" stroke-width="1.5" fill="none">
    <circle cx="800" cy="450" r="300"/>
    <circle cx="800" cy="450" r="250"/>
    <circle cx="800" cy="450" r="200"/>
    <circle cx="800" cy="450" r="150"/>
    <path d="M500 450 Q800 150 1100 450 Q800 750 500 450Z"/>
    <path d="M500 450 Q800 750 1100 450 Q800 150 500 450Z"/>
    <path d="M800 150 Q1100 450 800 750 Q500 450 800 150Z"/>
  </g>

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

  <!-- MEJORA 3: Tarjeta de Competencias con Píldoras -->
  <rect x="68" y="620" width="560" height="176" rx="24" fill="{palette["white"]}" stroke="{palette["silver"]}"/>
  <text x="92" y="656" fill="{palette["green"]}" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2">COMPETENCIAS ACREDITADAS</text>
  {skills_svg}

  <!-- Firmas y Sello Medallón -->
  <line x1="660" y1="710" x2="820" y2="710" stroke="{palette["silver"]}" stroke-width="2"/>
  {rector_sig_section}
  <text x="740" y="738" fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Dr. Óscar F. Ibáñez Hernández</text>
  <text x="740" y="762" fill="{palette["silver"]}" font-family="Arial, sans-serif" font-size="13" text-anchor="middle">Rector de la UTCJ</text>

  {seal_section}

  <line x1="910" y1="710" x2="1070" y2="710" stroke="{palette["silver"]}" stroke-width="2"/>
  <text x="990" y="690" fill="{palette["teal"]}" font-family="Georgia, serif" font-size="20" font-style="italic" text-anchor="middle">Firma Digital</text>
  <text x="990" y="738" fill="{palette["graphite"]}" font-family="Arial, sans-serif" font-size="15" font-weight="700" text-anchor="middle">Firma Criptográfica</text>
  <text x="990" y="762" fill="{palette["silver"]}" font-family="Arial, sans-serif" font-size="13" text-anchor="middle">Validación Blockchain</text>

  <!-- MEJORA 4: Bloque de Trazabilidad Criptográfica con Status Badge -->
  <rect x="1080" y="216" width="400" height="310" rx="30" fill="{palette["teal"]}"/>
  <rect x="1104" y="238" width="230" height="28" rx="14" fill="{palette["green"]}" fill-opacity="0.3"/>
  <circle cx="1120" cy="252" r="5" fill="#10B981"/>
  <text x="1134" y="257" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="11" font-weight="700" letter-spacing="1">W3C BLOCKCERTS v3.2</text>
  
  <text x="1112" y="300" fill="{palette["mist"]}" font-family="Arial, sans-serif" font-size="16" font-weight="700" letter-spacing="2">TRAZABILIDAD CRIPTOGRAFICA</text>
  <text x="1112" y="348" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="22">ID: {subject['certificateId'][:22]}...</text>
  <text x="1112" y="390" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="20">Fecha: {subject['issueDate']}</text>
  <text x="1112" y="432" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="20">Horas: {subject['hours']} hrs</text>
  <text x="1112" y="478" fill="{palette["gold"]}" font-family="monospace" font-size="16">Anclaje: {transaction_id[:24]}...</text>
  
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

    # MEJORA 1: Marca de agua / Roseta de Seguridad en PDF
    c.saveState()
    c.setStrokeColor(HexColor(PALETTE["green"]))
    c.setLineWidth(0.4)
    c.setStrokeAlpha(0.04)
    center_x, center_y = width / 2, height / 2
    for r in range(60, 240, 30):
        c.circle(center_x, center_y, r, stroke=1, fill=0)
    c.restoreState()

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
    c.drawCentredString(width / 2, height - 92, "MICROCREDENCIAL VERIFICABLE W3C BLOCKCERTS")

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

    # MEJORA 3: Competencias Acreditadas Estilizadas en PDF
    skills_y = desc_y - 22
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(HexColor(PALETTE["gold"]))
    c.drawCentredString(width / 2, skills_y, "COMPETENCIAS ACREDITADAS")
    
    cleaned_skills = []
    for s in subject["skills"][:5]:
        if len(s) > 28:
            cleaned_skills.append(s[:25] + "...")
        else:
            cleaned_skills.append(s)
    skills_str = "   •   ".join(cleaned_skills)
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor(PALETTE["green_deep"]))
    c.drawCentredString(width / 2, skills_y - 16, f"[  {skills_str}  ]")

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

    # MEJORA 2: Sello Medallón Dorado en PDF
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
        c.setLineWidth(2)
        c.circle(seal_x, sig_y, 28, fill=0, stroke=1)
        c.setLineWidth(0.8)
        c.circle(seal_x, sig_y, 24, fill=0, stroke=1)
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(HexColor(PALETTE["gold"]))
        c.drawCentredString(seal_x, sig_y + 3, "UTCJ")
        c.setFont("Helvetica-Bold", 6.5)
        c.setFillColor(HexColor(PALETTE["green"]))
        c.drawCentredString(seal_x, sig_y - 8, "SELLO OFICIAL")

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

    # MEJORA 4: QR Code and Technical Metadata Block con Status Badge
    qr = qrcode.make(settings.certificate_render_url(subject["certificateId"]))
    qr_buffer = io.BytesIO()
    qr.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    c.drawImage(ImageReader(qr_buffer), 56, 38, width=56, height=56, mask="auto")

    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(HexColor(PALETTE["green"]))
    c.drawString(120, 78, "VERIFICACIÓN BLOCKCHAIN ACTIVA (W3C BLOCKCERTS v3.2)")

    c.setFont("Helvetica", 7.5)
    c.setFillColor(HexColor(PALETTE["graphite"]))
    c.drawString(120, 66, f"ID Credencial: {subject['certificateId']}   |   Fecha: {subject['issueDate']}   |   Duración: {subject['hours']} hrs")
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(HexColor(PALETTE["silver"]))
    c.drawString(120, 54, f"Anclaje Criptográfico ({chain}): {transaction_id[:45]}...")
    c.drawString(120, 43, "Representación visual oficial. El artefacto principal verificable es el archivo JSON Blockcerts registrado en Blockchain.")

    c.showPage()
    c.save()
    return buffer.getvalue()


def render_constancia_pdf(certificate: dict[str, Any], settings: Settings, transaction_id: str, palette: dict[str, str] | None = None) -> bytes:
    import hashlib
    import qrcode
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import HexColor
    from reportlab.lib.utils import ImageReader
    from reportlab.platypus import Paragraph, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet

    if palette is None:
        palette = get_palette(settings)
    subject = certificate["credentialSubject"]
    cert_id = subject["certificateId"]
    num = int(hashlib.md5(cert_id.encode('utf-8')).hexdigest()[:6], 16) % 90000 + 10000
    folio_num = f"UTCJ-2026-MC-{num}"
    chain = getattr(settings, "default_chain", "ethereum_mainnet")

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    page_w, page_h = letter  # 612 x 792 pt

    # Border & Institutional Framing
    c.setStrokeColor(HexColor(palette["gold"]))
    c.setLineWidth(2)
    c.rect(36, 36, page_w - 72, page_h - 72)
    
    c.setStrokeColor(HexColor(palette["green"]))
    c.setLineWidth(0.75)
    c.rect(42, 42, page_w - 84, page_h - 84)

    # University Header Text
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(HexColor(palette["teal"]))
    c.drawCentredString(page_w / 2, page_h - 70, "UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ")

    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(HexColor(palette["green"]))
    c.drawCentredString(page_w / 2, page_h - 84, "ORGANISMO PÚBLICO DESCENTRALIZADO DEL GOBIERNO DEL ESTADO DE CHIHUAHUA")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(HexColor(palette["graphite"]))
    c.drawCentredString(page_w / 2, page_h - 96, "DIRECCIÓN DE ADMINISTRACIÓN ESCOLAR • CLAVE CCT: 08MSU0017R • RECONOCIMIENTO CGUTyP / SEPyD")

    c.setStrokeColor(HexColor(palette["gold"]))
    c.setLineWidth(1)
    c.line(60, page_h - 106, page_w - 60, page_h - 106)

    # Document Title
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(HexColor(palette["teal"]))
    c.drawCentredString(page_w / 2, page_h - 130, "CONSTANCIA OFICIAL DE ACREDITACIÓN ACADÉMICA Y COMPETENCIAS")

    # Folio Tag
    c.setFont("Helvetica-Bold", 9.5)
    c.setFillColor(HexColor(palette["gold"]))
    c.drawRightString(page_w - 60, page_h - 150, f"FOLIO REGISTRO: {folio_num}")
    c.drawString(60, page_h - 150, f"FECHA EMISIÓN: {subject.get('issueDate', '2026-08-10')}")

    # Body Paragraph
    body_text = f"""La Dirección de Administración Escolar de la Universidad Tecnológica de Ciudad Juárez HACE CONSTAR que, según los registros del Libro Matriz de Microcredenciales Universitarias, el (la) C. <b>{subject.get('name', 'N/A')}</b> ha acreditado satisfactoriamente la totalidad de las evaluaciones del programa de competencias titulado <b>"{certificate.get('name', 'N/A')}"</b>."""

    style = getSampleStyleSheet()["Normal"]
    style.fontName = "Helvetica"
    style.fontSize = 9.5
    style.leading = 15
    style.textColor = HexColor(palette["graphite"])

    p = Paragraph(body_text, style)
    p.wrapOn(c, page_w - 120, 200)
    p.drawOn(c, 60, page_h - 215)

    tx_str = str(transaction_id or "N/A")
    data = [
        ["CONCEPTO REGISTRAL", "DETALLE INSTITUCIONAL Y CRIPTOGRÁFICO"],
        ["Titular Acreditado", subject.get('name', 'N/A')],
        ["Programa de Microcredencial", certificate.get('name', 'N/A')],
        ["Horas Lectivas y Prácticas", f"{subject.get('hours', 40)} Horas Acreditadas"],
        ["Evaluación Académica", subject.get('grade', 'Aprobado')],
        ["Identificador Global (GUID)", cert_id],
        ["Anclaje Blockchain (Red)", f"Ethereum Mainnet (Tx: {tx_str[:24]}...)"],
        ["Estándar de Verificación", "W3C Blockcerts v3.2 / Firma Digital de Rectoría"]
    ]

    t = Table(data, colWidths=[160, 332])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), HexColor(palette["teal"])),
        ('TEXTCOLOR', (0,0), (1,0), HexColor("#FFFFFF")),
        ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor(palette["mist"])),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor("#FFFFFF"), HexColor("#F9FBFB")]),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0,1), (0,-1), HexColor(palette["green"])),
    ]))
    t.wrapOn(c, page_w - 120, 300)
    t.drawOn(c, 60, page_h - 410)

    # QR Code for Verification
    qr = qrcode.make(settings.certificate_render_url(cert_id))
    qr_buffer = io.BytesIO()
    qr.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    c.drawImage(ImageReader(qr_buffer), 60, 95, width=80, height=80, mask="auto")

    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(HexColor(palette["teal"]))
    c.drawString(60, 82, "ESCANEE PARA VERIFICAR")
    c.setFont("Helvetica", 6.5)
    c.setFillColor(HexColor(palette["graphite"]))
    c.drawString(60, 72, "Portal Oficial UTCJ")

    # Rector Signature Block
    sig_path = settings.data_dir / "rector_signature.png"
    if sig_path.exists():
        try:
            c.drawImage(str(sig_path), page_w - 230, 125, width=140, height=45, mask="auto")
        except Exception:
            pass

    c.setStrokeColor(HexColor(palette["teal"]))
    c.setLineWidth(1)
    c.line(page_w - 250, 120, page_w - 60, 120)

    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(HexColor(palette["teal"]))
    c.drawCentredString(page_w - 155, 108, "Dr. Óscar Fidencio Ibáñez Hernández")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(HexColor(palette["graphite"]))
    c.drawCentredString(page_w - 155, 96, "Rector de la Universidad Tecnológica")
    c.drawCentredString(page_w - 155, 86, "de Ciudad Juárez")

    # Legal Footer
    c.setFont("Helvetica", 6.5)
    c.setFillColor(HexColor(palette["silver"]))
    c.drawCentredString(page_w / 2, 50, "Esta constancia es un documento oficial emitido por la Universidad Tecnológica de Ciudad Juárez (UTCJ).")
    c.drawCentredString(page_w / 2, 41, "La autenticidad de la información y su anclaje criptográfico puede verificarse en https://utcjmicro.javierflores.software")

    c.showPage()
    c.save()
    return buffer.getvalue()


def render_social_card_svg(certificate: dict[str, Any], settings: Settings, transaction_id: str, palette: dict[str, str] | None = None) -> str:
    if palette is None:
        palette = get_palette(settings)
    subject = certificate["credentialSubject"]
    qr_uri = _qr_data_uri(settings.certificate_render_url(subject["certificateId"]), fill_color="#0F3E4A")
    
    recipient_name = subject['name']
    title_name = certificate['name']
    
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <linearGradient id="cardBg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="{palette["teal"]}"/>
      <stop offset="100%" stop-color="{palette["green_deep"]}"/>
    </linearGradient>
    <linearGradient id="goldBorder" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="{palette["gold"]}"/>
      <stop offset="100%" stop-color="#FEF08A"/>
    </linearGradient>
  </defs>
  
  <rect width="1200" height="630" fill="url(#cardBg)"/>
  <rect x="24" y="24" width="1152" height="582" rx="28" stroke="url(#goldBorder)" stroke-width="3" fill="none"/>
  
  <!-- Decorative Watermark -->
  <circle cx="1050" cy="120" r="140" fill="{palette["green"]}" fill-opacity="0.2"/>
  <circle cx="1120" cy="220" r="80" fill="{palette["gold"]}" fill-opacity="0.15"/>
  
  <!-- Header with Enlarged Official UTCJ Emblem Logo -->
  <g transform="translate(64, 40) scale(1.45)">
    <circle cx="36" cy="36" r="34" fill="{palette["teal"]}" stroke="{palette["gold"]}" stroke-width="3"/>
    <circle cx="36" cy="36" r="28" stroke="{palette["gold"]}" stroke-width="1.2" stroke-dasharray="3 2"/>
    <path d="M22 28 L36 17 L50 28 L50 46 L36 55 L22 46 Z" fill="{palette["green"]}" stroke="{palette["gold"]}" stroke-width="1.5"/>
    <text x="36" y="41" font-family="Arial, sans-serif" font-weight="900" font-size="12" fill="#FFFFFF" text-anchor="middle">UTCJ</text>
  </g>

  <text x="184" y="80" fill="{palette["gold"]}" font-family="Arial, sans-serif" font-size="19" font-weight="800" letter-spacing="3">UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ</text>
  <text x="184" y="110" fill="{palette["mist"]}" font-family="Arial, sans-serif" font-size="14" font-weight="600" letter-spacing="1.5">MICROCREDENCIAL ACADÉMICA VERIFICABLE EN BLOCKCHAIN</text>
  
  <!-- Title -->
  <text x="64" y="200" fill="#FFFFFF" font-family="Georgia, serif" font-size="34" font-weight="700">{title_name[:45]}{'...' if len(title_name) > 45 else ''}</text>
  
  <!-- Recipient -->
  <text x="64" y="265" fill="{palette["mist"]}" font-family="Arial, sans-serif" font-size="20">Otorgada oficialmente a:</text>
  <text x="64" y="320" fill="#FFFFFF" font-family="Georgia, serif" font-size="42" font-weight="700">{recipient_name}</text>
  
  <!-- Verified Badge -->
  <rect x="64" y="365" width="340" height="38" rx="19" fill="{palette["green"]}" fill-opacity="0.6" stroke="{palette["gold"]}" stroke-width="1"/>
  <circle cx="86" cy="384" r="6" fill="#10B981"/>
  <text x="102" y="389" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="13" font-weight="700" letter-spacing="1">VERIFICADA EN ETHEREUM</text>
  
  <text x="64" y="445" fill="{palette["mist"]}" font-family="Arial, sans-serif" font-size="16">ID: {subject['certificateId']}</text>
  <text x="64" y="475" fill="{palette["gold"]}" font-family="monospace" font-size="14">Tx: {transaction_id[:36]}...</text>
  
  <!-- QR Box -->
  <rect x="940" y="340" width="190" height="210" rx="20" fill="#FFFFFF"/>
  <image href="{qr_uri}" x="960" y="355" width="150" height="150"/>
  <text x="1035" y="530" fill="{palette["teal"]}" font-family="Arial, sans-serif" font-size="12" font-weight="700" text-anchor="middle">ESCANEA PARA VERIFICAR</text>
  
  <!-- Footer -->
  <line x1="64" y1="550" x2="900" y2="550" stroke="{palette["mist"]}" stroke-opacity="0.3" stroke-width="1"/>
  <text x="64" y="582" fill="{palette["mist"]}" font-family="Arial, sans-serif" font-size="14">Firma Digital del Rector: Dr. Óscar F. Ibáñez Hernández • Estándar Abierto W3C Blockcerts v3.2</text>
</svg>"""



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

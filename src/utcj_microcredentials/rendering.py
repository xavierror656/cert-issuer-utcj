from __future__ import annotations

import base64
import io
import hashlib
from pathlib import Path
from typing import Any

import qrcode
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import landscape, A4, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Table, TableStyle, SimpleDocTemplate, Spacer

from .branding import PALETTE, get_palette
from .config import Settings


def resolve_course_enrichment(course_title: str, current_skills: list[str] | None = None) -> tuple[list[str], str, list[str]]:
    title_lower = (course_title or "").lower()
    
    # Check if existing skills are specific and not just the default 2 generic placeholders
    generic_set = {"competencias profesionales", "conocimientos especializados", "competencias profesionales especializadas", ""}
    if current_skills and len(current_skills) >= 3 and not all(s.lower().strip() in generic_set for s in current_skills):
        skills = current_skills
    else:
        if "seguridad" in title_lower or "ciberseguridad" in title_lower or "informática" in title_lower:
            skills = [
                "Implementación de Controles ISO/IEC 27001",
                "Gestión de Vulnerabilidades y Riesgos TI",
                "Auditoría y Cumplimiento de Ciberseguridad",
                "Protección de Infraestructuras Críticas",
                "Respuesta y Mitigación de Incidentes"
            ]
        elif "semiconductor" in title_lower or "mems" in title_lower:
            skills = [
                "Diseño de Dispositivos Microelectrónicos",
                "Tecnología y Litografía de MEMS",
                "Física de Materiales Semiconductores",
                "Simulación CAD y Arquitectura VLSI",
                "Metrología y Pruebas en Cuarto Limpio"
            ]
        elif "plc" in title_lower or "controlador" in title_lower or "lógico" in title_lower:
            skills = [
                "Programación en Lógica de Escalera (Ladder/Grafcet)",
                "Configuración y Dimensionamiento de PLC",
                "Integración de Sensores y Actuadores Industriales",
                "Protocolos de Comunicación Industrial (Modbus/Profinet)",
                "Mantenimiento y Diagnóstico de Automatismos"
            ]
        elif "power bi" in title_lower or "intelligence" in title_lower or "datos" in title_lower:
            skills = [
                "Modelado de Datos Relacional y DAX",
                "ETL y Transformación con Power Query",
                "Diseño de Dashboards y Reportes Ejecutivos",
                "Analítica de Negocios y Métricas Clave (KPIs)",
                "Gobernanza y Publicación de Soluciones BI"
            ]
        elif "inteligencia artificial" in title_lower or "ia" in title_lower or "manufactura" in title_lower:
            skills = [
                "Modelos de Machine Learning para Procesos Industriales",
                "Visión Artificial para Inspección Automatizada",
                "Mantenimiento Predictivo Basado en Datos",
                "Integración de IoT Industrial (IIoT)",
                "Optimización de Líneas de Producción 4.0"
            ]
        else:
            skills = [
                "Dominio Teórico y Práctico Especializado",
                "Metodologías de Ingeniería Aplicada",
                "Cumplimiento de Estándares Internacionales",
                "Resolución de Problemas en Entornos Productivos",
                "Gestión de Calidad y Mejora Continua"
            ]

    # Description and Modules
    if "seguridad" in title_lower:
        desc = "Programa académico universitario enfocado en el dominio práctico de la norma ISO/IEC 27001, ciberseguridad defensiva, gestión de incidentes, protección de activos digitales y auditoría de seguridad informática en infraestructuras tecnológicas."
        modules = [
            "Módulo I: Marco Regulatorio y Fundamentos de Ciberseguridad",
            "Módulo II: Arquitectura Criptográfica y Control de Accesos",
            "Módulo III: Gestión de Riesgos, Amenazas y Vulnerabilidades",
            "Módulo IV: Auditoría, Cumplimiento y Continuidad de Negocio"
        ]
    elif "semiconductor" in title_lower:
        desc = "Formación especializada de alto nivel orientada a la cadena de valor de microelectrónica, técnicas de litografía, diseño y caracterización de circuitos integrados y dispositivos electromecánicos (MEMS)."
        modules = [
            "Módulo I: Física de Semiconductores y Dispositivos de Estado Sólido",
            "Módulo II: Diseño y Simulación de MEMS",
            "Módulo III: Procesos de Litografía y Fabricación en Cuarto Limpio",
            "Módulo IV: Empaquetado, Pruebas y Control de Calidad"
        ]
    elif "plc" in title_lower or "controlador" in title_lower:
        desc = "Programa técnico-práctico orientado a la ingeniería de automatización industrial, configuración de arquitecturas de control PLC, programación de rutinas complejas y comunicación con redes de planta."
        modules = [
            "Módulo I: Arquitectura del Hardware y Selección de Controladores",
            "Módulo II: Lenguajes de Programación IEC 61131-3 (Ladder/FBD)",
            "Módulo III: Interfaces Hombre-Máquina (HMI) y Redes de Campo",
            "Módulo IV: Puesta en Marcha, Seguridad Funcional y Diagnóstico"
        ]
    elif "power bi" in title_lower or "intelligence" in title_lower:
        desc = "Especialización en análisis y modelado de datos para inteligencia de negocios, optimización de consultas, creación de indicadores de desempeño y tableros interactivos para la toma de decisiones."
        modules = [
            "Módulo I: Extracción y Transformación de Fuentes de Datos (ETL)",
            "Módulo II: Modelado Dimensional y Fórmulas DAX Avanzadas",
            "Módulo III: Diseño de Visualizaciones y Experiencia de Usuario",
            "Módulo IV: Despliegue, Seguridad y Gobernanza de Datos"
        ]
    else:
        desc = f"Programa académico oficial de microcredencial emitido por la UTCJ que certifica conocimientos especializados, dominio técnico y competencias laborales en {course_title}."
        modules = [
            "Módulo I: Fundamentos Teóricos y Marco de Referencia",
            "Módulo II: Métodos y Herramientas de Aplicación Práctica",
            "Módulo III: Análisis de Casos y Proyectos Reales",
            "Módulo IV: Evaluación de Desempeño y Validación de Competencias"
        ]
        
    return skills, desc, modules


def _qr_data_uri(value: str, fill_color: str = "#114938") -> str:
    qr = qrcode.QRCode(box_size=5, border=1)
    qr.add_data(value)
    qr.make(fit=True)
    image = qr.make_image(fill_color=fill_color, back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _get_logo_path(logo_name: str, settings: Settings | None = None) -> Path | None:
    candidates: list[Path] = []
    if settings and hasattr(settings, "logos_dir") and settings.logos_dir:
        candidates.append(Path(settings.logos_dir) / logo_name)
    candidates.extend([
        Path(__file__).resolve().parents[2] / "assets" / "logos" / logo_name,
        Path("/app/assets/logos") / logo_name,
        Path("assets/logos") / logo_name,
        Path("/home/ubuntu/cert-issuer/assets/logos") / logo_name,
    ])
    for p in candidates:
        if p.exists() and p.is_file():
            return p
    return None


def _get_logo_base64(logo_name: str, settings: Settings | None = None) -> str:
    path = _get_logo_path(logo_name, settings)
    if path and path.exists():
        try:
            return f"data:image/png;base64,{base64.b64encode(path.read_bytes()).decode('ascii')}"
        except Exception:
            return ""
    return ""


def _draw_filigree_corners_rl(c: canvas.Canvas, x1: float, y1: float, x2: float, y2: float, size: float = 24.0, color: str = "#B88A3B"):
    c.saveState()
    c.setStrokeColor(HexColor(color))
    c.setLineWidth(1.2)
    # Top-Left
    c.line(x1, y2 - size, x1 + size, y2)
    c.line(x1, y2 - (size * 1.5), x1 + (size * 1.5), y2)
    c.line(x1 + (size * 0.4), y2 - (size * 0.4), x1 + size, y2 - (size * 0.4))
    c.line(x1 + (size * 0.4), y2 - (size * 0.4), x1 + (size * 0.4), y2 - size)
    
    # Top-Right
    c.line(x2, y2 - size, x2 - size, y2)
    c.line(x2, y2 - (size * 1.5), x2 - (size * 1.5), y2)
    c.line(x2 - (size * 0.4), y2 - (size * 0.4), x2 - size, y2 - (size * 0.4))
    c.line(x2 - (size * 0.4), y2 - (size * 0.4), x2 - (size * 0.4), y2 - size)
    
    # Bottom-Left
    c.line(x1, y1 + size, x1 + size, y1)
    c.line(x1, y1 + (size * 1.5), x1 + (size * 1.5), y1)
    c.line(x1 + (size * 0.4), y1 + (size * 0.4), x1 + size, y1 + (size * 0.4))
    c.line(x1 + (size * 0.4), y1 + (size * 0.4), x1 + (size * 0.4), y1 + size)
    
    # Bottom-Right
    c.line(x2, y1 + size, x2 - size, y1)
    c.line(x2, y1 + (size * 1.5), x2 - (size * 1.5), y1)
    c.line(x2 - (size * 0.4), y1 + (size * 0.4), x2 - size, y1 + (size * 0.4))
    c.line(x2 - (size * 0.4), y1 + (size * 0.4), x2 - (size * 0.4), y1 + size)
    c.restoreState()


def _draw_guilloche_watermark_rl(c: canvas.Canvas, cx: float, cy: float, max_r: float = 240.0):
    c.saveState()
    c.setStrokeColor(HexColor("#114938"))
    c.setLineWidth(0.4)
    c.setStrokeAlpha(0.035)
    step = max(20, int(max_r / 8))
    for r in range(step, int(max_r) + 1, step):
        c.circle(cx, cy, r, stroke=1, fill=0)
    c.restoreState()


def _draw_gold_medallion_rl(c: canvas.Canvas, cx: float, cy: float, radius: float = 28.0):
    c.saveState()
    # Outer gold circle
    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(2.2)
    c.circle(cx, cy, radius, fill=0, stroke=1)
    # Inner dash gold circle
    c.setLineWidth(0.8)
    c.setDash(3, 2)
    c.circle(cx, cy, radius - 4, fill=0, stroke=1)
    c.setDash()
    # Inner tinted fill
    c.setFillColor(HexColor("#FAF8F5"))
    c.circle(cx, cy, radius - 6, fill=1, stroke=0)
    # Typography
    c.setFont("Helvetica-Bold", radius * 0.3)
    c.setFillColor(HexColor("#8C6527"))
    c.drawCentredString(cx, cy + (radius * 0.22), "UTCJ")
    c.setFont("Helvetica-Bold", radius * 0.21)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(cx, cy - (radius * 0.08), "SELLO OFICIAL")
    c.setFont("Helvetica-Bold", radius * 0.18)
    c.setFillColor(HexColor("#8C6527"))
    c.drawCentredString(cx, cy - (radius * 0.35), "RECTORÍA")
    c.restoreState()


def build_display_html(certificate_url: str, visual_url: str, payload: dict[str, Any], settings: Settings | None = None) -> str:
    recipient = payload["credentialSubject"]["name"]
    title = payload["name"]
    course = payload["credentialSubject"]["courseName"]
    raw_skills = payload["credentialSubject"].get("skills", [])
    skills_list, _, _ = resolve_course_enrichment(title, raw_skills)
    skills = "   •   ".join(skills_list)
    
    return f"""<div style="max-width:920px;margin:0 auto;padding:40px;background:#FFFFFF;border:2px solid #B88A3B;box-shadow:0 15px 35px rgba(0,0,0,0.06);font-family:'Montserrat',serif;color:#114938;">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #B88A3B;padding-bottom:16px;margin-bottom:24px;">
    <img src="/assets/logos/utyp-logo.png" alt="UTyP" style="height:44px;width:auto;object-fit:contain;">
    <div style="text-align:center;flex:1;padding:0 12px;">
      <div style="font-size:18px;font-weight:900;letter-spacing:2px;color:#114938;text-transform:uppercase;">UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ</div>
      <div style="font-size:11px;color:#64748B;margin-top:4px;">Subsistema de Universidades Tecnológicas y Politécnicas • Modalidad Mixta</div>
    </div>
    <img src="/assets/logos/utcj-logo.png" alt="UTCJ" style="height:44px;width:auto;object-fit:contain;">
  </div>
  <div style="text-align:center;margin:28px 0;">
    <div style="font-size:13px;letter-spacing:3px;color:#B88A3B;font-weight:700;text-transform:uppercase;">Otorga la presente Microcredencial Universitaria a:</div>
    <div style="font-size:32px;font-weight:900;color:#114938;margin:12px 0;font-family:'Playfair Display',Georgia,serif;">{recipient}</div>
    <div style="font-size:14px;color:#475569;margin-bottom:8px;">Por haber acreditado satisfactoriamente las competencias del programa:</div>
    <div style="font-size:22px;font-weight:800;color:#146049;">{title}</div>
    <div style="font-size:12px;color:#64748B;margin-top:16px;font-weight:600;">[ {skills} ]</div>
  </div>
  <div style="border-top:1px solid #E2E8F0;padding-top:14px;display:flex;justify-content:space-between;font-size:11px;color:#94A3B8;">
    <span>Registro Oficial W3C Blockcerts v3.2</span>
    <span><a href="{visual_url}" style="color:#146049;font-weight:700;">Ver SVG</a> • <a href="{certificate_url}" style="color:#146049;font-weight:700;">Descargar JSON</a></span>
  </div>
</div>"""


def render_certificate_svg(certificate: dict[str, Any], settings: Settings, transaction_id: str, palette: dict[str, str] | None = None) -> str:
    subject = certificate["credentialSubject"]
    cert_id = subject.get("certificateId", "")
    num = int(hashlib.md5(cert_id.encode('utf-8')).hexdigest()[:6], 16) % 90000 + 10000
    folio_num = f"UTCJ-2026-MC-{num}"
    
    qr_uri = _qr_data_uri(settings.certificate_render_url(cert_id), fill_color="#114938")
    
    recipient_name = subject.get('name', 'Estudiante')
    title_name = certificate.get('name', 'Microcredencial Universitaria')
    hours = subject.get('hours', 120)
    issue_date = subject.get('issueDate', '2026-08-28')

    # Formatting clean skills string with enrichment
    raw_skills = subject.get("skills", [])
    skills_list, _, _ = resolve_course_enrichment(title_name, raw_skills)
    skills_text = "   •   ".join(skills_list[:4])

    # Dynamic sizing for recipient name
    if len(recipient_name) > 36:
        recipient_font_size = 38
    elif len(recipient_name) > 26:
        recipient_font_size = 44
    else:
        recipient_font_size = 52

    # Dynamic sizing for title
    title_lines = _wrap_text(title_name.upper(), 42)
    title_tspans = []
    if len(title_lines) == 1:
        title_tspans.append(f'<tspan x="800" y="475">{title_lines[0]}</tspan>')
    else:
        title_tspans.append(f'<tspan x="800" y="460">{title_lines[0]}</tspan>')
        for line in title_lines[1:2]:
            title_tspans.append(f'<tspan x="800" dy="38">{line}</tspan>')
    title_svg_text = "\n      ".join(title_tspans)

    # UTyP & UTCJ Logos
    utyp_logo_href = _get_logo_base64("utyp-logo.png", settings)
    utcj_logo_href = _get_logo_base64("utcj-logo.png", settings)

    sig_rector_href = ""
    for ext in ("png", "jpg", "jpeg"):
        p = settings.data_dir / f"rector_signature.{ext}"
        if p.exists():
            sig_rector_href = f"data:image/{ext};base64,{base64.b64encode(p.read_bytes()).decode('ascii')}"
            break

    rector_sig_element = (
        f'<image href="{sig_rector_href}" x="220" y="660" width="160" height="50" preserveAspectRatio="xMidYMid meet"/>'
        if sig_rector_href else
        f'<text x="300" y="695" fill="#114938" font-family="Playfair Display, Georgia, serif" font-style="italic" font-size="22" text-anchor="middle">Dr. Óscar F. Ibáñez H.</text>'
    )

    utyp_logo_element = (
        f'<image href="{utyp_logo_href}" x="100" y="85" width="130" height="85" preserveAspectRatio="xMidYMid meet"/>'
        if utyp_logo_href else ''
    )

    utcj_logo_element = (
        f'<image href="{utcj_logo_href}" x="1370" y="85" width="130" height="85" preserveAspectRatio="xMidYMid meet"/>'
        if utcj_logo_href else ''
    )

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1130" viewBox="0 0 1600 1130" fill="none">
  <defs>
    <!-- Paper Texture Gradient -->
    <linearGradient id="parchment" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="50%" stop-color="#FCFDFD"/>
      <stop offset="100%" stop-color="#F8FAF9"/>
    </linearGradient>

    <!-- Metallic Antique Gold Gradient -->
    <linearGradient id="goldGrad" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#8C6527"/>
      <stop offset="30%" stop-color="#B88A3B"/>
      <stop offset="70%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#8C6527"/>
    </linearGradient>
    
    <!-- Deep Forest Green -->
    <linearGradient id="greenGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#114938"/>
      <stop offset="100%" stop-color="#0A3327"/>
    </linearGradient>
  </defs>

  <!-- Base Security Paper -->
  <rect width="1600" height="1130" fill="url(#parchment)"/>
  
  <!-- Outer Classical Frame -->
  <rect x="36" y="36" width="1528" height="1058" rx="8" fill="none" stroke="url(#goldGrad)" stroke-width="4"/>
  <rect x="48" y="48" width="1504" height="1034" rx="4" fill="none" stroke="#114938" stroke-width="1.5" stroke-opacity="0.6"/>
  <rect x="54" y="54" width="1492" height="1022" rx="2" fill="none" stroke="url(#goldGrad)" stroke-width="0.75"/>

  <!-- Corner Filigree Ornaments -->
  <!-- Top Left -->
  <path d="M54 94 L94 54 M54 114 L114 54 M64 64 L104 64 L64 104 Z" fill="none" stroke="#B88A3B" stroke-width="1.5"/>
  <!-- Top Right -->
  <path d="M1546 94 L1506 54 M1546 114 L1486 54 M1536 64 L1496 64 L1536 104 Z" fill="none" stroke="#B88A3B" stroke-width="1.5"/>
  <!-- Bottom Left -->
  <path d="M54 1036 L94 1076 M54 1016 L114 1076 M64 1066 L104 1066 L64 1026 Z" fill="none" stroke="#B88A3B" stroke-width="1.5"/>
  <!-- Bottom Right -->
  <path d="M1546 1036 L1506 1076 M1546 1016 L1486 1076 M1536 1066 L1496 1066 L1536 1026 Z" fill="none" stroke="#B88A3B" stroke-width="1.5"/>

  <!-- Security Guilloche Rosette (Subtle 3.5% Opacity) -->
  <g opacity="0.035" stroke="#114938" stroke-width="1.5" fill="none">
    <circle cx="800" cy="565" r="380"/>
    <circle cx="800" cy="565" r="320"/>
    <circle cx="800" cy="565" r="260"/>
    <circle cx="800" cy="565" r="200"/>
    <circle cx="800" cy="565" r="140"/>
    <path d="M420 565 Q800 185 1180 565 Q800 945 420 565Z"/>
    <path d="M420 565 Q800 945 1180 565 Q800 185 420 565Z"/>
    <path d="M800 185 Q1180 565 800 945 Q420 565 800 185Z"/>
  </g>

  <!-- ==================== HEADER INSTITUCIONAL CON LOGOS OFICIALES ==================== -->
  
  {utyp_logo_element}
  {utcj_logo_element}

  <text x="800" y="118" fill="#114938" font-family="'Montserrat', serif" font-size="28" font-weight="900" letter-spacing="3" text-anchor="middle">
    UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ
  </text>
  
  <text x="800" y="146" fill="#64748B" font-family="'Montserrat', sans-serif" font-size="12.5" font-weight="600" letter-spacing="1.5" text-anchor="middle">
    ORGANISMO PÚBLICO DESCENTRALIZADO DEL GOBIERNO DEL ESTADO DE CHIHUAHUA
  </text>
  
  <text x="800" y="168" fill="#B88A3B" font-family="'Montserrat', sans-serif" font-size="11" font-weight="800" letter-spacing="2.5" text-anchor="middle">
    SUBSISTEMA DE UNIVERSIDADES TECNOLÓGICAS Y POLITÉCNICAS • CCT: 08MSU0017R • MODALIDAD MIXTA
  </text>

  <!-- Separator Line -->
  <line x1="250" y1="188" x2="1350" y2="188" stroke="url(#goldGrad)" stroke-width="1.5"/>
  <circle cx="800" cy="188" r="4" fill="#B88A3B"/>

  <!-- ==================== CUERPO DEL DIPLOMA ==================== -->

  <text x="800" y="236" fill="#8C6527" font-family="'Montserrat', sans-serif" font-size="14" font-weight="800" letter-spacing="5" text-anchor="middle">
    OTORGA LA PRESENTE
  </text>

  <text x="800" y="278" fill="#114938" font-family="'Montserrat', serif" font-size="28" font-weight="900" letter-spacing="3" text-anchor="middle">
    MICROCREDENCIAL UNIVERSITARIA
  </text>

  <text x="800" y="320" fill="#64748B" font-family="'Playfair Display', Georgia, serif" font-style="italic" font-size="17" text-anchor="middle">
    A favor de:
  </text>

  <!-- Recipient Name (High Academic Dignity) -->
  <text x="800" y="372" fill="#114938" font-family="'Playfair Display', Georgia, serif" font-size="{recipient_font_size}" font-weight="700" text-anchor="middle">
    {recipient_name}
  </text>

  <!-- Recipient Underline -->
  <line x1="420" y1="390" x2="1180" y2="390" stroke="url(#goldGrad)" stroke-width="1.5"/>

  <text x="800" y="422" fill="#475569" font-family="'Montserrat', sans-serif" font-size="13.5" font-weight="500" letter-spacing="1" text-anchor="middle">
    Por haber acreditado satisfactoriamente la totalidad de las evaluaciones y demostrado el dominio de las competencias en:
  </text>

  <!-- Credential Title -->
  <text fill="#146049" font-family="'Montserrat', serif" font-size="25" font-weight="900" letter-spacing="1" text-anchor="middle">
    {title_svg_text}
  </text>

  <!-- Competencies & Hours Summary -->
  <text x="800" y="545" fill="#114938" font-family="'Montserrat', sans-serif" font-size="12" font-weight="700" letter-spacing="1" text-anchor="middle">
    COMPETENCIAS CERTIFICADAS:
  </text>

  <text x="800" y="570" fill="#475569" font-family="'Montserrat', sans-serif" font-size="13" font-weight="600" text-anchor="middle">
    [  {skills_text}  ]
  </text>

  <text x="800" y="605" fill="#8C6527" font-family="'Montserrat', sans-serif" font-size="12.5" font-weight="800" letter-spacing="1" text-anchor="middle">
    PROGRAMA ACREDITADO CON {hours} HORAS LECTIVAS Y PRÁCTICAS • VALIDEZ CURRICULAR OFICIAL
  </text>

  <!-- ==================== FIRMAS Y SELLO SECO ==================== -->

  <!-- Left: Rector -->
  <g transform="translate(100, 0)">
    {rector_sig_element}
    <line x1="200" y1="715" x2="400" y2="715" stroke="#94A3B8" stroke-width="1"/>
    <text x="300" y="734" fill="#114938" font-family="'Montserrat', sans-serif" font-size="13" font-weight="800" text-anchor="middle">Dr. Óscar Fidencio Ibáñez Hernández</text>
    <text x="300" y="752" fill="#64748B" font-family="'Montserrat', sans-serif" font-size="11" font-weight="600" text-anchor="middle">Rector de la UTCJ</text>
  </g>

  <!-- Center: Sello Seco Dorado Medallón Heráldico -->
  <g transform="translate(735, 645)">
    <circle cx="65" cy="65" r="58" fill="#FAF8F5" stroke="url(#goldGrad)" stroke-width="3"/>
    <circle cx="65" cy="65" r="52" fill="none" stroke="url(#goldGrad)" stroke-width="1.2" stroke-dasharray="4 2"/>
    <circle cx="65" cy="65" r="45" fill="#114938" fill-opacity="0.08"/>
    <text x="65" y="48" font-family="'Montserrat', sans-serif" font-weight="900" font-size="14" fill="#8C6527" text-anchor="middle">UTCJ</text>
    <text x="65" y="62" font-family="'Montserrat', sans-serif" font-weight="800" font-size="8.5" fill="#114938" text-anchor="middle">SELLO OFICIAL</text>
    <text x="65" y="74" font-family="'Montserrat', sans-serif" font-weight="800" font-size="7.5" fill="#8C6527" text-anchor="middle">RECTORÍA</text>
    <text x="65" y="86" font-family="'Montserrat', sans-serif" font-weight="700" font-size="6.5" fill="#64748B" text-anchor="middle">MODALIDAD MIXTA</text>
  </g>

  <!-- Right: Secretario Académico -->
  <g transform="translate(1000, 0)">
    <text x="300" y="695" fill="#146049" font-family="'Playfair Display', Georgia, serif" font-style="italic" font-size="20" text-anchor="middle">M.D.O.H. Hugo García V.</text>
    <line x1="200" y1="715" x2="400" y2="715" stroke="#94A3B8" stroke-width="1"/>
    <text x="300" y="734" fill="#114938" font-family="'Montserrat', sans-serif" font-size="13" font-weight="800" text-anchor="middle">M.D.O.H. Hugo García Vargas</text>
    <text x="300" y="752" fill="#64748B" font-family="'Montserrat', sans-serif" font-size="11" font-weight="600" text-anchor="middle">Secretario Académico</text>
  </g>

  <!-- ==================== CINTILLO INFERIOR DE SEGURIDAD ==================== -->
  
  <rect x="80" y="830" width="1440" height="200" rx="8" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1.2"/>
  <line x1="80" y1="830" x2="1520" y2="830" stroke="url(#goldGrad)" stroke-width="2.5"/>

  <!-- QR Code -->
  <g transform="translate(110, 850)">
    <rect x="0" y="0" width="160" height="160" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>
    <image href="{qr_uri}" x="10" y="10" width="140" height="140"/>
  </g>

  <!-- Cryptographic Details -->
  <text x="300" y="870" fill="#114938" font-family="'Montserrat', sans-serif" font-size="13" font-weight="900" letter-spacing="1">
    REGISTRO OFICIAL DE MICROCREDENCIAL UNIVERSITARIA EN BLOCKCHAIN
  </text>

  <text x="300" y="900" fill="#1E293B" font-family="'Montserrat', sans-serif" font-size="12" font-weight="700">
    FOLIO REGISTRAL: <tspan fill="#8C6527">{folio_num}</tspan>   |   EMISIÓN: <tspan fill="#475569">{issue_date}</tspan>   |   ESTÁNDAR: <tspan fill="#146049">W3C Blockcerts v3.2</tspan>
  </text>

  <text x="300" y="930" fill="#475569" font-family="'Montserrat', sans-serif" font-size="11" font-weight="600">
    IDENTIFICADOR ÚNICO (GUID): <tspan font-family="monospace" fill="#114938">{cert_id}</tspan>
  </text>

  <text x="300" y="960" fill="#475569" font-family="'Montserrat', sans-serif" font-size="11" font-weight="600">
    ANCLAJE EN BLOCKCHAIN: <tspan fill="#114938" font-weight="700">Red Ethereum Mainnet</tspan>   |   TRANSACCIÓN: <tspan font-family="monospace" fill="#8C6527">{transaction_id}</tspan>
  </text>

  <text x="300" y="990" fill="#94A3B8" font-family="'Montserrat', sans-serif" font-size="10" font-weight="500">
    Documento académico oficial infalsificable emitido conforme a la normatividad de la UTCJ y los estándares internacionales W3C.
  </text>

</svg>"""


def render_certificate_pdf(certificate: dict[str, Any], settings: Settings, transaction_id: str, chain: str | None = None, palette: dict[str, str] | None = None) -> bytes:
    subject = certificate["credentialSubject"]
    cert_id = subject.get("certificateId", "")
    num = int(hashlib.md5(cert_id.encode('utf-8')).hexdigest()[:6], 16) % 90000 + 10000
    folio_num = f"UTCJ-2026-MC-{num}"

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # 1. Base Parchment Fill
    c.setFillColor(HexColor("#FAFDFB"))
    c.rect(0, 0, width, height, stroke=0, fill=1)

    # 2. Guilloche Security Rosette (Watermark)
    _draw_guilloche_watermark_rl(c, width / 2, height / 2, max_r=220.0)

    # 3. Triple Classical Degree Border
    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(2.5)
    c.roundRect(22, 22, width - 44, height - 44, 4, fill=0, stroke=1)
    
    c.setStrokeColor(HexColor("#114938"))
    c.setLineWidth(1)
    c.roundRect(27, 27, width - 54, height - 54, 2, fill=0, stroke=1)

    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(0.5)
    c.roundRect(30, 30, width - 60, height - 60, 1, fill=0, stroke=1)

    # Corner Filigree
    _draw_filigree_corners_rl(c, 30, 30, width - 30, height - 30, size=20.0, color="#B88A3B")

    # 4. University Header with Dual Logos
    utyp_logo = _get_logo_path("utyp-logo.png", settings)
    if utyp_logo:
        try:
            c.drawImage(ImageReader(str(utyp_logo)), 46, height - 88, width=75, height=48, mask="auto")
        except Exception:
            pass

    utcj_logo = _get_logo_path("utcj-logo.png", settings)
    if utcj_logo:
        try:
            c.drawImage(ImageReader(str(utcj_logo)), width - 120, height - 88, width=75, height=48, mask="auto")
        except Exception:
            pass

    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(width / 2, height - 58, "UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ")
    
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#64748B"))
    c.drawCentredString(width / 2, height - 72, "ORGANISMO PÚBLICO DESCENTRALIZADO DEL GOBIERNO DEL ESTADO DE CHIHUAHUA")

    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(HexColor("#B88A3B"))
    c.drawCentredString(width / 2, height - 84, "SUBSISTEMA DE UNIVERSIDADES TECNOLÓGICAS Y POLITÉCNICAS • CCT: 08MSU0017R • MODALIDAD MIXTA")

    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(1)
    c.line(140, height - 92, width - 140, height - 92)

    # 5. Solemn Diploma Wording
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(HexColor("#8C6527"))
    c.drawCentredString(width / 2, height - 116, "OTORGA LA PRESENTE")

    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(width / 2, height - 138, "MICROCREDENCIAL UNIVERSITARIA")

    c.setFont("Helvetica-Oblique", 10.5)
    c.setFillColor(HexColor("#64748B"))
    c.drawCentredString(width / 2, height - 158, "A favor de:")

    # 6. Recipient Name
    recipient_name = subject.get("name", "Estudiante")
    if len(recipient_name) > 36:
        recipient_font_size = 18
    elif len(recipient_name) > 26:
        recipient_font_size = 22
    else:
        recipient_font_size = 26
    c.setFont("Helvetica-Bold", recipient_font_size)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(width / 2, height - 188, recipient_name)

    # Underline
    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(1.2)
    c.line((width / 2) - 180, height - 196, (width / 2) + 180, height - 196)

    # 7. Body Statement & Title
    c.setFont("Helvetica", 9)
    c.setFillColor(HexColor("#475569"))
    c.drawCentredString(width / 2, height - 215, "Por haber acreditado satisfactoriamente el programa académico de competencias:")

    title_name = certificate.get("name", "Microcredencial").upper()
    title_style = ParagraphStyle(
        name="DegreeTitle",
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=15,
        textColor=HexColor("#146049"),
        alignment=TA_CENTER
    )
    title_p = Paragraph(title_name, title_style)
    _, title_h = title_p.wrap(width - 160, height)
    title_y = height - 226 - title_h
    title_p.drawOn(c, 80, title_y)

    # 8. Competencies with Enrichment
    raw_skills = subject.get("skills", [])
    skills_list, _, _ = resolve_course_enrichment(title_name, raw_skills)
    skills_str = "   •   ".join(skills_list[:5])
    skills_style = ParagraphStyle(
        name="SkillsStyle",
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=HexColor("#475569"),
        alignment=TA_CENTER
    )
    skills_p = Paragraph(f"[  {skills_str}  ]", skills_style)
    _, sh = skills_p.wrap(width - 180, 40)
    skills_y = title_y - 10 - sh
    skills_p.drawOn(c, 90, skills_y)

    hours = subject.get("hours", 120)
    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(HexColor("#8C6527"))
    c.drawCentredString(width / 2, skills_y - 13, f"PROGRAMA ACREDITADO CON {hours} HORAS LECTIVAS Y PRÁCTICAS • VALIDEZ CURRICULAR OFICIAL")

    # 9. Signatures Block & Gold Medallion
    sig_y = 115
    
    # Rector Signature
    rector_sig_file = None
    for ext in ("png", "jpg", "jpeg"):
        p = settings.data_dir / f"rector_signature.{ext}"
        if p.exists():
            rector_sig_file = p
            break

    if rector_sig_file:
        c.drawImage(ImageReader(str(rector_sig_file)), 130, sig_y + 4, width=120, height=35, mask="auto")
    else:
        c.setFont("Helvetica-Oblique", 12)
        c.setFillColor(HexColor("#114938"))
        c.drawCentredString(190, sig_y + 14, "Dr. Óscar F. Ibáñez H.")

    c.setStrokeColor(HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(110, sig_y + 6, 270, sig_y + 6)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(190, sig_y - 6, "Dr. Óscar Fidencio Ibáñez Hernández")
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor("#64748B"))
    c.drawCentredString(190, sig_y - 15, "Rector de la UTCJ")

    # Gold Seal Medallion in Center
    seal_x = width / 2
    _draw_gold_medallion_rl(c, seal_x, sig_y + 4, radius=26.0)

    # Secretario Academico Signature
    c.setFont("Helvetica-Oblique", 11)
    c.setFillColor(HexColor("#146049"))
    c.drawCentredString(width - 190, sig_y + 14, "M.D.O.H. Hugo García V.")
    c.setStrokeColor(HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(width - 270, sig_y + 6, width - 110, sig_y + 6)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(width - 190, sig_y - 6, "M.D.O.H. Hugo García Vargas")
    c.setFont("Helvetica", 7)
    c.setFillColor(HexColor("#64748B"))
    c.drawCentredString(width - 190, sig_y - 15, "Secretario Académico")

    # 10. Security & Blockchain Bottom Ribbon
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.8)
    c.roundRect(36, 32, width - 72, 54, 4, fill=1, stroke=1)
    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(1.5)
    c.line(36, 86, width - 36, 86)

    qr = qrcode.make(settings.certificate_render_url(cert_id))
    qr_buffer = io.BytesIO()
    qr.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    c.drawImage(ImageReader(qr_buffer), 44, 35, width=48, height=48, mask="auto")

    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(HexColor("#114938"))
    c.drawString(100, 74, f"REGISTRO EN BLOCKCHAIN ETHEREUM • FOLIO: {folio_num} • W3C BLOCKCERTS v3.2")

    c.setFont("Helvetica", 6.5)
    c.setFillColor(HexColor("#475569"))
    c.drawString(100, 62, f"GUID: {cert_id}   |   Fecha: {subject.get('issueDate')}   |   Duración: {hours} hrs")
    c.drawString(100, 50, f"Hash Transacción: {transaction_id[:60]}...")
    c.setFont("Helvetica-Oblique", 5.5)
    c.setFillColor(HexColor("#94A3B8"))
    c.drawString(100, 40, "Documento académico oficial infalsificable emitido conforme a la normatividad de la UTCJ. Validación en tiempo real escaneando el QR.")

    c.showPage()
    c.save()
    return buffer.getvalue()


def render_constancia_pdf(certificate: dict[str, Any], settings: Settings, transaction_id: str, palette: dict[str, str] | None = None) -> bytes:
    subject = certificate["credentialSubject"]
    cert_id = subject.get("certificateId", "")
    num = int(hashlib.md5(cert_id.encode('utf-8')).hexdigest()[:6], 16) % 90000 + 10000
    folio_num = f"UTCJ-2026-MC-{num}"

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    page_w, page_h = letter

    # 1. Base Parchment Fill
    c.setFillColor(HexColor("#FAFDFB"))
    c.rect(0, 0, page_w, page_h, stroke=0, fill=1)

    # 2. Guilloche Security Rosette (Watermark)
    _draw_guilloche_watermark_rl(c, page_w / 2, page_h / 2, max_r=200.0)

    # 3. Double Classical Frame
    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(2.2)
    c.rect(26, 26, page_w - 52, page_h - 52)
    
    c.setStrokeColor(HexColor("#114938"))
    c.setLineWidth(0.8)
    c.rect(32, 32, page_w - 64, page_h - 64)

    # Corner Filigree
    _draw_filigree_corners_rl(c, 32, 32, page_w - 32, page_h - 32, size=18.0, color="#B88A3B")

    # 4. University Header with Dual Logos
    utyp_logo = _get_logo_path("utyp-logo.png", settings)
    if utyp_logo:
        try:
            c.drawImage(ImageReader(str(utyp_logo)), 46, page_h - 84, width=54, height=35, mask="auto")
        except Exception:
            pass

    utcj_logo = _get_logo_path("utcj-logo.png", settings)
    if utcj_logo:
        try:
            c.drawImage(ImageReader(str(utcj_logo)), page_w - 100, page_h - 84, width=54, height=35, mask="auto")
        except Exception:
            pass

    # University Header Text
    c.setFont("Helvetica-Bold", 12.5)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(page_w / 2, page_h - 58, "UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ")

    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(HexColor("#146049"))
    c.drawCentredString(page_w / 2, page_h - 70, "ORGANISMO PÚBLICO DESCENTRALIZADO DEL GOBIERNO DEL ESTADO DE CHIHUAHUA")
    c.setFont("Helvetica", 6.5)
    c.setFillColor(HexColor("#475569"))
    c.drawCentredString(page_w / 2, page_h - 80, "SUBSISTEMA DE UNIVERSIDADES TECNOLÓGICAS Y POLITÉCNICAS • CCT: 08MSU0017R • MODALIDAD MIXTA")

    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(1)
    c.line(48, page_h - 90, page_w - 48, page_h - 90)

    # Document Title
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(page_w / 2, page_h - 110, "CONSTANCIA OFICIAL DE ACREDITACIÓN DE COMPETENCIAS")

    c.setFont("Helvetica-Bold", 7.5)
    c.setFillColor(HexColor("#8C6527"))
    c.drawCentredString(page_w / 2, page_h - 122, "DIRECCIÓN DE ADMINISTRACIÓN ESCOLAR Y SECRETARÍA ACADÉMICA")

    # Folio and Date Tag
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(HexColor("#8C6527"))
    c.drawRightString(page_w - 48, page_h - 138, f"FOLIO: {folio_num}")
    c.drawString(48, page_h - 138, f"FECHA DE EMISIÓN: {subject.get('issueDate', '2026-08-28')}")

    # Body Paragraph
    recipient_name = subject.get('name', 'N/A')
    course_name = certificate.get('name', 'N/A')
    raw_skills = subject.get("skills", [])
    skills_list, desc_text, modules_list = resolve_course_enrichment(course_name, raw_skills)

    body_text = (
        f"La Universidad Tecnológica de Ciudad Juárez, Organismo Público Descentralizado del Gobierno del Estado de Chihuahua "
        f"y miembro del Subsistema de Universidades Tecnológicas y Politécnicas, <b>HACE CONSTAR</b> que el (la) C.:<br/><br/>"
        f"<font size='12' color='#114938'><b>{recipient_name}</b></font><br/><br/>"
        f"Ha acreditado satisfactoriamente los requisitos curriculares y demostrado el dominio de las competencias correspondientes al programa universitario de microcredencial:"
    )

    style = getSampleStyleSheet()["Normal"]
    style.fontName = "Helvetica"
    style.fontSize = 8
    style.leading = 12
    style.textColor = HexColor("#1E293B")
    style.alignment = TA_LEFT

    p = Paragraph(body_text, style)
    p.wrapOn(c, page_w - 96, 180)
    p.drawOn(c, 48, page_h - 225)

    # Program Title Highlight Banner
    c.setFillColor(HexColor("#FAFDFB"))
    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(1)
    c.roundRect(48, page_h - 262, page_w - 96, 28, 3, fill=1, stroke=1)

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(HexColor("#146049"))
    c.drawCentredString(page_w / 2, page_h - 253, course_name.upper())

    # Concepts & Registry Table
    tx_str = str(transaction_id or "N/A")
    skills_str = ", ".join(skills_list)

    table_data = [
        ["CONCEPTO REGISTRAL", "DETALLE INSTITUCIONAL Y CRIPTOGRÁFICO"],
        ["Titular Acreditado", recipient_name],
        ["Programa de Microcredencial", course_name],
        ["Carga Horaria Acreditada", f"{subject.get('hours', 120)} Horas Lectivas y Prácticas"],
        ["Competencias Certificadas", skills_str[:90] + ("..." if len(skills_str) > 90 else "")],
        ["Folio de Libro Matriz", folio_num],
        ["Identificador Global (GUID)", cert_id],
        ["Anclaje en Blockchain", f"Ethereum ({tx_str[:32]}...)"],
        ["Estándar y Validación", "W3C Blockcerts v3.2 / Registro Oficial Criptográfico"]
    ]

    t = Table(table_data, colWidths=[150, page_w - 96 - 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (1,0), HexColor("#114938")),
        ('TEXTCOLOR', (0,0), (1,0), HexColor("#FFFFFF")),
        ('FONTNAME', (0,0), (1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 6.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor("#FFFFFF"), HexColor("#F8FAFC")]),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0,1), (0,-1), HexColor("#114938")),
    ]))
    t.wrapOn(c, page_w - 96, 200)
    t.drawOn(c, 48, page_h - 435)

    # Signatures Row with Gold Medallion
    sig_y = page_h - 520
    
    # Left: Rector
    sig_path = settings.data_dir / "rector_signature.png"
    if sig_path.exists():
        try:
            c.drawImage(str(sig_path), 60, sig_y + 4, width=100, height=30, mask="auto")
        except Exception:
            pass
    else:
        c.setFont("Helvetica-Oblique", 9.5)
        c.setFillColor(HexColor("#114938"))
        c.drawCentredString(110, sig_y + 12, "Dr. Óscar F. Ibáñez H.")

    c.setStrokeColor(HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(55, sig_y + 4, 165, sig_y + 4)
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(110, sig_y - 6, "Dr. Óscar Fidencio Ibáñez H.")
    c.setFont("Helvetica", 6)
    c.setFillColor(HexColor("#64748B"))
    c.drawCentredString(110, sig_y - 14, "Rector de la UTCJ")

    # Center: Gold Medallion Seal
    _draw_gold_medallion_rl(c, page_w / 2, sig_y + 4, radius=24.0)

    # Right: Secretario Academico
    c.setFont("Helvetica-Oblique", 9.5)
    c.setFillColor(HexColor("#146049"))
    c.drawCentredString(page_w - 110, sig_y + 12, "M.D.O.H. Hugo García V.")
    c.setStrokeColor(HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(page_w - 165, sig_y + 4, page_w - 55, sig_y + 4)
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(HexColor("#114938"))
    c.drawCentredString(page_w - 110, sig_y - 6, "M.D.O.H. Hugo García Vargas")
    c.setFont("Helvetica", 6)
    c.setFillColor(HexColor("#64748B"))
    c.drawCentredString(page_w - 110, sig_y - 14, "Secretario Académico")

    # Bottom Cryptographic Security Ribbon
    c.setFillColor(HexColor("#FFFFFF"))
    c.setStrokeColor(HexColor("#CBD5E1"))
    c.setLineWidth(0.8)
    c.roundRect(44, 38, page_w - 88, 56, 4, fill=1, stroke=1)
    c.setStrokeColor(HexColor("#B88A3B"))
    c.setLineWidth(1.5)
    c.line(44, 94, page_w - 44, 94)

    qr = qrcode.make(settings.certificate_render_url(cert_id))
    qr_buffer = io.BytesIO()
    qr.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)
    c.drawImage(ImageReader(qr_buffer), 50, 42, width=48, height=48, mask="auto")

    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(HexColor("#114938"))
    c.drawString(106, 80, f"REGISTRO OFICIAL EN BLOCKCHAIN • FOLIO: {folio_num} • W3C BLOCKCERTS v3.2")
    c.setFont("Helvetica", 6)
    c.setFillColor(HexColor("#475569"))
    c.drawString(106, 68, f"GUID: {cert_id}   |   Anclaje: Ethereum ({tx_str[:28]}...)")
    c.drawString(106, 56, f"Titular: {recipient_name}   |   Fecha de Certificación: {subject.get('issueDate')}")
    c.setFont("Helvetica-Oblique", 5)
    c.setFillColor(HexColor("#94A3B8"))
    c.drawString(106, 45, "Esta constancia es un documento oficial con validez nacional. Compruebe autenticidad escaneando el código QR.")

    c.showPage()
    c.save()
    return buffer.getvalue()


def render_social_card_svg(certificate: dict[str, Any], settings: Settings, transaction_id: str, palette: dict[str, str] | None = None) -> str:
    subject = certificate["credentialSubject"]
    cert_id = subject.get("certificateId", "")
    num = int(hashlib.md5(cert_id.encode('utf-8')).hexdigest()[:6], 16) % 90000 + 10000
    folio_num = f"UTCJ-2026-MC-{num}"
    
    qr_uri = _qr_data_uri(settings.certificate_render_url(cert_id), fill_color="#114938")
    
    recipient_name = subject.get('name', 'Estudiante')
    title_name = certificate.get('name', 'Microcredencial Universitaria')
    hours = subject.get('hours', 120)
    issue_date = subject.get('issueDate', '2026-08-28')

    raw_skills = subject.get("skills", [])
    skills_list, _, _ = resolve_course_enrichment(title_name, raw_skills)
    skills_text = "   •   ".join(skills_list[:4])

    utyp_logo_href = _get_logo_base64("utyp-logo.png", settings)
    utcj_logo_href = _get_logo_base64("utcj-logo.png", settings)

    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <defs>
    <!-- Paper Texture Gradient -->
    <linearGradient id="cardParchment" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="50%" stop-color="#FCFDFD"/>
      <stop offset="100%" stop-color="#F6FAF8"/>
    </linearGradient>

    <!-- Metallic Antique Gold Gradient -->
    <linearGradient id="cardGold" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%" stop-color="#8C6527"/>
      <stop offset="30%" stop-color="#B88A3B"/>
      <stop offset="70%" stop-color="#D4AF37"/>
      <stop offset="100%" stop-color="#8C6527"/>
    </linearGradient>
  </defs>

  <!-- Base Card Background -->
  <rect width="1200" height="630" fill="url(#cardParchment)"/>
  
  <!-- Outer Classical Borders -->
  <rect x="20" y="20" width="1160" height="590" rx="8" stroke="url(#cardGold)" stroke-width="3.5" fill="none"/>
  <rect x="28" y="28" width="1144" height="574" rx="4" stroke="#114938" stroke-width="1.2" stroke-opacity="0.6" fill="none"/>
  <rect x="33" y="33" width="1134" height="564" rx="2" stroke="url(#cardGold)" stroke-width="0.6" fill="none"/>

  <!-- Corner Filigree Ornaments -->
  <path d="M33 63 L63 33 M33 78 L78 33 M41 41 L66 41 L41 66 Z" fill="none" stroke="#B88A3B" stroke-width="1.2"/>
  <path d="M1167 63 L1137 33 M1167 78 L1122 33 M1159 41 L1134 41 L1159 66 Z" fill="none" stroke="#B88A3B" stroke-width="1.2"/>
  <path d="M33 567 L63 597 M33 552 L78 597 M41 589 L66 589 L41 564 Z" fill="none" stroke="#B88A3B" stroke-width="1.2"/>
  <path d="M1167 567 L1137 597 M1167 552 L1122 597 M1159 589 L1134 589 L1159 564 Z" fill="none" stroke="#B88A3B" stroke-width="1.2"/>

  <!-- Security Rosette Watermark -->
  <g opacity="0.035" stroke="#114938" stroke-width="1.2" fill="none">
    <circle cx="600" cy="315" r="220"/>
    <circle cx="600" cy="315" r="180"/>
    <circle cx="600" cy="315" r="140"/>
    <circle cx="600" cy="315" r="100"/>
    <path d="M380 315 Q600 95 820 315 Q600 535 380 315Z"/>
  </g>

  <!-- ==================== DUAL LOGOS & HEADER ==================== -->
  {f'<image href="{utyp_logo_href}" x="52" y="44" width="92" height="58" preserveAspectRatio="xMidYMid meet"/>' if utyp_logo_href else ''}
  {f'<image href="{utcj_logo_href}" x="1056" y="44" width="92" height="58" preserveAspectRatio="xMidYMid meet"/>' if utcj_logo_href else ''}

  <text x="600" y="66" fill="#114938" font-family="'Montserrat', serif" font-size="20" font-weight="900" letter-spacing="2.5" text-anchor="middle">
    UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ
  </text>
  
  <text x="600" y="86" fill="#8C6527" font-family="'Montserrat', sans-serif" font-size="10.5" font-weight="800" letter-spacing="2" text-anchor="middle">
    SUBSISTEMA DE UNIVERSIDADES TECNOLÓGICAS Y POLITÉCNICAS • MODALIDAD MIXTA
  </text>

  <!-- Gold Divider -->
  <line x1="200" y1="98" x2="1000" y2="98" stroke="url(#cardGold)" stroke-width="1.2"/>
  <circle cx="600" cy="98" r="3" fill="#B88A3B"/>

  <!-- ==================== BODY CONTENT ==================== -->
  
  <text x="600" y="132" fill="#8C6527" font-family="'Montserrat', sans-serif" font-size="11" font-weight="800" letter-spacing="4" text-anchor="middle">
    OTORGA LA PRESENTE
  </text>

  <text x="600" y="160" fill="#114938" font-family="'Montserrat', serif" font-size="20" font-weight="900" letter-spacing="2" text-anchor="middle">
    MICROCREDENCIAL UNIVERSITARIA
  </text>

  <text x="600" y="192" fill="#64748B" font-family="'Playfair Display', Georgia, serif" font-style="italic" font-size="14" text-anchor="middle">
    A favor de:
  </text>

  <text x="600" y="238" fill="#114938" font-family="'Playfair Display', Georgia, serif" font-size="34" font-weight="700" text-anchor="middle">
    {recipient_name}
  </text>

  <line x1="340" y1="250" x2="860" y2="250" stroke="url(#cardGold)" stroke-width="1.2"/>

  <text x="600" y="278" fill="#475569" font-family="'Montserrat', sans-serif" font-size="11.5" font-weight="500" text-anchor="middle">
    Por haber demostrado el dominio de las competencias profesionales del programa:
  </text>

  <text x="600" y="312" fill="#146049" font-family="'Montserrat', serif" font-size="19" font-weight="900" letter-spacing="0.5" text-anchor="middle">
    {title_name.upper()[:52]}{'...' if len(title_name) > 52 else ''}
  </text>

  <text x="600" y="340" fill="#475569" font-family="'Montserrat', sans-serif" font-size="10" font-weight="600" text-anchor="middle">
    [ {skills_text} ]
  </text>

  <text x="600" y="364" fill="#8C6527" font-family="'Montserrat', sans-serif" font-size="9.5" font-weight="800" letter-spacing="1" text-anchor="middle">
    PROGRAMA ACREDITADO CON {hours} HORAS LECTIVAS • VALIDEZ CURRICULAR OFICIAL
  </text>

  <!-- ==================== SIGNATURES ROW & GOLD MEDALLION ==================== -->
  
  <!-- Left: Rector -->
  <g transform="translate(140, 395)">
    <line x1="0" y1="25" x2="160" y2="25" stroke="#94A3B8" stroke-width="0.8"/>
    <text x="80" y="38" fill="#114938" font-family="'Montserrat', sans-serif" font-size="8.5" font-weight="800" text-anchor="middle">Dr. Óscar Fidencio Ibáñez H.</text>
    <text x="80" y="49" fill="#64748B" font-family="'Montserrat', sans-serif" font-size="7.5" font-weight="600" text-anchor="middle">Rector de la UTCJ</text>
  </g>

  <!-- Center: Gold Medallion -->
  <g transform="translate(570, 390)">
    <circle cx="30" cy="25" r="24" fill="#FAF8F5" stroke="url(#cardGold)" stroke-width="1.8"/>
    <circle cx="30" cy="25" r="20" fill="none" stroke="url(#cardGold)" stroke-width="0.8" stroke-dasharray="2 2"/>
    <text x="30" y="20" font-family="'Montserrat', sans-serif" font-weight="900" font-size="7" fill="#8C6527" text-anchor="middle">UTCJ</text>
    <text x="30" y="28" font-family="'Montserrat', sans-serif" font-weight="800" font-size="4.5" fill="#114938" text-anchor="middle">SELLO OFICIAL</text>
    <text x="30" y="34" font-family="'Montserrat', sans-serif" font-weight="800" font-size="4" fill="#8C6527" text-anchor="middle">RECTORÍA</text>
  </g>

  <!-- Right: Secretario Academico -->
  <g transform="translate(900, 395)">
    <line x1="0" y1="25" x2="160" y2="25" stroke="#94A3B8" stroke-width="0.8"/>
    <text x="80" y="38" fill="#114938" font-family="'Montserrat', sans-serif" font-size="8.5" font-weight="800" text-anchor="middle">M.D.O.H. Hugo García Vargas</text>
    <text x="80" y="49" fill="#64748B" font-family="'Montserrat', sans-serif" font-size="7.5" font-weight="600" text-anchor="middle">Secretario Académico</text>
  </g>

  <!-- ==================== BOTTOM SECURITY RIBBON ==================== -->
  
  <rect x="52" y="475" width="1096" height="105" rx="6" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
  <line x1="52" y1="475" x2="1148" y2="475" stroke="url(#cardGold)" stroke-width="2"/>

  <!-- QR Code -->
  <g transform="translate(70, 487)">
    <rect x="0" y="0" width="80" height="80" rx="4" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="0.8"/>
    <image href="{qr_uri}" x="5" y="5" width="70" height="70"/>
  </g>

  <!-- Cryptographic Details -->
  <text x="170" y="504" fill="#114938" font-family="'Montserrat', sans-serif" font-size="11" font-weight="900" letter-spacing="1">
    REGISTRO OFICIAL DE MICROCREDENCIAL EN BLOCKCHAIN ETHEREUM
  </text>

  <text x="170" y="525" fill="#1E293B" font-family="'Montserrat', sans-serif" font-size="10" font-weight="700">
    FOLIO OFICIAL: <tspan fill="#8C6527">{folio_num}</tspan>   |   EMISIÓN: <tspan fill="#475569">{issue_date}</tspan>   |   ESTÁNDAR: <tspan fill="#146049">W3C Blockcerts v3.2</tspan>
  </text>

  <text x="170" y="546" fill="#475569" font-family="'Montserrat', sans-serif" font-size="9" font-weight="600">
    GUID: <tspan font-family="monospace" fill="#114938">{cert_id}</tspan>   |   TX: <tspan font-family="monospace" fill="#8C6527">{transaction_id[:34]}...</tspan>
  </text>

  <text x="170" y="565" fill="#94A3B8" font-family="'Montserrat', sans-serif" font-size="8.5" font-weight="500">
    Verificación criptográfica en tiempo real escaneando el código QR oficial.
  </text>

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


def render_batch_verification_report_pdf(results: list[dict[str, Any]], summary: dict[str, Any], company_name: str = "Empresa / Reclutador", settings: Settings | None = None) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="BatchReportTitle",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=HexColor("#114938"),
        alignment=TA_CENTER
    )
    meta_style = ParagraphStyle(
        name="BatchReportMeta",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=HexColor("#475569")
    )
    cell_style = ParagraphStyle(
        name="BatchCellText",
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        textColor=HexColor("#1E293B")
    )
    cell_bold = ParagraphStyle(
        name="BatchCellBold",
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=8,
        textColor=HexColor("#114938")
    )
    cell_valid = ParagraphStyle(
        name="BatchCellValid",
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=8,
        textColor=HexColor("#059669")
    )
    cell_revoked = ParagraphStyle(
        name="BatchCellRevoked",
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=8,
        textColor=HexColor("#DC2626")
    )
    cell_notfound = ParagraphStyle(
        name="BatchCellNotFound",
        fontName="Helvetica-Bold",
        fontSize=6.5,
        leading=8,
        textColor=HexColor("#64748B")
    )

    story = []
    
    # 1. Header Table
    header_text = """
    <b>UNIVERSIDAD TECNOLÓGICA DE CIUDAD JUÁREZ</b><br/>
    <font size="7" color="#64748B">SUBSISTEMA DE UNIVERSIDADES TECNOLÓGICAS Y POLITÉCNICAS • CCT: 08MSU0017R</font><br/>
    <font size="9" color="#114938"><b>INFORME OFICIAL DE AUDITORÍA Y VERIFICACIÓN MASIVA DE CREDENCIALES</b></font>
    """
    story.append(Paragraph(header_text, title_style))
    story.append(Spacer(1, 10))
    
    # 2. Resumen Métrico
    total_q = summary.get("total_queries", len(results))
    total_v = summary.get("total_verified", sum(1 for r in results if r.get("status") == "verified"))
    total_r = summary.get("total_revoked", sum(1 for r in results if r.get("status") == "revoked"))
    total_nf = summary.get("total_not_found", sum(1 for r in results if r.get("status") == "not_found"))
    exec_time = summary.get("execution_time_ms", 12)
    gen_at = summary.get("timestamp", "2026-08-31")

    summary_data = [
        [
            Paragraph(f"<b>SOLICITANTE / EMPRESA:</b> {company_name}", meta_style),
            Paragraph(f"<b>FECHA DE AUDITORÍA:</b> {gen_at[:10]}", meta_style),
            Paragraph(f"<b>TIEMPO DE RESPUESTA:</b> {exec_time} ms", meta_style),
            Paragraph("<b>NORMATIVA:</b> W3C Blockcerts v3.2", meta_style)
        ],
        [
            Paragraph(f"<b>TOTAL EVALUADAS:</b> {total_q}", meta_style),
            Paragraph(f"<b>AUTÉNTICAS (VÁLIDAS):</b> <font color='#059669'><b>{total_v}</b></font>", meta_style),
            Paragraph(f"<b>REVOCADAS:</b> <font color='#DC2626'><b>{total_r}</b></font>", meta_style),
            Paragraph(f"<b>NO LOCALIZADAS:</b> <font color='#64748B'><b>{total_nf}</b></font>", meta_style)
        ]
    ]
    t_summary = Table(summary_data, colWidths=[200, 180, 160, 180])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 12))

    # 3. Main Data Table
    table_headers = [
        Paragraph("<b>N°</b>", cell_bold),
        Paragraph("<b>ESTATUS</b>", cell_bold),
        Paragraph("<b>FOLIO REGISTRAL</b>", cell_bold),
        Paragraph("<b>TITULAR / ALUMNO</b>", cell_bold),
        Paragraph("<b>PROGRAMA ACREDITADO</b>", cell_bold),
        Paragraph("<b>HORAS</b>", cell_bold),
        Paragraph("<b>FECHA</b>", cell_bold),
        Paragraph("<b>ANCLAJE BLOCKCHAIN</b>", cell_bold)
    ]
    
    rows = [table_headers]
    for idx, r in enumerate(results, 1):
        st = r.get("status", "not_found")
        if st == "verified":
            st_p = Paragraph("AUTÉNTICA", cell_valid)
        elif st == "revoked":
            st_p = Paragraph("REVOCADA", cell_revoked)
        else:
            st_p = Paragraph("NO LOCALIZADA", cell_notfound)
            
        tx = r.get("transaction_id", "N/A")
        tx_short = f"{tx[:16]}..." if len(tx) > 16 else tx
        
        rows.append([
            Paragraph(str(idx), cell_style),
            st_p,
            Paragraph(r.get("folio", "N/A"), cell_bold),
            Paragraph(r.get("recipient_name", r.get("query", "N/A")), cell_style),
            Paragraph(r.get("course_name", "N/A"), cell_style),
            Paragraph(f"{r.get('hours', '-')} hrs" if r.get('hours') else "-", cell_style),
            Paragraph(r.get("issue_date", "-"), cell_style),
            Paragraph(f"Ethereum ({tx_short})", cell_style)
        ])

    t_data = Table(rows, colWidths=[24, 70, 100, 160, 200, 45, 55, 66])
    t_data.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor("#114938")),
        ('TEXTCOLOR', (0,0), (-1,0), HexColor("#FFFFFF")),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor("#FFFFFF"), HexColor("#F8FAFC")]),
    ]))
    story.append(t_data)
    story.append(Spacer(1, 14))

    # 4. Footer Note
    footer_text = (
        "<b>CERTIFICACIÓN INSTITUCIONAL DE AUDITORÍA:</b> Este reporte contiene el resultado de la verificación criptográfica "
        "en tiempo real de microcredenciales emitidas por la Universidad Tecnológica de Ciudad Juárez, validadas contra la base "
        "registral de Control Escolar y el anclaje inmutable en Blockchain Ethereum bajo el estándar internacional W3C Blockcerts v3.2."
    )
    story.append(Paragraph(footer_text, meta_style))

    doc.build(story)
    return buffer.getvalue()


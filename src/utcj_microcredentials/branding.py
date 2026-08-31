from __future__ import annotations

from typing import Any

# Colorimetría oficial UTP Modalidad Mixta & UTCJ Institucional 2026
PALETTE = {
    "green_lime": "#93C01F",  # Verde Lima Vibrante (Nivel 1)
    "teal": "#3F9089",        # Verde Agua Marina / Teal UTP (Nivel 2)
    "pistachio": "#D1DF8C",   # Verde Pastel / Badges
    "green_deep": "#114938",  # Verde Pino Oscuro / Base Header
    "green": "#146049",       # Verde Esmeralda Oficial UTCJ / UTP (Nivel 3)
    "jade": "#279371",        # Verde Jade / Acciones
    "gold": "#B88A3B",        # Dorado Institucional UTCJ / UTP
    "silver": "#8FA3AD",      # Plata Neutro
    "graphite": "#1F2937",    # Grafito
    "mist": "#E8F1EE",        # Niebla suave
    "white": "#FFFFFF",       # Blanco
}


def get_palette(settings: Any | None = None) -> dict[str, str]:
    if settings is None:
        return PALETTE
    try:
        from .db import get_all_branding
        db_colors = get_all_branding(settings)
        merged = dict(PALETTE)
        for k, v in db_colors.items():
            if k in merged and v.startswith("#"):
                merged[k] = v
        return merged
    except Exception:
        return PALETTE

BADGES = {
    "verificable": ("Microcredencial verificable", PALETTE["green"]),
    "anchored": ("Blockchain anchored", PALETTE["teal"]),
    "academic": ("Credencial academica", PALETTE["graphite"]),
    "portable": ("Portabilidad profesional", PALETTE["gold"]),
}


def badge_svg(label: str, color: str) -> str:
    width = max(220, 20 + len(label) * 9)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="56" viewBox="0 0 {width} 56" fill="none">
  <rect x="2" y="2" width="{width - 4}" height="52" rx="18" fill="{color}" fill-opacity="0.12" stroke="{color}" stroke-width="2"/>
  <circle cx="28" cy="28" r="8" fill="{color}"/>
  <path d="M24 28l3 3 6-7" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="48" y="34" fill="{color}" font-family="Montserrat, Plus Jakarta Sans, Arial, sans-serif" font-size="18" font-weight="700">{label}</text>
</svg>"""


def regenerate_branding_badges(settings: Any) -> None:
    palette = get_palette(settings)
    badges = {
        "verificable": ("Microcredencial verificable", palette.get("green", "#146049")),
        "anchored": ("Blockchain anchored", palette.get("teal", "#3F9089")),
        "academic": ("Credencial academica", palette.get("graphite", "#1F2937")),
        "portable": ("Portabilidad profesional", palette.get("gold", "#B88A3B")),
    }
    branding_dir = settings.branding_dir
    branding_dir.mkdir(parents=True, exist_ok=True)
    for badge_name, (label, color) in badges.items():
        svg_content = badge_svg(label, color)
        badge_path = branding_dir / f"badge-{badge_name}.svg"
        badge_path.write_text(svg_content, encoding="utf-8")

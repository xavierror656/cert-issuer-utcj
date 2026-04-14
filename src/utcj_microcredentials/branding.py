from __future__ import annotations

PALETTE = {
    "green": "#0F6A52",
    "green_deep": "#0A4C3B",
    "teal": "#0F3E4A",
    "graphite": "#1F2937",
    "mist": "#E8F1EE",
    "white": "#FFFFFF",
    "gold": "#B88A3B",
    "silver": "#8FA3AD",
}

BADGES = {
    "verificable": ("Microcredencial verificable", PALETTE["green"]),
    "anchored": ("Blockchain anchored", PALETTE["teal"]),
    "academic": ("Credencial academica", PALETTE["graphite"]),
    "portable": ("Portabilidad profesional", PALETTE["gold"]),
}


def badge_svg(label: str, color: str) -> str:
    width = max(220, 20 + len(label) * 9)
    return f"""<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"56\" viewBox=\"0 0 {width} 56\" fill=\"none\">
  <rect x=\"2\" y=\"2\" width=\"{width - 4}\" height=\"52\" rx=\"18\" fill=\"{color}\" fill-opacity=\"0.12\" stroke=\"{color}\" stroke-width=\"2\"/>
  <circle cx=\"28\" cy=\"28\" r=\"8\" fill=\"{color}\"/>
  <path d=\"M24 28l3 3 6-7\" stroke=\"white\" stroke-width=\"2.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>
  <text x=\"48\" y=\"34\" fill=\"{color}\" font-family=\"Roboto Slab, Georgia, serif\" font-size=\"18\" font-weight=\"700\">{label}</text>
</svg>"""

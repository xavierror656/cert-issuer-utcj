#!/usr/bin/env python3
import sys
import os
import json
from pathlib import Path

# Add src to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from utcj_microcredentials.config import Settings
from utcj_microcredentials.rendering import render_certificate_pdf, render_certificate_svg
from utcj_microcredentials.storage import Storage

def main():
    settings = Settings.load()
    storage = Storage(settings)
    
    print("=== INICIANDO REGENERACIÓN DE CERTIFICADOS ===")
    
    # 1. Borrar PDFs viejos
    pdf_count = 0
    for pdf_file in (settings.public_dir / "certificates").glob("*.pdf"):
        pdf_file.unlink()
        pdf_count += 1
    print(f"[*] Se eliminaron {pdf_count} archivos PDF obsoletos.")
    
    # 2. Buscar todos los certificados emitidos
    certificates = list(settings.issued_dir.glob("*.json"))
    # Filtrar solo los que son {UUID}.json (no *.meta.json o *.request.json)
    cert_files = [f for f in certificates if not f.name.endswith(".request.json") and not f.name.endswith(".meta.json")]
    
    print(f"[*] Encontrados {len(cert_files)} certificados emitidos. Iniciando renderizado...")
    
    regenerated_count = 0
    for cert_file in cert_files:
        cert_id = cert_file.name.removesuffix(".json")
        try:
            # Leer JSON del certificado
            cert_data = json.loads(cert_file.read_text(encoding="utf-8"))
            
            # Leer metadata si existe para obtener transaction_id
            meta_file = settings.issued_dir / f"{cert_id}.meta.json"
            tx_id = "N/A"
            metadata = {}
            if meta_file.exists():
                metadata = json.loads(meta_file.read_text(encoding="utf-8"))
                tx_id = metadata.get("transaction_id", "N/A")
            
            # Leer la petición original para guardar request.json
            request_file = settings.issued_dir / f"{cert_id}.request.json"
            request_json = {}
            if request_file.exists():
                request_json = json.loads(request_file.read_text(encoding="utf-8"))
            
            # Generar nuevos formatos visuales (SVG y PDF)
            chain = metadata.get("chain", settings.default_chain)
            svg_content = render_certificate_svg(cert_data, settings, tx_id)
            pdf_bytes = render_certificate_pdf(cert_data, settings, tx_id, chain=chain)
            
            # Guardar usando Storage (lo cual utiliza escritura atómica de forma nativa)
            storage.save_certificate(cert_id, cert_data, request_json, svg_content, pdf_bytes, metadata)
            print(f"    [✔] PDF y SVG regenerados para ID: {cert_id}")
            regenerated_count += 1
        except Exception as e:
            print(f"    [❌] Error al regenerar {cert_id}: {e}")
            
    print(f"=== REGENERACIÓN COMPLETA: {regenerated_count} certificados actualizados ===")

if __name__ == "__main__":
    main()

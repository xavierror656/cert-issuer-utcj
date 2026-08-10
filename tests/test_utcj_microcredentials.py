import os
import tempfile
import unittest
from pathlib import Path

from utcj_microcredentials.config import Settings
from utcj_microcredentials.branding import PALETTE, get_palette
from utcj_microcredentials.db import init_db, add_certificate, get_certificate, set_branding_color
from utcj_microcredentials.rendering import render_certificate_pdf, render_certificate_svg
from utcj_microcredentials.storage import Storage, _write_atomic


class TestUTCJMicrocredentials(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.temp_dir.name)
        self.settings = Settings.load()
        self.settings.data_dir = self.base_path / "data"
        self.settings.issued_dir = self.base_path / "data" / "issued"
        self.settings.public_dir = self.base_path / "public"
        self.settings.branding_dir = self.base_path / "assets" / "branding"
        self.settings.issuer_logo_path = self.base_path / "logo.png"
        self.settings.ensure_directories()
        init_db(self.settings)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_palette_defaults_and_override(self):
        palette = get_palette(self.settings)
        self.assertEqual(palette["green"], "#0F6A52")
        self.assertEqual(palette["gold"], "#B88A3B")

        # Test dynamic override in SQLite DB
        set_branding_color(self.settings, "green", "#00FF00")
        updated_palette = get_palette(self.settings)
        self.assertEqual(updated_palette["green"], "#00FF00")
        self.assertEqual(updated_palette["gold"], "#B88A3B")

    def test_render_certificate_pdf_and_svg(self):
        mock_cert = {
            "name": "Microcredencial en Inteligencia Artificial Aplicada a Manufactura Inteligente",
            "description": "Acredita competencias avanzadas en aprendizaje automático, analítica industrial y mantenimiento predictivo en entornos industriales de alta exigencia.",
            "credentialSubject": {
                "certificateId": "test-uuid-12345",
                "name": "María José de los Ángeles Hernández y Rodríguez",
                "courseName": "Diplomado de IA Aplicada a Manufactura Inteligente",
                "issueDate": "2026-08-10",
                "hours": 40,
                "grade": "Acreditado",
                "skills": ["Machine Learning industrial", "Python para analítica", "Edge AI", "IoT Industrial"],
            },
        }

        # Test PDF rendering
        pdf_bytes = render_certificate_pdf(
            mock_cert,
            self.settings,
            transaction_id="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            chain="mockchain",
        )
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(len(pdf_bytes) > 0)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

        # Test SVG rendering
        svg_str = render_certificate_svg(
            mock_cert,
            self.settings,
            transaction_id="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        )
        self.assertIsInstance(svg_str, str)
        self.assertIn("<svg", svg_str)
        self.assertIn("María José", svg_str)
        self.assertIn("Dr. Óscar F. Ibáñez Hernández", svg_str)

    def test_atomic_file_write_and_storage(self):
        test_file = self.base_path / "test_atomic.txt"
        _write_atomic(test_file, "contenido atómico de prueba")
        self.assertTrue(test_file.exists())
        self.assertEqual(test_file.read_text(encoding="utf-8"), "contenido atómico de prueba")

        storage = Storage(self.settings)
        mock_cert = {
            "credentialSubject": {"certificateId": "test-cert-id"}
        }
        mock_req = {"recipient": {"given_name": "Test", "family_name": "User"}}
        mock_meta = {"chain": "mockchain", "transaction_id": "0xabc"}
        
        storage.save_certificate(
            "test-cert-id",
            mock_cert,
            mock_req,
            "<svg></svg>",
            b"%PDF-1.4...",
            mock_meta,
        )

        self.assertEqual(storage.get_certificate_svg("test-cert-id"), "<svg></svg>")
        self.assertEqual(storage.get_certificate_pdf("test-cert-id"), b"%PDF-1.4...")
        self.assertEqual(storage.get_certificate("test-cert-id")["credentialSubject"]["certificateId"], "test-cert-id")

    def test_render_social_card_svg(self):
        from utcj_microcredentials.rendering import render_social_card_svg
        mock_cert = {
            "name": "Microcredencial en Inteligencia Artificial Aplicada",
            "description": "Certificado de prueba para tarjetas de redes sociales.",
            "credentialSubject": {
                "certificateId": "test-card-123",
                "name": "Juan Perez",
                "issueDate": "2026-08-10",
                "hours": 40
            }
        }
        svg_card = render_social_card_svg(mock_cert, self.settings, "0x1234567890")
        self.assertIn("<svg", svg_card)
        self.assertIn("1200", svg_card)
        self.assertIn("630", svg_card)
    def test_offline_bundle_and_embed_code(self):
        from utcj_microcredentials.app import download_offline_bundle, get_embed_code, storage as app_storage
        mock_cert = {
            "name": "Curso de Prueba",
            "credentialSubject": {"certificateId": "test-embed-id", "name": "Prueba User"}
        }
        app_storage.save_certificate(
            "test-embed-id",
            mock_cert,
            {},
            "<svg></svg>",
            b"%PDF-1.4...",
            {"chain": "test"}
        )

        res_embed = get_embed_code("test-embed-id")
        self.assertEqual(res_embed.status_code, 200)
        self.assertIn("iframe", res_embed.body.decode())

        res_zip = download_offline_bundle("test-embed-id")
        self.assertEqual(res_zip.status_code, 200)
        self.assertEqual(res_zip.media_type, "application/zip")

    def test_constancia_pdf_and_folio_search(self):
        from utcj_microcredentials.app import get_constancia_pdf, storage as app_storage
        from utcj_microcredentials.db import add_certificate, find_certificate_by_id_or_folio_or_name
        import hashlib

        cert_id = "test-constancia-id-99"
        mock_cert = {
            "name": "Microcredencial en Ciberseguridad",
            "credentialSubject": {
                "certificateId": cert_id,
                "name": "Juan Perez Ramos",
                "courseName": "Seguridad Informática",
                "hours": 60,
                "issueDate": "2026-08-10",
                "skills": ["RBAC", "Penetration Testing"]
            }
        }
        app_storage.save_certificate(cert_id, mock_cert, {}, "<svg></svg>", b"%PDF-1.4...", {"chain": "ethereum_mainnet"})
        add_certificate(self.settings, cert_id, "Juan Perez Ramos", "Microcredencial en Ciberseguridad", "Seguridad Informática", 60, "100/100", "ethereum_mainnet", "0xabc123", "2026-08-10", "admin", {}, {})

        res = get_constancia_pdf(cert_id)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.media_type, "application/pdf")
        self.assertTrue(res.body.startswith(b"%PDF"))

        # Test Folio Search Resolution
        num = int(hashlib.md5(cert_id.encode('utf-8')).hexdigest()[:6], 16) % 90000 + 10000
        folio_str = f"UTCJ-2026-MC-{num}"

        found_by_folio = find_certificate_by_id_or_folio_or_name(self.settings, folio_str)
        self.assertIsNotNone(found_by_folio)
        self.assertEqual(found_by_folio["id"], cert_id)

        found_by_name = find_certificate_by_id_or_folio_or_name(self.settings, "Juan Perez")
        self.assertIsNotNone(found_by_name)
        self.assertEqual(found_by_name["id"], cert_id)


if __name__ == "__main__":
    unittest.main()

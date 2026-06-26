from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_FILE_NAME = "certificates.db"


def is_postgres() -> bool:
    return bool(DATABASE_URL)


def get_connection(settings: Any) -> Any:
    if is_postgres():
        import psycopg2
        return psycopg2.connect(DATABASE_URL)
    else:
        db_path = settings.data_dir / DATABASE_FILE_NAME
        conn = sqlite3.connect(str(db_path))
        conn.row_factory = sqlite3.Row
        return conn


def execute_write(settings: Any, query: str, params: tuple = ()) -> None:
    conn = get_connection(settings)
    try:
        cursor = conn.cursor()
        if is_postgres():
            query = query.replace("?", "%s")
        cursor.execute(query, params)
        conn.commit()
    finally:
        conn.close()


def execute_read(settings: Any, query: str, params: tuple = ()) -> list[dict[str, Any]]:
    conn = get_connection(settings)
    try:
        if is_postgres():
            from psycopg2.extras import RealDictCursor
            query = query.replace("?", "%s")
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        else:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
    finally:
        conn.close()


def init_db(settings: Any) -> None:
    # 1. Create certificates table
    execute_write(
        settings,
        """
        CREATE TABLE IF NOT EXISTS certificates (
            id TEXT PRIMARY KEY,
            recipient_name TEXT,
            credential_title TEXT,
            course_name TEXT,
            hours INTEGER,
            grade TEXT,
            chain TEXT,
            transaction_id TEXT,
            issued_at TEXT,
            issued_by TEXT,
            revoked INTEGER DEFAULT 0,
            request_json TEXT,
            metadata_json TEXT
        )
    """,
    )
    
    # 2. Create indices
    if is_postgres():
        # PostgreSQL syntax for conditional index creation is similar
        execute_write(settings, "CREATE INDEX IF NOT EXISTS idx_recipient ON certificates(recipient_name)")
        execute_write(settings, "CREATE INDEX IF NOT EXISTS idx_revoked ON certificates(revoked)")
    else:
        execute_write(settings, "CREATE INDEX IF NOT EXISTS idx_recipient ON certificates(recipient_name)")
        execute_write(settings, "CREATE INDEX IF NOT EXISTS idx_revoked ON certificates(revoked)")

    # 3. Create branding table
    execute_write(
        settings,
        """
        CREATE TABLE IF NOT EXISTS branding (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """,
    )

    # 4. Create revocations table
    execute_write(
        settings,
        """
        CREATE TABLE IF NOT EXISTS revocations (
            id TEXT PRIMARY KEY,
            revoked_at TEXT,
            reason TEXT
        )
    """,
    )

    # 4b. Create api_keys table
    execute_write(
        settings,
        """
        CREATE TABLE IF NOT EXISTS api_keys (
            token TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL
        )
    """,
    )

    # 4c. Create audit_logs table
    if is_postgres():
        execute_write(
            settings,
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                timestamp TEXT NOT NULL,
                action TEXT NOT NULL,
                username TEXT NOT NULL,
                ip_address TEXT,
                details TEXT
            )
        """,
        )
    else:
        execute_write(
            settings,
            """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                action TEXT NOT NULL,
                username TEXT NOT NULL,
                ip_address TEXT,
                details TEXT
            )
        """,
        )

    # 4d. Run migrations for api_keys prefix/hashing if needed
    try:
        if is_postgres():
            rows = execute_read(settings, "SELECT column_name FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'prefix'")
            has_prefix = len(rows) > 0
        else:
            rows = execute_read(settings, "PRAGMA table_info(api_keys)")
            has_prefix = any(r["name"] == "prefix" for r in rows)
            
        if not has_prefix:
            execute_write(settings, "ALTER TABLE api_keys ADD COLUMN prefix TEXT")
            # Migrate existing plaintext tokens to hash
            keys = execute_read(settings, "SELECT token, name, role, created_at, created_by FROM api_keys")
            for k in keys:
                raw_token = k["token"]
                if not raw_token.startswith("sha256_") and len(raw_token) < 64:
                    import hashlib
                    hashed = hashlib.sha256(raw_token.encode()).hexdigest()
                    pref = "••••" + raw_token[-4:] if len(raw_token) >= 4 else "••••"
                    execute_write(settings, "DELETE FROM api_keys WHERE token = ?", (raw_token,))
                    execute_write(settings, "INSERT INTO api_keys (token, prefix, name, role, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                                  (hashed, pref, k["name"], k["role"], k["created_at"], k["created_by"]))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Migration error for api_keys: {e}")

    # 4f. Run migrations for blockchain_verified and verification_cached_at if needed
    try:
        if is_postgres():
            rows = execute_read(settings, "SELECT column_name FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'blockchain_verified'")
            has_verified = len(rows) > 0
        else:
            rows = execute_read(settings, "PRAGMA table_info(certificates)")
            has_verified = any(r["name"] == "blockchain_verified" for r in rows)
            
        if not has_verified:
            execute_write(settings, "ALTER TABLE certificates ADD COLUMN blockchain_verified INTEGER DEFAULT 0")
            execute_write(settings, "ALTER TABLE certificates ADD COLUMN verification_cached_at TEXT")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Migration error for blockchain_verified: {e}")

    # 4g. Run migrations for ipfs_cid if needed
    try:
        if is_postgres():
            rows = execute_read(settings, "SELECT column_name FROM information_schema.columns WHERE table_name = 'certificates' AND column_name = 'ipfs_cid'")
            has_ipfs = len(rows) > 0
        else:
            rows = execute_read(settings, "PRAGMA table_info(certificates)")
            has_ipfs = any(r["name"] == "ipfs_cid" for r in rows)
            
        if not has_ipfs:
            execute_write(settings, "ALTER TABLE certificates ADD COLUMN ipfs_cid TEXT")
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Migration error for ipfs_cid: {e}")

    # 4e. Migrate data from SQLite to PostgreSQL if running PostgreSQL
    try:
        migrate_data_sqlite_to_postgres(settings)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error during SQLite to PostgreSQL migration: {e}")

    # 5. Import existing certificates if database is empty
    count_rows = execute_read(settings, "SELECT COUNT(*) as count FROM certificates")
    if count_rows and count_rows[0]["count"] == 0:
        import_existing_certificates(settings)


def migrate_data_sqlite_to_postgres(settings: Any) -> None:
    if not is_postgres():
        return

    sqlite_db_path = settings.data_dir / DATABASE_FILE_NAME
    if not sqlite_db_path.exists():
        return

    import logging
    import sqlite3
    logger = logging.getLogger(__name__)
    logger.info("Iniciando migración de SQLite a PostgreSQL...")

    try:
        sqlite_conn = sqlite3.connect(str(sqlite_db_path))
        sqlite_conn.row_factory = sqlite3.Row
        sqlite_cursor = sqlite_conn.cursor()

        # 1. Migrate certificates
        try:
            sqlite_cursor.execute("SELECT * FROM certificates")
            sqlite_certs = sqlite_cursor.fetchall()
            for r in sqlite_certs:
                # Check if exists in pg
                existing = execute_read(settings, "SELECT id FROM certificates WHERE id = ?", (r["id"],))
                if not existing:
                    logger.info(f"Migrando certificado {r['id']} a PostgreSQL...")
                    execute_write(
                        settings,
                        """
                        INSERT INTO certificates (id, recipient_name, credential_title, course_name, hours, grade, chain, transaction_id, issued_at, issued_by, revoked, request_json, metadata_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            r["id"],
                            r["recipient_name"],
                            r["credential_title"],
                            r["course_name"],
                            r["hours"],
                            r["grade"],
                            r["chain"],
                            r["transaction_id"],
                            r["issued_at"],
                            r["issued_by"],
                            r["revoked"],
                            r["request_json"],
                            r["metadata_json"],
                        ),
                    )
        except Exception as e:
            logger.error(f"Error migrando tabla certificates: {e}")

        # 2. Migrate branding
        try:
            sqlite_cursor.execute("SELECT * FROM branding")
            sqlite_branding = sqlite_cursor.fetchall()
            for r in sqlite_branding:
                existing = execute_read(settings, "SELECT key FROM branding WHERE key = ?", (r["key"],))
                if not existing:
                    logger.info(f"Migrando branding {r['key']} = {r['value']} a PostgreSQL...")
                    execute_write(
                        settings,
                        "INSERT INTO branding (key, value) VALUES (?, ?)",
                        (r["key"], r["value"]),
                    )
        except Exception as e:
            logger.error(f"Error migrando tabla branding: {e}")

        # 3. Migrate revocations
        try:
            sqlite_cursor.execute("SELECT * FROM revocations")
            sqlite_rev = sqlite_cursor.fetchall()
            for r in sqlite_rev:
                existing = execute_read(settings, "SELECT id FROM revocations WHERE id = ?", (r["id"],))
                if not existing:
                    logger.info(f"Migrando revocación {r['id']} a PostgreSQL...")
                    execute_write(
                        settings,
                        "INSERT INTO revocations (id, revoked_at, reason) VALUES (?, ?, ?)",
                        (r["id"], r["revoked_at"], r["reason"]),
                    )
        except Exception as e:
            logger.error(f"Error migrando tabla revocations: {e}")

        # 4. Migrate api_keys (if exists in SQLite)
        try:
            sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys'")
            if sqlite_cursor.fetchone():
                sqlite_cursor.execute("SELECT * FROM api_keys")
                sqlite_keys = sqlite_cursor.fetchall()
                for r in sqlite_keys:
                    existing = execute_read(settings, "SELECT token FROM api_keys WHERE token = ?", (r["token"],))
                    if not existing:
                        logger.info(f"Migrando API Key {r['name']} a PostgreSQL...")
                        prefix_val = r["prefix"] if "prefix" in r.keys() else None
                        execute_write(
                            settings,
                            "INSERT INTO api_keys (token, prefix, name, role, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
                            (r["token"], prefix_val, r["name"], r["role"], r["created_at"], r["created_by"]),
                        )
        except Exception as e:
            logger.error(f"Error migrando tabla api_keys: {e}")

        # 5. Migrate audit_logs (if exists in SQLite)
        try:
            sqlite_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'")
            if sqlite_cursor.fetchone():
                sqlite_cursor.execute("SELECT * FROM audit_logs")
                sqlite_logs = sqlite_cursor.fetchall()
                for r in sqlite_logs:
                    # check unique log by timestamp and action
                    existing = execute_read(settings, "SELECT id FROM audit_logs WHERE timestamp = ? AND action = ?", (r["timestamp"], r["action"]))
                    if not existing:
                        logger.info(f"Migrando audit log {r['action']} a PostgreSQL...")
                        execute_write(
                            settings,
                            "INSERT INTO audit_logs (timestamp, action, username, ip_address, details) VALUES (?, ?, ?, ?, ?)",
                            (r["timestamp"], r["action"], r["username"], r["ip_address"], r["details"]),
                        )
        except Exception as e:
            logger.error(f"Error migrando tabla audit_logs: {e}")

        sqlite_conn.close()
        logger.info("Migración de SQLite a PostgreSQL completada con éxito.")

        # Rename SQLite file to prevent running migration again
        try:
            migrated_path = sqlite_db_path.with_name("certificates.db.migrated")
            if migrated_path.exists():
                os.remove(migrated_path)
            os.rename(sqlite_db_path, migrated_path)
            logger.info(f"Base de datos SQLite renombrada a {migrated_path.name}")
        except Exception as e:
            logger.error(f"Error al renombrar archivo SQLite: {e}")

    except Exception as e:
        logger.error(f"Error crítico durante la migración de la base de datos: {e}")


def import_existing_certificates(settings: Any) -> None:
    issued_dir = settings.issued_dir
    if not issued_dir.exists():
        return

    meta_files = list(issued_dir.glob("*.meta.json"))
    for meta_file in meta_files:
        cert_id = meta_file.name.removesuffix(".meta.json")
        request_file = issued_dir / f"{cert_id}.request.json"
        cert_file = issued_dir / f"{cert_id}.json"

        if not request_file.exists() or not cert_file.exists():
            continue

        try:
            meta_data = json.loads(meta_file.read_text(encoding="utf-8"))
            req_data = json.loads(request_file.read_text(encoding="utf-8"))

            rec = req_data.get("recipient", {})
            recipient_name = f"{rec.get('given_name', '')} {rec.get('family_name', '')}".strip() or "N/A"
            credential_title = req_data.get("credential", {}).get("title", "N/A")
            course_name = req_data.get("credential", {}).get("course_name", "N/A")
            hours = req_data.get("credential", {}).get("hours", 0)
            grade = req_data.get("credential", {}).get("grade", "N/A")

            add_certificate(
                settings=settings,
                cert_id=cert_id,
                recipient_name=recipient_name,
                credential_title=credential_title,
                course_name=course_name,
                hours=hours,
                grade=grade,
                chain=meta_data.get("chain"),
                transaction_id=meta_data.get("transaction_id"),
                issued_at=meta_data.get("issued_at"),
                issued_by=meta_data.get("issued_by", "system"),
                request_data=req_data,
                metadata=meta_data,
            )
        except Exception:
            continue


def add_certificate(
    settings: Any,
    cert_id: str,
    recipient_name: str,
    credential_title: str,
    course_name: str,
    hours: int,
    grade: str,
    chain: str,
    transaction_id: str,
    issued_at: str,
    issued_by: str,
    request_data: dict[str, Any],
    metadata: dict[str, Any],
    ipfs_cid: str | None = None,
) -> None:
    execute_write(
        settings,
        """
        INSERT INTO certificates (
            id, recipient_name, credential_title, course_name, hours, grade,
            chain, transaction_id, issued_at, issued_by, revoked, request_json, metadata_json, ipfs_cid
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
            recipient_name = EXCLUDED.recipient_name,
            credential_title = EXCLUDED.credential_title,
            course_name = EXCLUDED.course_name,
            hours = EXCLUDED.hours,
            grade = EXCLUDED.grade,
            chain = EXCLUDED.chain,
            transaction_id = EXCLUDED.transaction_id,
            issued_at = EXCLUDED.issued_at,
            issued_by = EXCLUDED.issued_by,
            revoked = EXCLUDED.revoked,
            request_json = EXCLUDED.request_json,
            metadata_json = EXCLUDED.metadata_json,
            ipfs_cid = EXCLUDED.ipfs_cid
    """,
        (
            cert_id,
            recipient_name,
            credential_title,
            course_name,
            hours,
            grade,
            chain,
            transaction_id,
            issued_at,
            issued_by,
            json.dumps(request_data, ensure_ascii=False),
            json.dumps(metadata, ensure_ascii=False),
            ipfs_cid,
        ),
    )


def update_certificate_ipfs_cid(settings: Any, cert_id: str, ipfs_cid: str) -> None:
    execute_write(
        settings,
        "UPDATE certificates SET ipfs_cid = ? WHERE id = ?",
        (ipfs_cid, cert_id)
    )



def get_certificate(settings: Any, cert_id: str) -> dict[str, Any] | None:
    rows = execute_read(settings, "SELECT * FROM certificates WHERE id = ?", (cert_id,))
    if rows:
        return rows[0]
    return None


def list_certificates(
    settings: Any, query_str: str | None = None, limit: int = 100, show_revoked: bool = True
) -> list[dict[str, Any]]:
    where_clauses = []
    params = []
    
    if not show_revoked:
        where_clauses.append("revoked = 0")
        
    if query_str:
        where_clauses.append("(recipient_name LIKE ? OR credential_title LIKE ? OR course_name LIKE ?)")
        search_pattern = f"%{query_str}%"
        params.extend([search_pattern, search_pattern, search_pattern])
        
    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)
        
    query = f"""
        SELECT id, recipient_name, credential_title, course_name, hours, grade,
               chain, transaction_id, issued_at, issued_by, revoked
        FROM certificates
        {where_sql}
        ORDER BY issued_at DESC
        LIMIT ?
    """
    
    return execute_read(settings, query, (*params, limit))


def revoke_certificate(settings: Any, cert_id: str, reason: str, revoked_at: str) -> bool:
    # Check if exists
    rows = execute_read(settings, "SELECT 1 FROM certificates WHERE id = ?", (cert_id,))
    if not rows:
        return False
        
    execute_write(settings, "UPDATE certificates SET revoked = 1 WHERE id = ?", (cert_id,))
    execute_write(
        settings,
        """
        INSERT INTO revocations (id, revoked_at, reason) VALUES (?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
            revoked_at = EXCLUDED.revoked_at,
            reason = EXCLUDED.reason
    """,
        (cert_id, revoked_at, reason),
    )
    return True


def update_certificate_verification_cache(settings: Any, certificate_id: str, verified: int, cached_at: str) -> None:
    execute_write(
        settings,
        "UPDATE certificates SET blockchain_verified = ?, verification_cached_at = ? WHERE id = ?",
        (verified, cached_at, certificate_id)
    )


def get_revocation_list(settings: Any) -> list[dict[str, Any]]:
    return execute_read(settings, "SELECT id, revoked_at, reason FROM revocations ORDER BY revoked_at DESC")


def get_all_branding(settings: Any) -> dict[str, str]:
    rows = execute_read(settings, "SELECT key, value FROM branding")
    return {r["key"]: r["value"] for r in rows}


def set_branding_color(settings: Any, key: str, value: str) -> None:
    execute_write(
        settings,
        """
        INSERT INTO branding (key, value) VALUES (?, ?)
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value
    """,
        (key, value),
    )


def add_api_key(settings: Any, token: str, name: str, role: str, created_by: str) -> None:
    from datetime import datetime, timezone
    import hashlib
    created_at = datetime.now(timezone.utc).isoformat()
    hashed = hashlib.sha256(token.encode()).hexdigest()
    pref = "••••" + token[-4:] if len(token) >= 4 else "••••"
    execute_write(
        settings,
        "INSERT INTO api_keys (token, prefix, name, role, created_at, created_by) VALUES (?, ?, ?, ?, ?, ?)",
        (hashed, pref, name, role, created_at, created_by)
    )


def list_api_keys(settings: Any) -> list[dict[str, Any]]:
    return execute_read(settings, "SELECT token, prefix, name, role, created_at, created_by FROM api_keys ORDER BY created_at DESC")


def revoke_api_key(settings: Any, token: str) -> None:
    if token.startswith("utcj_key_"):
        import hashlib
        token = hashlib.sha256(token.encode()).hexdigest()
    execute_write(settings, "DELETE FROM api_keys WHERE token = ?", (token,))


def get_api_key(settings: Any, token: str) -> dict[str, Any] | None:
    import hashlib
    hashed = hashlib.sha256(token.encode()).hexdigest()
    rows = execute_read(settings, "SELECT token, prefix, name, role, created_at, created_by FROM api_keys WHERE token = ?", (hashed,))
    return rows[0] if rows else None


def add_audit_log(settings: Any, action: str, username: str, ip_address: str | None, details: str | None) -> None:
    from datetime import datetime, timezone
    timestamp = datetime.now(timezone.utc).isoformat()
    execute_write(
        settings,
        "INSERT INTO audit_logs (timestamp, action, username, ip_address, details) VALUES (?, ?, ?, ?, ?)",
        (timestamp, action, username, ip_address, details)
    )


def list_audit_logs(settings: Any, limit: int = 100) -> list[dict[str, Any]]:
    return execute_read(settings, "SELECT id, timestamp, action, username, ip_address, details FROM audit_logs ORDER BY timestamp DESC LIMIT ?", (limit,))

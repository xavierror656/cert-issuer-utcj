#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import sys

API_URL = "http://localhost:8000"
API_KEY = "issuersecretkey"

def main():
    print("=== PREPARANDO EMISIÓN DE LOTE DE 50 CERTIFICADOS EN ETHEREUM MAINNET ===")
    
    certificates = []
    for i in range(1, 51):
        cert = {
            "recipient": {
                "given_name": f"Estudiante Lote {i}",
                "family_name": "Prueba Real",
                "email": f"estudiante.lote{i}@ejemplo.utcj.edu.mx"
            },
            "credential": {
                "title": "Microcredencial en Ciberseguridad y Aislamiento de Procesos",
                "description": "Acredita competencias avanzadas en hardening de entornos, control de acceso basado en roles (RBAC) y emision de credenciales criptograficas en red principal.",
                "issue_date": "2026-06-25",
                "course_name": "Diplomado en Hardening y RBAC",
                "hours": 32,
                "skills": [
                    "Ciberseguridad",
                    "Hardening",
                    "Ethereum Mainnet",
                    "Blockcerts"
                ],
                "grade": "Sobresaliente",
                "evidence_url": "https://example.org/evidence/security-rbac"
            },
            "issuer": {
                "name": "Universidad Tecnologica de Ciudad Juarez",
                "id": "utcj"
            },
            "chain": "ethereum_mainnet"
        }
        certificates.append(cert)
        
    payload = {
        "certificates": certificates,
        "chain": "ethereum_mainnet"
    }
    
    print(f"[*] Enviando solicitud al endpoint /issue-batch con {len(certificates)} certificados...")
    req = urllib.request.Request(
        f"{API_URL}/issue-batch",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY
        },
        method="POST"
    )
    
    try:
        # We increase timeout because anchoring to Ethereum Mainnet might take up to 2 minutes
        with urllib.request.urlopen(req, timeout=180) as response:
            status = response.status
            body = response.read().decode("utf-8")
            print(f"[✔] Respuesta exitosa (HTTP {status})")
            
            res_data = json.loads(body)
            print("\n=== DETALLES DE LA EMISIÓN ===")
            print(f"Estado de la emisión: {res_data.get('status')}")
            print(f"Blockchain utilizada: {res_data.get('chain')}")
            print(f"ID de Transacción (Tx Hash): {res_data.get('transaction_id')}")
            print(f"Enlace en Etherscan: https://etherscan.io/tx/{res_data.get('transaction_id')}")
            print(f"Total de certificados emitidos: {len(res_data.get('items', []))}")
            print("==============================")
            
    except urllib.error.HTTPError as e:
        print(f"[❌] Error HTTP {e.code}:")
        print(e.read().decode("utf-8"))
        sys.exit(1)
    except Exception as e:
        print(f"[❌] Error de conexión: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()

# API HTTP

## GET /health

Devuelve estado del servicio, version, entorno, cadena configurada y timestamp.

## GET /issuer-profile

Devuelve el perfil publico del emisor compatible con Blockcerts.

## GET /public-keys

Devuelve `publicKey`, `verificationMethod` y `assertionMethod` del emisor.

## GET /revocation-list

Devuelve una lista de revocacion basica compatible con el perfil del emisor.

## POST /issue

### Request

```json
{
  "recipient": {
    "given_name": "Javier Alejandro",
    "family_name": "Flores Flores",
    "email": "javier.alejandro.flores@ejemplo.utcj.mx"
  },
  "credential": {
    "title": "Microcredencial en Vision por Computadora Industrial",
    "description": "Acredita competencias en deteccion de objetos, inspeccion visual automatizada y despliegue edge AI en entornos industriales.",
    "issue_date": "2026-04-15",
    "course_name": "Diplomado de IA Aplicada a Manufactura Inteligente",
    "hours": 40,
    "skills": [
      "Computer Vision",
      "YOLO",
      "Deep Learning",
      "Edge AI"
    ],
    "grade": "Acreditado",
    "evidence_url": "https://example.org/evidence/demo"
  },
  "issuer": {
    "name": "Universidad Tecnologica de Ciudad Juarez",
    "id": "utcj"
  },
  "chain": "mockchain"
}
```

### Response

```json
{
  "status": "issued",
  "id": "b6f2...",
  "chain": "mockchain",
  "transaction_id": "This has not been issued on a blockchain and is for testing only",
  "certificate_url": "http://localhost:8000/certificate/b6f2...",
  "visual_svg_url": "http://localhost:8000/certificate/b6f2.../visual.svg",
  "pdf_url": "http://localhost:8000/certificate/b6f2.../pdf",
  "issuer_profile_url": "http://localhost:8000/issuer-profile",
  "issued_json": {}
}
```

## GET /certificate/{id}

Recupera el JSON emitido.

## GET /certificate/{id}/visual.svg

Devuelve la version visual SVG del certificado.

## GET /certificate/{id}/pdf

Devuelve la version PDF de impresion.

## Errores

- `404`: certificado o recurso no encontrado
- `422`: error de validacion o fallo de emision/anclaje

## Logs

- cada emision exitosa deja traza con `certificate_id`
- los fallos de emision registran stacktrace en servidor

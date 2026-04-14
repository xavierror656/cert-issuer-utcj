# UTCJ Microcredenciales Verificables

Plataforma MVP para emision institucional de microcredenciales verificables de la Universidad Tecnologica de Ciudad Juarez (UTCJ), construida sobre `cert-issuer` de Blockcerts y adaptada a un flujo HTTP reproducible.

## Que resuelve

- recibe solicitudes HTTP `POST /issue` con datos del alumno y la microcredencial
- genera un `VerifiableCredential` compatible con Blockcerts v3
- firma y ancla la credencial mediante el flujo vigente de `cert-issuer`
- publica perfil del emisor, llaves publicas y recursos verificables
- devuelve el JSON final y representaciones visuales SVG/PDF
- deja documentado como pasar de entorno de prueba a produccion institucional

## Relacion con UTCJ

La solucion esta preparada como plataforma de microcredenciales verificables UTCJ para cursos, diplomados, bootcamps, hackathons, certificaciones internas y credenciales academicas verificables con trazabilidad criptografica y validez verificable por terceros.

## Arquitectura base

- `cert_issuer/`: libreria upstream de Blockcerts usada para el flujo de Merkle proof, firma y anclaje
- `src/utcj_microcredentials/`: API HTTP, generacion de payloads, branding, almacenamiento y renderizado
- `docs/`: arquitectura, despliegue, API, branding, validacion y endurecimiento productivo
- `assets/`: logo UTCJ, badges, plantillas y certificados visuales
- `examples/`: requests y certificados emitidos de ejemplo

## Modo de operacion

- `mockchain`: emision offline reproducible para desarrollo y demos locales
- `ethereum_sepolia`: modo recomendado para demo publica verificable con costo bajo y mejor ergonomia operativa que Bitcoin testnet
- `https` en produccion: obligatorio para publicar issuer profile, certificados y recursos consumidos por verificadores externos

## Despliegue actual

- dominio publico: `https://utcjmicro.javierflores.software`
- issuer profile publico: `https://utcjmicro.javierflores.software/issuer-profile`
- healthcheck publico: `https://utcjmicro.javierflores.software/health`
- API servida con `uvicorn` detras de `Caddy` con `HTTPS` automatico
- servicio persistente Linux: `utcj-microcredentials.service`

## Probar la API publica

Prueba rapida:

```bash
curl https://utcjmicro.javierflores.software/health
curl https://utcjmicro.javierflores.software/issuer-profile
```

Emitir una credencial publica en `Sepolia`:

```bash
curl -X POST https://utcjmicro.javierflores.software/issue \
  -H "Content-Type: application/json" \
  -d @examples/issue-request-vision-public.json
```

Guia operativa paso a paso: `docs/how-to-test-api.md`.

## Arranque rapido local

1. Instala dependencias:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-app.txt
cp .env.example .env
```

2. Genera ejemplos y assets:

```bash
PYTHONPATH=src python -m utcj_microcredentials.scripts.generate_samples
```

3. Levanta la API:

```bash
PYTHONPATH=src uvicorn utcj_microcredentials.app:app --host 0.0.0.0 --port 8000 --reload
```

4. Prueba salud del servicio:

```bash
curl http://localhost:8000/health
```

## Emision de una microcredencial

```bash
curl -X POST http://localhost:8000/issue \
  -H "Content-Type: application/json" \
  -d @examples/issue-request.json
```

Respuesta esperada:

- `status=issued`
- `id` del certificado
- `transaction_id`
- `certificate_url`
- `issued_json`

## Endpoints principales

- `GET /health`
- `GET /issuer-profile`
- `GET /public-keys`
- `GET /revocation-list`
- `POST /issue`
- `GET /certificate/{id}`
- `GET /certificate/{id}/visual.svg`
- `GET /certificate/{id}/pdf`

## Validacion en Blockcerts.org

Para validar en el verificador publico:

1. configura `DEFAULT_CHAIN=ethereum_sepolia`
2. define `PUBLIC_BASE_URL` sobre `https`
3. carga `ISSUER_PRIVATE_KEY_FILE` con llave Sepolia financiada
4. publica el servicio y emite una credencial real
5. abre `https://www.blockcerts.org/`, usa el verificador y carga el JSON emitido o su URL publica

Guia detallada: `docs/validation-blockcerts.md`.

Ejemplo de URL publica valida para probar:

- `https://utcjmicro.javierflores.software/certificate/b44191c3-bbee-41cd-9edf-b474c3c3ffbe`

## Docker

```bash
cp .env.example .env
docker compose up --build
```

## Archivos clave

- `src/utcj_microcredentials/app.py`
- `src/utcj_microcredentials/blockcerts.py`
- `src/utcj_microcredentials/rendering.py`
- `docs/architecture.md`
- `docs/deployment.md`
- `docs/api.md`
- `docs/branding.md`
- `docs/utcj.md`

## Transparencia tecnica

- el `README` upstream de `cert-issuer` recomienda un servidor separado (`cert-issuer-vc-api`), pero esa referencia ya no responde; por eso este proyecto implementa una capa HTTP propia sobre la libreria vigente
- la API web historica dentro de `cert-issuer` esta desactualizada; este proyecto la reemplaza por FastAPI manteniendo compatibilidad con el flujo Blockcerts v3
- la emision local con `mockchain` es funcional para demostracion, pero no sirve para validacion publica en Blockcerts.org

## Documentacion adicional

- `docs/architecture.md`
- `docs/deployment.md`
- `docs/api.md`
- `docs/validation-blockcerts.md`
- `docs/branding.md`
- `docs/production-hardening.md`
- `docs/how-to-test-api.md`
- `docs/utcj.md`

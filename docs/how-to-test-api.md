# Como probar el API UTCJ Microcredenciales

Esta guia explica como probar la API publica de microcredenciales verificables UTCJ publicada en:

`https://utcjmicro.javierflores.software`

## 1. Verificar que el servicio esta vivo

```bash
curl https://utcjmicro.javierflores.software/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "UTCJ Microcredentials API",
  "version": "0.1.0",
  "environment": "development",
  "chain": "ethereum_sepolia"
}
```

## 2. Consultar el perfil publico del emisor

```bash
curl https://utcjmicro.javierflores.software/issuer-profile
```

Este endpoint publica la identidad del emisor institucional, las llaves publicas y la informacion que consumen validadores externos.

## 3. Consultar las llaves publicas

```bash
curl https://utcjmicro.javierflores.software/public-keys
```

## 4. Emitir una microcredencial por HTTP POST

Puedes emitir una credencial mandando JSON al endpoint `POST /issue`.

### Ejemplo directo con curl

```bash
curl -X POST https://utcjmicro.javierflores.software/issue \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": {
      "given_name": "Javier Alejandro",
      "family_name": "Flores Flores",
      "email": "javier.alejandro.flores.2@gmail.com"
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
        "Edge AI",
        "Inspeccion industrial automatizada"
      ],
      "grade": "Acreditado",
      "evidence_url": "https://example.org/evidence/demo"
    },
    "issuer": {
      "name": "Universidad Tecnologica de Ciudad Juarez",
      "id": "utcj"
    },
    "chain": "ethereum_sepolia"
  }'
```

### Ejemplo usando archivo JSON

Ya existe un ejemplo listo para reutilizar en:

`examples/issue-request-vision-public.json`

Ejecutalo asi:

```bash
curl -X POST https://utcjmicro.javierflores.software/issue \
  -H "Content-Type: application/json" \
  -d @/home/ubuntu/cert-issuer/examples/issue-request-vision-public.json
```

### Script bash listo para usar

Tambien existe este script:

`scripts/issue-vision-demo.sh`

Ejecutalo asi:

```bash
/home/ubuntu/cert-issuer/scripts/issue-vision-demo.sh
```

## 5. Entender la respuesta de emision

La respuesta del endpoint `POST /issue` regresa campos como estos:

```json
{
  "status": "issued",
  "id": "18b6590d-d748-4f6d-8184-627a505f9451",
  "chain": "ethereum_sepolia",
  "transaction_id": "0x... o hash de transaccion",
  "certificate_url": "https://utcjmicro.javierflores.software/certificate/...",
  "visual_svg_url": "https://utcjmicro.javierflores.software/certificate/.../visual.svg",
  "pdf_url": "https://utcjmicro.javierflores.software/certificate/.../pdf",
  "issuer_profile_url": "https://utcjmicro.javierflores.software/issuer-profile",
  "issued_json": {}
}
```

Campos importantes:

- `id`: identificador unico de la microcredencial
- `transaction_id`: hash de anclaje blockchain
- `certificate_url`: URL publica del JSON verificable
- `visual_svg_url`: version visual SVG
- `pdf_url`: version PDF

## 6. Consultar una credencial emitida

Si ya tienes un `id`, puedes recuperar el JSON asi.

Ejemplo con el certificado:

`18b6590d-d748-4f6d-8184-627a505f9451`

```bash
curl https://utcjmicro.javierflores.software/certificate/18b6590d-d748-4f6d-8184-627a505f9451
```

## 7. Descargar el SVG o el PDF

### SVG

```bash
curl -o certificado.svg \
  https://utcjmicro.javierflores.software/certificate/18b6590d-d748-4f6d-8184-627a505f9451/visual.svg
```

### PDF

```bash
curl -o certificado.pdf \
  https://utcjmicro.javierflores.software/certificate/18b6590d-d748-4f6d-8184-627a505f9451/pdf
```

## 8. Descargar el JSON para subirlo manualmente a un validador

```bash
curl -o certificado.json \
  https://utcjmicro.javierflores.software/certificate/18b6590d-d748-4f6d-8184-627a505f9451
```

## 9. Probar la validacion en Blockcerts.org

Abre:

`https://www.blockcerts.org/`

Luego usa una de estas dos opciones:

- pega la URL publica del certificado JSON:

`https://utcjmicro.javierflores.software/certificate/18b6590d-d748-4f6d-8184-627a505f9451`

- o descarga el archivo `certificado.json` y subelo manualmente

## 10. Ejemplo completo de flujo de prueba

### Paso 1

```bash
curl https://utcjmicro.javierflores.software/health
```

### Paso 2

```bash
curl -X POST https://utcjmicro.javierflores.software/issue \
  -H "Content-Type: application/json" \
  -d @/home/ubuntu/cert-issuer/examples/issue-request-vision-public.json
```

### Paso 3

Guarda el `id` que te regrese la respuesta.

### Paso 4

```bash
curl https://utcjmicro.javierflores.software/certificate/TU_ID_AQUI
```

### Paso 5

Pruebalo en:

`https://www.blockcerts.org/`

## 11. Errores comunes

### `422 Unprocessable Content`

El JSON enviado tiene un formato invalido o hubo un problema de emision.

### `404 Certificate not found`

El `id` consultado no existe.

### El validador no acepta la credencial

Revisa:

- que la transaccion en `Sepolia` ya este confirmada
- que el `issuer-profile` sea publico por `HTTPS`
- que estes usando la URL del JSON y no la del PDF o SVG

## 12. Endpoint resumen

- `GET /health`
- `GET /issuer-profile`
- `GET /public-keys`
- `GET /revocation-list`
- `POST /issue`
- `GET /certificate/{id}`
- `GET /certificate/{id}/visual.svg`
- `GET /certificate/{id}/pdf`

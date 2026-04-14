# Arquitectura UTCJ

## Componentes

- `FastAPI`: capa HTTP para integraciones institucionales y automatizacion de emision
- `cert_issuer`: flujo oficial Blockcerts v3 para preparacion de batch, Merkle proof 2019, firma y anclaje
- `Storage`: persistencia local de JSON emitido, request original, SVG y PDF
- `Issuer profile`: publicado en `GET /issuer-profile`
- `Public keys`: publicado en `GET /public-keys`
- `Revocation list`: publicada en `GET /revocation-list`
- `Branding renderer`: genera representacion visual premium UTCJ en SVG/PDF

## Flujo de emision

1. cliente envia `POST /issue`
2. API valida payload con Pydantic
3. se construye un `VerifiableCredential` Blockcerts v3 con contexto VC v2 + Blockcerts v3.2
4. se incrusta `display.content` HTML para experiencia visual portable
5. se instancia `cert-issuer` en modo programatico
6. `cert-issuer` normaliza el JSON-LD, calcula hash y genera Merkle tree
7. el root se ancla en la blockchain configurada
8. `cert-issuer` agrega `DataIntegrityProof` con `cryptosuite=merkle-proof-2019`
9. la API guarda JSON emitido y recursos derivados
10. se devuelve respuesta con `transaction_id`, JSON final y URLs publicas

## Hallazgos del repositorio upstream

- `README.md` de `cert-issuer` confirma Blockcerts v3, VC v1/v2 y `MerkleProof2019`
- el repo ya no es la opcion recomendada para servidor HTTP; la referencia oficial apunta a `cert-issuer-vc-api`, pero hoy no esta disponible publicamente
- la capa web incluida en `docs/web_resources.md` usa un endpoint antiguo y material desactualizado
- el codigo soporta `bitcoin_*`, `mockchain`, `ethereum_mainnet`, `ethereum_goerli`, `ethereum_sepolia`
- por vigencia operativa, `ethereum_sepolia` es mejor opcion de demo publica que Goerli o Ropsten

## Firma

- `verificationMethod` se publica en el issuer profile
- para `ethereum_sepolia` el proyecto deriva JWK secp256k1 desde la llave privada cuando se configura `ISSUER_PRIVATE_KEY_FILE`
- la prueba emitida es `DataIntegrityProof` con `merkle-proof-2019`

## Anclaje

- `mockchain`: solo desarrollo, cero costo, no valida publicamente
- `ethereum_sepolia`: recomendado para piloto verificable
- `ethereum_mainnet`: opcion productiva cuando exista presupuesto, monitoreo y gobierno de llaves
- `bitcoin_testnet`: viable, pero operativamente menos ergonomico para este MVP

## Almacenamiento

- `data/utcj_microcredentials/issued/`: request, metadata y copia operativa
- `data/utcj_microcredentials/public/certificates/`: JSON, SVG y PDF publicados

## Publicacion de recursos publicos

- `GET /issuer-profile`
- `GET /public-keys`
- `GET /revocation-list`
- `GET /certificate/{id}`

## Compatibilidad Blockcerts

- el artefacto principal verificable es el JSON emitido
- la representacion PDF/SVG es auxiliar y no sustituye el JSON
- para Blockcerts.org se requiere URL publica estable y `HTTPS`

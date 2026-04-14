# Integracion UTCJ Microcredenciales

Esta guia resume como operar la integracion de UTCJ Microcredenciales, como configurar las llaves del emisor y como cambiar la emision a otra cuenta de Ethereum Sepolia.

## Base publica actual

- API: `https://utcjmicro.javierflores.software`
- issuer profile: `https://utcjmicro.javierflores.software/issuer-profile`
- llaves publicas: `https://utcjmicro.javierflores.software/public-keys`
- healthcheck: `https://utcjmicro.javierflores.software/health`

## Endpoints principales

- `GET /health`
- `GET /issuer-profile`
- `GET /public-keys`
- `GET /revocation-list`
- `POST /issue`
- `GET /certificate/{id}`
- `GET /certificate/{id}/visual.svg`
- `GET /certificate/{id}/pdf`

## Flujo de integracion

1. El sistema recibe un `POST /issue` con datos del alumno y de la microcredencial.
2. Construye un `VerifiableCredential` compatible con Blockcerts v3.
3. Firma y ancla la credencial en la cadena configurada.
4. Publica el JSON emitido, el issuer profile, las llaves publicas y los recursos visuales.
5. La credencial puede verificarse por URL publica en `https://www.blockcerts.org/`.

## Variables de entorno clave

Las variables mas importantes para UTCJ estan en `.env`.

```env
PUBLIC_BASE_URL=https://utcjmicro.javierflores.software
DEFAULT_CHAIN=ethereum_sepolia

ISSUER_PRIVATE_KEY_FILE=/home/ubuntu/secrets/sepolia.key
ISSUER_PRIVATE_KEY_FORMAT=ethereum_hex
ISSUING_ADDRESS=0xTU_DIRECCION
VERIFICATION_METHOD=https://tu-dominio/issuer-profile#key-1

SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
ETHERSCAN_API_TOKEN=
DATA_DIR=data/utcj_microcredentials
```

## Como funciona la llave del emisor

- La llave privada no debe guardarse dentro del repositorio.
- El proyecto lee la llave desde `ISSUER_PRIVATE_KEY_FILE`.
- Si `ISSUING_ADDRESS` esta vacio, el sistema deriva la direccion automaticamente desde la llave privada.
- Si `VERIFICATION_METHOD` esta vacio, el sistema usa por defecto `https://tu-dominio/issuer-profile#key-1`.
- El `issuer-profile` publica el `verificationMethod`, el `assertionMethod` y el `publicKeyJwk` para validadores externos.

## Donde sacar una cuenta, address y private key

Referencia practica con MetaMask:

- crear o agregar otra cuenta: `https://support.metamask.io/configure/accounts/how-to-add-accounts-in-your-wallet/`
- exportar la private key de una cuenta: `https://support.metamask.io/configure/accounts/how-to-export-an-accounts-private-key/`
- agregar la red Sepolia si hace falta: `https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc/`

Fondos de prueba para Sepolia:

- Alchemy Sepolia Faucet: `https://www.alchemy.com/faucets/ethereum-sepolia`
- explorador Sepolia: `https://sepolia.etherscan.io/`

RPC para Sepolia:

- Alchemy: `https://www.alchemy.com/`
- dashboard Alchemy: `https://dashboard.alchemy.com/`

## Cambiar la emision a otra cuenta

Usa este proceso cuando UTCJ quiera emitir con otra wallet o con otra cuenta del mismo wallet.

1. Crea o selecciona la nueva cuenta en tu wallet EVM.
2. Exporta su private key en formato hexadecimal con prefijo `0x`.
3. Guarda esa llave en un archivo fuera del repo, por ejemplo `/home/ubuntu/secrets/sepolia-utcj-key-2.key`.
4. Protege el archivo con permisos estrictos:

```bash
chmod 600 /home/ubuntu/secrets/sepolia-utcj-key-2.key
```

5. Actualiza `.env`:

```env
ISSUER_PRIVATE_KEY_FILE=/home/ubuntu/secrets/sepolia-utcj-key-2.key
ISSUING_ADDRESS=0xDIRECCION_DE_LA_NUEVA_CUENTA
VERIFICATION_METHOD=https://utcjmicro.javierflores.software/issuer-profile#key-2
DEFAULT_CHAIN=ethereum_sepolia
```

6. Verifica que la nueva cuenta tenga ETH de Sepolia para gas.
7. Reinicia el servicio.
8. Valida que `GET /issuer-profile` y `GET /public-keys` ya publiquen la nueva llave.
9. Emite una credencial de prueba y validala en Blockcerts.org.

## Recomendacion para rotacion de llaves

- Si es una llave nueva, usa un `VERIFICATION_METHOD` nuevo, por ejemplo `#key-2`, `#key-3`, etc.
- Si solo cambias el archivo de llave pero dejas `#key-1`, puedes generar inconsistencia historica y confundir validadores o auditorias.
- Documenta internamente que cuenta emitio cada lote de microcredenciales.

## Ejemplo de emision

```bash
curl -X POST https://utcjmicro.javierflores.software/issue \
  -H "Content-Type: application/json" \
  -d @examples/issue-request-vision-public.json
```

## Verificar que la configuracion quedo bien

1. Salud del servicio:

```bash
curl https://utcjmicro.javierflores.software/health
```

2. Perfil del emisor:

```bash
curl https://utcjmicro.javierflores.software/issuer-profile
```

3. Llaves publicas publicadas:

```bash
curl https://utcjmicro.javierflores.software/public-keys
```

4. Emision de prueba:

```bash
curl -X POST https://utcjmicro.javierflores.software/issue \
  -H "Content-Type: application/json" \
  -d @examples/issue-request-vision-public.json
```

5. Validacion publica:

- abre `https://www.blockcerts.org/`
- pega la URL del JSON emitido, por ejemplo `https://utcjmicro.javierflores.software/certificate/TU_ID`

## Errores comunes al cambiar de cuenta

- `key mismatch`: la llave privada no corresponde a `ISSUING_ADDRESS` o `VERIFICATION_METHOD`.
- `issuer profile unreachable`: `PUBLIC_BASE_URL` no esta bien publicado por `HTTPS`.
- `rpc or broadcaster failure`: la nueva cuenta no tiene ETH de Sepolia o el RPC no responde.
- `unsupported chain setup`: se emitio en `mockchain` y no en `ethereum_sepolia`.

## Seguridad minima recomendada

- nunca subas la private key al repositorio
- guarda las llaves fuera del proyecto
- usa `chmod 600` en archivos de llave
- considera Vault, KMS o HSM en entorno institucional
- documenta alta, baja y rotacion de llaves emisoras

## Referencias del proyecto

- `README.md`
- `docs/api.md`
- `docs/how-to-test-api.md`
- `docs/deployment.md`
- `docs/validation-blockcerts.md`
- `docs/production-hardening.md`

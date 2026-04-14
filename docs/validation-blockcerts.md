# Validacion en Blockcerts.org

## Prerrequisitos

- servicio publicado por `HTTPS`
- issuer profile accesible publicamente
- certificado emitido con cadena publica, preferentemente `ethereum_sepolia`
- JSON del certificado disponible por URL o descargado localmente

## Pasos exactos

1. configura `.env` para `ethereum_sepolia`
2. define `PUBLIC_BASE_URL=https://tu-dominio`
3. emite una microcredencial real con `POST /issue`
4. abre `https://www.blockcerts.org/`
5. en el verificador, carga el JSON emitido o pega la URL publica de `GET /certificate/{id}`
6. verifica que el verificador pueda resolver:
   - `issuer`
   - `verificationMethod`
   - `proof`
   - transaccion blockchain referida por el proof

## Ejemplo ya publicado

- issuer profile: `https://utcjmicro.javierflores.software/issuer-profile`
- certificado HTTPS emitido: `https://utcjmicro.javierflores.software/certificate/b44191c3-bbee-41cd-9edf-b474c3c3ffbe`

Proceso sugerido para probarlo:

1. abre `https://www.blockcerts.org/`
2. pega `https://utcjmicro.javierflores.software/certificate/b44191c3-bbee-41cd-9edf-b474c3c3ffbe`
3. espera a que el verificador resuelva issuer profile, proof y transaccion en `Sepolia`

## Errores comunes

- `issuer profile unreachable`: `PUBLIC_BASE_URL` incorrecto o proxy mal configurado
- `mixed content / blocked`: recursos publicados por HTTP en lugar de HTTPS
- `key mismatch`: `ISSUING_ADDRESS`, `VERIFICATION_METHOD` y llave privada no coinciden
- `unsupported chain setup`: se emitio en `mockchain`; sirve para demo local pero no para verificador publico
- `rpc or broadcaster failure`: saldo insuficiente, gas insuficiente o RPC invalido

## Recomendacion operativa

- usar primero `mockchain` para prueba funcional local
- luego migrar a `ethereum_sepolia` para validacion publica
- solo despues mover a `ethereum_mainnet` o a la red institucional definida por UTCJ

# Production Hardening

## HTTPS

- obligatorio en perfil del emisor, certificados y recursos publicos

## CORS

- restringir `allow_origins` a dominios UTCJ y portales autorizados

## Seguridad de llaves

- guardar llaves fuera del repositorio
- usar permisos `chmod 600`
- considerar HSM, Vault o KMS en produccion institucional

## Rate limiting

- aplicar limites a `POST /issue`
- separar accesos administrativos de accesos publicos de consulta

## Rotacion de secretos

- documentar alta y baja de llaves emisoras
- versionar `verificationMethod` y actualizar issuer profile

## Backups

- respaldar `data/utcj_microcredentials`
- respaldar issuer profile historico y evidencias de configuracion

## Observabilidad

- centralizar logs
- medir errores de emision, latencia de RPC y numero de credenciales emitidas

## Gobierno institucional

- definir responsables de emision
- establecer doble control sobre alta de nuevas llaves
- registrar cambios de branding y version del perfil del emisor

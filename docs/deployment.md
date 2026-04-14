# Despliegue

## Local

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-app.txt
cp .env.example .env
PYTHONPATH=src uvicorn utcj_microcredentials.app:app --host 0.0.0.0 --port 8000 --reload
```

## Linux server

1. copiar proyecto al servidor
2. crear `.env` con `PUBLIC_BASE_URL=https://microcredenciales.utcj.edu.mx`
3. definir `DEFAULT_CHAIN=ethereum_sepolia` para piloto verificable
4. cargar llave privada en archivo seguro, por ejemplo `/opt/utcj/secrets/sepolia.key`
5. exportar `ISSUER_PRIVATE_KEY_FILE=/opt/utcj/secrets/sepolia.key`
6. exponer el servicio detras de Nginx o Caddy

## Despliegue realizado en esta instancia

- dominio: `https://utcjmicro.javierflores.software`
- proxy HTTPS: `Caddy`
- app server: `uvicorn`
- servicio Linux: `utcj-microcredentials.service`
- archivo de servicio: `/etc/systemd/system/utcj-microcredentials.service`
- configuracion Caddy: `/etc/caddy/Caddyfile`

## Comandos operativos en Linux

Estado de la API:

```bash
sudo systemctl status utcj-microcredentials
```

Estado del proxy HTTPS:

```bash
sudo systemctl status caddy
```

Reiniciar API:

```bash
sudo systemctl restart utcj-microcredentials
```

Reiniciar Caddy:

```bash
sudo systemctl restart caddy
```

Logs de la API:

```bash
sudo journalctl -u utcj-microcredentials -f
```

Logs de Caddy:

```bash
sudo journalctl -u caddy -f
```

## Docker

```bash
cp .env.example .env
docker compose up --build -d
```

## Reverse proxy

- publicar `GET /issuer-profile`, `GET /public-keys`, `GET /revocation-list` y `GET /certificate/*` con cache razonable
- reenviar `POST /issue` solo a consumidores autenticados
- abrir puertos `80` y `443` en firewall y proveedor
- mantener `8000` solo de uso local siempre que sea posible

## HTTPS

En produccion debe usarse `HTTPS` porque:

- Blockcerts y verificadores externos consumen recursos remotos del emisor
- la integridad de issuer profile y certificados no debe depender de transporte inseguro
- se evita alteracion o intercepcion del JSON emitido y de claves publicas publicadas
- navegadores y proxies modernos restringen recursos mixtos y degradan confianza sobre HTTP plano

## Variables de entorno clave

- `PUBLIC_BASE_URL`
- `DEFAULT_CHAIN`
- `ISSUER_PRIVATE_KEY_FILE`
- `ISSUING_ADDRESS`
- `VERIFICATION_METHOD`
- `SEPOLIA_RPC_URL`
- `ETHERSCAN_API_TOKEN`

## Verificaciones post despliegue

```bash
curl https://utcjmicro.javierflores.software/health
curl https://utcjmicro.javierflores.software/issuer-profile
curl https://utcjmicro.javierflores.software/public-keys
```

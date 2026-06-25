# Reglas y Conocimiento del Proyecto (UTCJ Microcredentials)

## Rector Actual de la UTCJ
* El rector actual de la Universidad Tecnológica de Ciudad Juárez (UTCJ) es el **Dr. Óscar Fidencio Ibáñez Hernández** (asumió en febrero de 2025). Todas las firmas institucionales y visuales deben referenciar su nombre.

## Sistema de Diseño y Paleta de Colores
* Al generar representaciones visuales (PDF, SVG o HTML), utiliza únicamente los colores de la paleta oficial definidos en `branding.py`:
  - `green`: `#0F6A52`
  - `green_deep`: `#0A4C3B`
  - `teal`: `#0F3E4A`
  - `graphite`: `#1F2937`
  - `mist`: `#E8F1EE`
  - `white`: `#FFFFFF`
  - `gold`: `#B88A3B`
  - `silver`: `#8FA3AD`
* No utilices nombres genéricos u obsoletos como `accent` o `text_light`, ya que levantarán errores de clave (`KeyError`).
* **Branding Dinámico**: Los colores oficiales se pueden personalizar mediante `/admin/branding` y son guardados en la tabla SQLite `branding`. Usa siempre `get_palette(settings)` para obtener la paleta activa en lugar del diccionario estático.

## Generación de PDFs (ReportLab)
* Al usar `render_certificate_pdf`, asegúrate de pasar la cadena del blockchain (`chain`) para evitar excepciones de variable no definida.
* Usa controles de flujo de texto con `Paragraph` de ReportLab para evitar desbordes de texto cuando los nombres de los estudiantes o los títulos de las credenciales sean largos.

## Base de Datos (SQLite)
* La base de datos local se guarda en `data/utcj_microcredentials/certificates.db` y cuenta con las siguientes tablas principales:
  - `certificates`: Contiene todos los metadatos de las credenciales emitidas (`id`, `recipient_name`, `credential_title`, `course_name`, `hours`, `grade`, `chain`, `transaction_id`, `issued_at`, `issued_by`, `revoked`, `request_json`, `metadata_json`).
  - `branding`: Almacena colores personalizados mapeados llave-valor.
  - `revocations`: Contiene los registros de credenciales revocadas (`id`, `revoked_at`, `reason`).

## Rutas de API Adicionales e Integración
* **JWT Auth**: `/token` permite obtener tokens de acceso basados en roles utilizando HMAC-SHA256 (`admin`, `issuer`, `auditor`). Los endpoints admiten tanto `X-API-Key` como `Authorization: Bearer <JWT>`.
* **Emisión por Lotes**: `/issue-batch` permite emitir múltiples certificados bajo una única transacción de blockchain utilizando el lote de `cert-issuer`.
* **Portal de Administración**: `/admin/dashboard?api_key=...` proporciona una UI web para ver estadísticas, cargar firmas de rector en PNG/JPG, configurar colores dinámicamente y revocar credenciales.
* **DID Web**: El documento W3C DID se sirve automáticamente en `/.well-known/did.json` exponiendo las claves criptográficas públicas y DIDs vinculadas al dominio.
* **Firma del Rector**: `/rector-signature` sirve la firma en imagen transparente cargada por administración, con fallback automático.

## Persistencia y Seguridad
* Todas las escrituras de certificados (`Storage.save_certificate`) deben ser atómicas utilizando escrituras en archivos temporales antes de renombrar/reemplazar el archivo definitivo (`os.replace`).

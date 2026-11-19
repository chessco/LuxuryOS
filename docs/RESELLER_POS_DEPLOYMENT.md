# Despliegue de Revendedores

## Seguridad de migraciones

Cada push a `main` activa **Deploy Production** en GitHub Actions. El flujo conserva el orden API, Revendedores y, por último, web; un fallo bloquea las etapas posteriores. Los tres workflows individuales siguen disponibles para operaciones manuales.

La etapa API ejecuta el preflight antes de cada despliegue: revisa `prisma migrate status`, compara `prisma migrate diff` con la base real y crea un respaldo consistente en `/opt/pitaya/backups/luxuryos/`, validado con `gzip -t` y SHA-256. Si aparece una diferencia histórica ajena al POS, una migración fallida o una operación destructiva, se detiene el pipeline y no se publican las etapas posteriores.

Los flujos de API aplican exclusivamente `prisma migrate deploy`. Está prohibido usar `prisma db push` contra producción.

El orden del pipeline es: construir la imagen, aplicar migraciones versionadas con un contenedor temporal, iniciar la nueva API y revisar los logs. La migración inicial de Revendedores es aditiva y no toca órdenes ni pagos de joyería.

## Hetzner y Nginx Proxy Manager

El frontend se construye como el contenedor `luxury-reseller-web-prod` en Hetzner. No usa Hostinger ni credenciales SFTP. El workflow `deploy-reseller-hetzner.yml` reutiliza los secretos SSH ya existentes de Hetzner y publica una imagen Nginx estática dentro de la red Docker `pitaya_net`.

En Nginx Proxy Manager crear un **Proxy Host**:

- Domain Names: `revendedor.pitayacode.io`
- Scheme: `http`
- Forward Hostname/IP: `luxury-reseller-web-prod`
- Forward Port: `80`
- SSL: solicitar certificado Let's Encrypt y activar **Force SSL**.

El DNS de `revendedor.pitayacode.io` debe apuntar a Hetzner. El frontend usa `https://luxury-api.pitayacode.io` para el API; no necesita un proxy `/api` adicional.

## Verificación posterior

1. Confirmar que la API inició y que `prisma migrate status` no muestra pendientes.
2. Iniciar sesión con un usuario `REVENDEDOR` en `https://revendedor.pitayacode.io`.
3. Verificar `GET /reseller/profile` y `GET /reseller/catalog`.
4. Confirmar que el mismo usuario recibe `403` en una ruta privada de joyería.
5. Mantener como rollback la aplicación anterior y el respaldo MySQL más reciente generado por el preflight.

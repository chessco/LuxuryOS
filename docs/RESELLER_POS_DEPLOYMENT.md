# Despliegue de Revendedores

## Seguridad de migraciones

Los flujos de API aplican exclusivamente `prisma migrate deploy`. Está prohibido usar `prisma db push` contra producción.

El orden del pipeline es: construir la imagen, aplicar migraciones versionadas con un contenedor temporal, iniciar la nueva API y revisar los logs. La migración inicial de Revendedores es aditiva y no toca órdenes ni pagos de joyería.

## Hostinger

Antes de publicar `revendedor.pitayacode.io`, configurar estos secretos de GitHub Actions:

- `RESELLER_DEPLOY_HOST`
- `RESELLER_DEPLOY_PORT`
- `RESELLER_DEPLOY_USER`
- `RESELLER_DEPLOY_PASSWORD`
- `RESELLER_DEPLOY_REMOTE_PATH`

Además, configurar la variable de repositorio `RESELLER_DEPLOY_ENABLED=true`. Hasta entonces el workflow se omite deliberadamente en cada push a `main`; puede ejecutarse manualmente después de configurar Hostinger.

`RESELLER_DEPLOY_REMOTE_PATH` debe ser el document root específico del subdominio, nunca el de `luxuryos.pitayacode.io`.

El workflow `deploy-reseller-hostinger.yml` usa `VITE_API_URL=https://luxury-api.pitayacode.io` y publica solo `reseller-web/dist`.

## Verificación posterior

1. Confirmar que la API inició y que `prisma migrate status` no muestra pendientes.
2. Iniciar sesión con un usuario `REVENDEDOR` en `https://revendedor.pitayacode.io`.
3. Verificar `GET /reseller/profile` y `GET /reseller/catalog`.
4. Confirmar que el mismo usuario recibe `403` en una ruta privada de joyería.
5. Mantener como rollback la aplicación anterior y el respaldo MySQL de `20261110T032507Z`.

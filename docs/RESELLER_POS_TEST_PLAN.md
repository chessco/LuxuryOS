# Batería de pruebas — Revendedores

Esta batería protege la fundación del POS sin depender de datos de producción.

## Ejecución

Desde `api/`:

```bash
npm run test:reseller
npm run test:reseller:cov
npm run build
```

Desde `reseller-web/`:

```bash
npm run build
```

Antes de un despliegue que también incluya cambios en `web/`, ejecutar desde `web/`:

```bash
npm test
VITE_API_URL=https://luxury-api.pitayacode.io npm run build
```

## Cobertura actual

- Autenticación: un `REVENDEDOR` solo puede usar `/reseller` o `/reseller/*`; rutas con prefijos parecidos y rutas de joyería son denegadas.
- Autorización: los roles existentes mantienen el acceso que ya tenían y `SYSTEM_ADMIN` conserva su bypass administrativo.
- Tenant: el catálogo y el alta de productos toman siempre el `tenantId` del JWT, no del cliente.
- Catálogo: solo se consultan productos activos y habilitados para revendedores; la disponibilidad nunca es negativa.
- Validación: SKU, moneda, precio, inventario y conversiones de payload se validan antes de persistir.
- Persistencia: un SKU duplicado dentro del tenant produce conflicto; otros errores no se ocultan.
- Migración: la fundación agrega únicamente el rol `REVENDEDOR` y cinco tablas de comercio; no altera `Order`, `Payment` ni datos existentes.

## Siguiente cobertura al construir checkout

Agregar pruebas de integración con MySQL temporal para reserva atómica, idempotencia de venta, confirmación de pago por Cared y liberación de reservas vencidas. No publicar checkout hasta que esas pruebas existan.

# Auditoría POS interno y pedidos comerciales

## Alcance

LuxuryOS conserva un monolito NestJS + Prisma + MySQL. `web/` es la aplicación interna Cared y `reseller-web/` el portal aislado de revendedores. Esta evolución no sustituye `Order`, `Payment` ni el módulo de taller.

## Entidades existentes y responsabilidad

| Entidad | Responsabilidad |
| --- | --- |
| `Order` y `Payment` | Taller, apartados, pedidos con entrega posterior y sus abonos. |
| `CommerceProduct` | Catálogo e inventario comercial compartido por tenant. |
| `InventoryReservation` | Unidades apartadas temporalmente durante una venta pendiente. |
| `CommerceSale` y `CommercePayment` | Venta inmediata por canal comercial y sus cobros. |

No existen sucursales, ubicaciones, consignación, costo unitario comercial ni kardex. Este MVP mantiene inventario centralizado por tenant y no simula esos datos.

## Decisiones de implementación

- Los canales se validan en backend: `JEWELRY_INTERNAL` y `RESELLER_POS`.
- Cared procesa pagos: un `REVENDEDOR` sólo puede crear ventas pendientes y sus propias reservas; nunca registra ni revierte pagos.
- Toda mutación de inventario usa una transacción y actualización compare-and-swap; liberar, expirar, consumir y cancelar usan la misma protección.
- Checkout exige `Idempotency-Key`, única por tenant. Un reintento devuelve la venta original.
- Una venta inmediata no crea una `Order`. Un pedido diferido se vincula de forma explícita y se rechaza si falta una fotografía real o si no cumple las validaciones existentes de órdenes.
- Antes de migrar producción se requiere respaldo, `prisma migrate status`, comparación de esquema y aplicación exclusiva con `prisma migrate deploy`.

## Migración aditiva

La migración `20261111050000_add_pos_oms_support` añade `PARTIAL` a pagos comerciales, relación opcional `CommerceSale` a `Order`, notas/motivo de cancelación y `CommerceAuditLog`. No modifica tablas de órdenes ni pagos existentes.

## Criterios locales antes de cualquier ambiente remoto

1. Crear una base MySQL local desechable mediante Docker.
2. Aplicar todas las migraciones con `prisma migrate deploy`.
3. Ejecutar pruebas API, `web` y `reseller-web`.
4. Probar dos checkouts concurrentes sobre el último artículo, reintento con la misma llave, intento de pago por revendedor y cancelación de venta vinculada.
5. Verificar que ningún endpoint del canal revendedor permite cobros o datos de otros revendedores.

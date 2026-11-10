# LuxuryOS — Guía inicial para agentes: POS de revendedores

## 1. Propósito

Construir el POS para revendedores de Cared sin mezclarlo con la operación actual de joyería. El POS debe reutilizar capacidades estables de LuxuryOS —autenticación, catálogo, inventario, clientes, pagos, órdenes, WhatsApp y auditoría— mediante módulos y contratos explícitos.

La arquitectura aprobada para esta fase es un **monolito modular multicanal**: un API central de LuxuryOS, una base de datos MySQL y dos frontends separados.

## 1.1 Stack obligatorio

El desarrollo nuevo debe conservar el stack de LuxuryOS:

- Backend: Node.js + NestJS + TypeScript.
- ORM y acceso a datos: Prisma.
- Base de datos: MySQL 8.
- Frontend: Vite + React + TypeScript, usando las convenciones y dependencias existentes de `web/`.
- Infraestructura: Docker Compose y los scripts de despliegue actuales.

No introducir Next.js, otro framework backend, PostgreSQL, Medusa, Vendure u otro motor comercial para este módulo sin autorización explícita. Next.js pertenece al proyecto externo ProBuyer, no al stack actual de LuxuryOS. ProBuyer se utiliza únicamente como referencia de reglas y contratos reutilizables.

## 2. Fuentes de verdad y límites

### LuxuryOS / Cared

- Backend actual: `api/` (NestJS + Prisma).
- Base de datos actual: **MySQL 8**.
- Fuente de verdad para las operaciones nuevas de Cared.
- El inventario y las ventas del POS deben vivir en esta base.

### Frontends

- `web/`: aplicación activa de joyería. El workflow de despliegue de Hostinger apunta a esta carpeta y aquí vive el flujo protegido de etiquetas AirPrint.
- `frontend/`: copia/versión anterior de frontend; queda como referencia hasta que se confirme su retiro. No usarla como base del POS.
- `reseller-web/`: nuevo frontend Vite + React, identificado comercialmente como **Revendedores**, con despliegue independiente en `revendedor.pitayacode.io`.

### ProBuyer / iCellPos

- Ubicación externa: `C:\PitayaCode\probuyer.org`.
- Base de datos propia: PostgreSQL.
- No importar su esquema Prisma ni conectar directamente ambas bases.
- Puede aportar contratos, reglas de comisiones, validaciones y patrones de checkout después de una revisión.
- Si se requiere intercambio entre sistemas, usar una API/adaptador explícito y definir qué sistema es dueño de cada dato.

## 3. Estructura objetivo

```text
LuxuryOS/
├── api/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── auth/                  # Autenticación y sesión existente
│       ├── orders/                # Operación actual de joyería
│       ├── clients/
│       ├── queue/                 # WhatsApp y notificaciones
│       ├── payments/
│       ├── commerce/              # Capacidades compartidas
│       │   ├── catalog/
│       │   ├── inventory/
│       │   ├── pricing/
│       │   ├── sales-channel/
│       │   └── payments/
│       └── reseller-pos/          # Dominio nuevo de revendedores
│           ├── reseller-pos.module.ts
│           ├── catalog/
│           ├── pricing/
│           ├── checkout/
│           ├── sales/
│           ├── commissions/
│           ├── customers/
│           ├── reports/
│           ├── dto/
│           ├── policies/
│           └── guards/
├── web/                           # Joyería actual
├── reseller-web/                  # Frontend comercial: Revendedores
├── packages/
│   ├── commerce-contracts/        # Tipos compartidos API/frontend
│   └── commerce-rules/            # Precio, checkout y comisiones
├── infra/
└── docs/
```

No es obligatorio mover todos los archivos actuales a esta estructura antes de comenzar. La implementación puede iniciar agregando `api/src/reseller-pos`, `packages/commerce-contracts` y `reseller-web` de forma incremental.

## 4. Separación por canal de venta

Toda venta debe identificar explícitamente su canal:

```text
JEWELRY_INTERNAL
RESELLER_POS
```

Las entidades nuevas o modificadas deben conservar, cuando aplique:

- `tenantId` o contexto de organización.
- `salesChannel`.
- `resellerId` o vendedor responsable.
- `createdBy`.
- Información de comisión calculada o congelada en la venta.

El canal nunca debe determinarse únicamente en el frontend. El API debe validarlo y autorizarlo en el servidor.

## 5. Módulos iniciales del POS

### MVP 1 — Fundación

- Roles y permisos de revendedor.
- Contratos compartidos.
- Canal `RESELLER_POS`.
- Catálogo e inventario visible para revendedores.
- Auditoría de operaciones.

### MVP 2 — Venta

- Búsqueda de productos.
- Carrito.
- Cotización y validación de precios.
- Creación de venta.
- Métodos de pago habilitados.
- Recibo y notificación.

### MVP 3 — Comisiones

- Reglas configurables.
- Comisión por producto, categoría o porcentaje.
- Historial de comisiones.
- Reporte por revendedor y periodo.

### MVP 4 — Operación

- Devoluciones y cancelaciones autorizadas.
- Conciliación de pagos.
- Reportes administrativos.
- Preparación para inventario asignado por revendedor, si el negocio lo requiere.

## 6. Contratos API propuestos

Los nombres finales deben validarse con el código existente, pero el límite funcional esperado es:

```text
GET  /reseller/catalog
GET  /reseller/inventory
POST /reseller/quotes
POST /reseller/sales
GET  /reseller/sales
GET  /reseller/sales/:id
GET  /reseller/commissions
GET  /reseller/profile
```

El frontend nunca debe acceder directamente a Prisma ni a la base de datos.

## 7. Reglas obligatorias para agentes

1. Leer primero el `AGENTS.md` de la raíz y este documento.
2. No alterar el flujo actual de joyería para resolver una necesidad exclusiva de revendedores.
3. No crear una segunda base de datos para el POS sin una decisión explícita.
4. No copiar el Prisma de ProBuyer ni mezclar PostgreSQL con el MySQL de LuxuryOS.
5. No reutilizar endpoints de ProBuyer sin verificar que existan, estén documentados y tengan un dueño de datos claro.
6. La autorización debe estar en el backend; ocultar una pantalla no es una medida de seguridad.
   El `JwtAuthGuard` bloquea al rol `REVENDEDOR` fuera de las rutas `/reseller`.
7. Las ventas deben ser idempotentes y auditables.
8. Los precios, descuentos y comisiones deben calcularse en servidor.
9. Mantener WhatsApp, QR y AirPrint conforme a las reglas del `AGENTS.md` raíz.
10. Preferir cambios pequeños, pruebas enfocadas y migraciones reversibles.

## 7.1 Regla de producción y migraciones

LuxuryOS ya tiene datos en producción. Ningún agente debe ejecutar `prisma migrate dev`, `prisma db push`, scripts de seed ni SQL manual contra producción.

Para liberar una migración del POS:

1. Ejecutar `prisma migrate status` contra el entorno de destino y confirmar que no existen migraciones pendientes ajenas.
2. Comparar el esquema real con `schema.prisma` mediante `prisma migrate diff`. Resolver cualquier diferencia histórica no relacionada antes de aplicar la migración de Revendedores.
3. Crear y verificar un respaldo consistente de MySQL antes de tocar el esquema.
4. Aplicar únicamente `prisma migrate deploy` desde el contenedor/entorno de API correspondiente.
5. Desplegar el API compatible con el esquema nuevo.
6. Validar inicio de sesión, aislamiento de tenant y respuestas de `/reseller/profile` y `/reseller/catalog`.
7. Desplegar el frontend de Revendedores solamente después de validar el API.

La migración inicial de Revendedores es aditiva: añade el rol `REVENDEDOR` y tablas nuevas (`CommerceProduct`, `CommerceSale`, `CommerceSaleItem`, `CommercePayment`, `InventoryReservation`). No modifica órdenes existentes ni hace backfill de datos. Si el despliegue de aplicación necesita revertirse, se revierte la aplicación; las tablas y el nuevo valor del enum se conservan hasta una migración posterior aprobada.

### Hallazgo local pendiente de reconciliación

La base local construida solo con las migraciones históricas no materializa todavía algunos campos que existen en `schema.prisma` (por ejemplo `User.username`, `Setting` y cambios previos de `Order`/`NotificationLog`). Este desfase es anterior a Revendedores. No permite inferir el estado de producción: debe auditarse contra la base productiva y resolverse mediante migraciones nuevas y aprobadas, nunca editando migraciones ya desplegadas.

## 8. Criterios de aceptación iniciales

- Un revendedor puede iniciar sesión y solo ve el POS permitido.
- Un revendedor no puede acceder a órdenes ni funciones internas de joyería.
- Cada venta queda registrada con `salesChannel = RESELLER_POS`.
- El inventario se descuenta una sola vez y la operación soporta reintentos seguros.
- La comisión queda registrada con la regla aplicada y el importe resultante.
- Los administradores pueden consultar ventas y comisiones por revendedor.
- Las pruebas existentes de API y frontend siguen pasando.
- No se modifican las garantías de impresión de etiquetas Apple/AirPrint.

## 9. Decisiones confirmadas y pendientes

### Confirmadas

- `web/` es el frontend activo de joyería; `frontend/` queda como referencia anterior.
- Los revendedores serán usuarios internos de LuxuryOS con rol visible **Revendedor**. El identificador interno recomendado es `REVENDEDOR`; no reutilizar `VENDEDOR` sin verificar primero sus permisos actuales.
- Cared es responsable de procesar los pagos.
- El inventario inicial será compartido, con reserva durante checkout y descuento atómico al confirmar el pago.
- El POS se identificará operativamente como **Revendedores** y se publicará en `revendedor.pitayacode.io`.

### Pendientes

- Fórmula y reglas de comisiones; se definirán cuando se implemente ese módulo.
- Permisos y flujo de cancelaciones y devoluciones.
- Ventas a crédito y sus límites.

Las decisiones pendientes no bloquean la fundación, catálogo ni autenticación del módulo, pero deben resolverse antes de publicar el checkout productivo.

## 10. Checklist antes de codificar

### Decisiones técnicas

- **Frontend activo:** `web/` es el frontend activo de joyería; `frontend/` es una copia/versión anterior y no debe recibir código nuevo del POS. El POS debe partir del stack y convenciones de `web/`.
- **Frontend del POS:** crear `reseller-web/` como aplicación Vite + React independiente, sin copiar toda la aplicación de joyería.
- **API:** mantener un solo proceso NestJS y agregar `reseller-pos` como módulo. No crear microservicio todavía.
- **Base de datos:** mantener MySQL 8 y usar migraciones Prisma pequeñas y reversibles.
- **Contratos:** definir los tipos de request/response en `packages/commerce-contracts` antes de construir pantallas.

### Decisiones de negocio recomendadas para el MVP

- **Identidad:** usar usuarios internos de LuxuryOS con rol visible **Revendedor** e identificador backend `REVENDEDOR`; no crear una autenticación paralela ni sobreescribir el rol existente `VENDEDOR` sin revisar sus permisos.
- **Inventario:** comenzar con inventario compartido, pero reservarlo durante el checkout y descontarlo de forma atómica al confirmar el pago. Agregar inventario asignado/consignado por revendedor solo si después se confirma que los revendedores almacenan físicamente producto.
- **Precio:** calcular el precio final en el backend según canal, organización, producto y regla vigente.
- **Comisión:** calcularla en el backend y guardar un snapshot en la venta para que cambios futuros de reglas no alteren el historial.
- **Pago:** Cared es el responsable de procesar el cobro. El POS debe registrar método, importe, referencia y estado de pago; el revendedor no será el dueño del cobro.
- **Venta:** crear la venta y descontar inventario dentro de una operación transaccional e idempotente.
- **Devoluciones:** permitirlas solamente mediante permiso administrativo en el MVP.
- **Cliente final:** permitir cliente opcional en la primera versión, pero conservar siempre el revendedor responsable.

### Verificaciones obligatorias antes de producción

- Probar aislamiento entre `JEWELRY_INTERNAL` y `RESELLER_POS`.
- Verificar que un revendedor no pueda consultar órdenes ni endpoints administrativos de joyería.
- Probar doble envío del checkout y confirmar que no duplique venta ni descuento de inventario.
- Probar cancelación, devolución y reversión de comisión.
- Ejecutar las pruebas actuales de `api/` y `web/` sin modificar las garantías de AirPrint.
- Configurar `revendedor.pitayacode.io`, variables de entorno, backups MySQL, logs y rollback antes del despliegue.

# Índice de Diseños y Arquitectura — LuxuryOS (`SITEMAP.md`)

Mapa central para ubicar las especificaciones, reglas operativas, contratos y reportes de deriva del monorepo LuxuryOS / Cared (workflow **Elephant-Goldfish Model**).

## Reglas Globales y Constitución del Repositorio

- [AGENTS.md](../../AGENTS.md) — Reglas obligatorias (WhatsApp/QR `cleanContent`, gateway PitayaCore, fotografía dual, Joyero obligatorio, impresión AirPrint 62 mm en iPad/iPhone, stack NestJS + Prisma + MySQL 8 / Vite + React y configuración EGM).

## Especificaciones y Contratos Activos

- [RESELLER_POS_AGENT_START.md](../RESELLER_POS_AGENT_START.md) — Arquitectura del monolito modular multicanal, aislamiento `JEWELRY_INTERNAL` vs `RESELLER_POS`, fases MVP y reglas de migración.
- [RESELLER_POS_DEPLOYMENT.md](../RESELLER_POS_DEPLOYMENT.md) — Orden de despliegue en producción (`preflight` → respaldo + `prisma migrate deploy` → API → Revendedores → Web).
- [RESELLER_POS_TEST_PLAN.md](../RESELLER_POS_TEST_PLAN.md) — Batería de pruebas y comandos de verificación de Revendedores, API y Web.
- [LUXURYOS_POS_OMS_AUDIT.md](../architecture/LUXURYOS_POS_OMS_AUDIT.md) — Auditoría del módulo POS interno, reservas e idempotencia (`20261111050000_add_pos_oms_support`).
- [reseller-pos.openapi.yaml](../contracts/reseller-pos.openapi.yaml) — Contrato OpenAPI 3.1.0 de `/reseller/*`.

## Contratos de Código (*Peanuts & Hay*)

- [api/src/orders/README.md](../../api/src/orders/README.md) — Blueprint del dominio de órdenes (`OrdersController`, `PublicOrdersController`, `OrdersService`, consecutivos inmutables `OrderNumberSequence` y borrado lógico) con contratos hijos en `./dto/README.md` y `./strategies/README.md`.
- [api/src/queue/README.md](../../api/src/queue/README.md) — Blueprint de fila de turnos y mensajería WhatsApp (`QueueController`, `NotificationService`, `NotificationStatusController`, `WhatsAppWebhookController`) con contratos hijos en `./dto/README.md` y `./providers/README.md`.

## Reportes de Deriva (`egm-drift-report`)

- [2026-11-18_DRIFT_REPORT.md](./2026-11-18_DRIFT_REPORT.md) — Discrepancias detectadas entre la documentación (`AGENTS.md`, `RESELLER_POS_AGENT_START.md`) y el código actual en `main`.

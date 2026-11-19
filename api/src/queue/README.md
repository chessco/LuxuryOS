# Queue & Notifications Blueprint (`api/src/queue`)

## System Overview
Manages customer showroom queue tickets (intake, calling, service linking, pickup verification), real-time queue Socket.IO updates, and outbound/inbound WhatsApp messaging plus delivery-receipt webhooks through PitayaCore, Flow, or `wa.me` links.

## Local Interface & Invariants
- [`queue.module.ts`](./queue.module.ts): `QueueModule` imports `OrdersModule` and `SettingsModule`; registers `QueueController`, `WhatsAppWebhookController`, and `NotificationStatusController`; exports `QueueService`.
- [`queue.controller.ts`](./queue.controller.ts): HTTP routes under `/queue`:
  - Public/kiosk: `POST /queue/tickets`, `GET /queue/tickets/public`, `GET /queue/q/:token`, `GET /queue/recommendations/:kind`.
  - Authenticated (`JwtAuthGuard`): `GET /queue/staff`, `POST /queue/tickets/:id/call`, `POST /queue/tickets/:id/in-service`, `POST /queue/tickets/:id/done`, `GET /queue/pickup/search`, `POST /queue/tickets/:id/confirm-pickup`, `POST /queue/tickets/:id/link-order`, `POST /queue/orders/:id/confirm-delivery`.
- [`queue.service.ts`](./queue.service.ts): `QueueService` manages transactional daily ticket counters (`R-`, `V-`, `P-`), `qrToken` generation, pickup order linking, and delivery confirmation.
- [`queue.gateway.ts`](./queue.gateway.ts): `QueueGateway` (`namespace: 'queue'`, `subscribe('joinTenantRoom')`, `notifyUpdate(tenantId)` -> `queueUpdated`).
- [`notification.service.ts`](./notification.service.ts): `NotificationService` (`notifyTicketCreated`, `notifyNearTurn`, `notifyNowTurn`, `sendCustomMessage`, `getWhatsAppHealth`).
- [`notification-status.controller.ts`](./notification-status.controller.ts): `NotificationStatusController` exposes `GET /notifications/whatsapp-status` (`JwtAuthGuard`).
- [`whatsapp-webhook.controller.ts`](./whatsapp-webhook.controller.ts): `WhatsAppWebhookController` (`/webhooks/whatsapp`) exposes Meta webhook verify/handle plus PitayaCore callbacks `POST /webhooks/whatsapp/incoming` and `POST /webhooks/whatsapp/ack`.

## Subdirectories & System Boundaries
- **DTOs**: [`./dto/README.md`](./dto/README.md) — Input validation contract for `POST /queue/tickets`.
- **Providers**: [`./providers/README.md`](./providers/README.md) — WhatsApp transport adapters (`PitayaCoreWhatsAppProvider`, `FlowWhatsAppProvider`, `MetaWhatsAppProvider`) and `cleanContent` QR extraction rules.

## Global Invariants
- **WhatsApp delivery state machine (`NotificationLog`)**:
  - Gateway accepted HTTP send (`messageId` returned) -> `ACCEPTED` (not treated as delivered).
  - Gateway rejected or failed -> `LOGGED` (`success: false`), triggering `getWhatsAppHealth` alerts when the most recent outbound WhatsApp log in the last 24h is `LOGGED` within the 30-minute active failure window.
  - PitayaCore ACK webhook (`/webhooks/whatsapp/ack`): `ack === 1` -> `SENT`, `ack >= 2` -> `DELIVERED`, `ack === -1` -> `FAILED`; terminal states (`DELIVERED`, `FAILED`) are not regressed (except allowing `-1` only if not already `DELIVERED`).
  - Inbound replies (`/webhooks/whatsapp/incoming`) -> `RECEIVED` with dedupe key `pitayacore:inbound:${messageId}` and excluded from outbound failure health checks.
  - `LINKS` provider returns `{ success: true, url: 'https://wa.me/...' }` with `providerMessageId: 'WA_LINK'` and `status: 'SENT'`, and `getWhatsAppHealth` always reports `connected: true`.
- **Callback authentication**: Both PitayaCore webhooks resolve `tenantId` from `Setting` (`key = 'pitayacore_tenant_id'`) and require matching `x-api-key` against `pitayacore_api_key`.

## Global Side Effects
- Reads/writes `QueueTicket`, `NotificationLog`, `Order`, `Tenant`, and `Setting` rows via `PrismaService`.
- Emits `queueUpdated` events to tenant Socket.IO rooms (`QueueGateway`).
- Dispatches external HTTP requests to PitayaCore / Flow / Meta WhatsApp APIs.

## System Verification
- Run: `npm --prefix api test -- src/queue/notification.service.spec.ts src/queue/whatsapp-webhook.controller.spec.ts src/queue/providers/whatsapp.provider.spec.ts`

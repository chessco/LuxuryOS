# Notification & WhatsApp Providers (`api/src/queue/providers`)

## Overview
Outbound notification adapters implementing transport-specific delivery for Meta Cloud API, Flow API, PitayaCore WhatsApp Web gateway, and mock providers used during tests or development.

## Interface
- [`notification.provider.ts`](./notification.provider.ts):
  - `NotificationOptions`, `INotificationProvider`
  - `MockWhatsAppProvider`, `MockEmailProvider`
- [`whatsapp.provider.ts`](./whatsapp.provider.ts):
  - `WhatsAppOptions`, `IWhatsAppProvider`
  - `MetaWhatsAppProvider`: sends approved Meta Graph v18.0 templates (`es_MX`).
  - `FlowWhatsAppProvider`: sends plain/mapped text to `${apiUrl}/whatsapp/internal/send`.
  - `PitayaCoreWhatsAppProvider`: sends text and rich media to `${apiUrl}/whatsapp/send` with headers `x-api-key` and `x-tenant-id`.

## Invariants
- **`cleanContent` + native QR/media extraction (`PitayaCoreWhatsAppProvider`)**: URLs matching image/QR/barcode patterns (`png|jpg|jpeg|webp`, `bwipjs-api`, `api.qrserver`) MUST be extracted into `imageUrl` and `mediaUrl` and stripped from `content` (`cleanContent`), so WhatsApp renders a native media attachment instead of a text link preview.
- **Mexican number prefix normalization (`PitayaCoreWhatsAppProvider`)**: 10-digit numbers normalize to `521<digits>`; 12-digit numbers starting with `52` (not `521`) normalize to `521<last10>`.
- **Safe retry boundary**: Alternate prefix retry (`52` <-> `521`) executes ONLY when the gateway explicitly returns HTTP `400` with `success === false` and an invalid number/recipient error message before acceptance; ambiguous serialization failures never trigger duplicate sends.
- **No silent cross-provider fallback**: `PitayaCoreWhatsAppProvider` does not fall back to `FlowWhatsAppProvider`, avoiding messages sent from an unintended phone number.

## Side Effects
- External HTTP `POST` calls to `graph.facebook.com`, configured `flow_api_url`, or `pitayacore_api_url`.
- Console request/response telemetry in `PitayaCoreWhatsAppProvider.sendMessage`.

## Verification
- Run: `npm --prefix api test -- src/queue/providers/whatsapp.provider.spec.ts`

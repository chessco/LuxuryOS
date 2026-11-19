# Reporte de Deriva (`egm-drift-report`) — 2026-11-18

Comparación entre las especificaciones/reglas documentadas y el código fuente actual de `main` tras la reconciliación documental de Paso 1.

## AGENTS.md

No drift detected.

> Reconciliado en esta sesión: precisión de `cleanContent` en `PitayaCoreWhatsAppProvider.sendMessage` (`api/src/queue/providers/whatsapp.provider.ts`) vs `LINKS` en `NotificationService.sendCustomMessage`; regla §6 para cliente con teléfono de 10 dígitos y sección obligatoria `"¿Dejó Oro?"` (`specifications.leftGold` / `leftGoldItems`); y variante autorizada exclusiva para iPhone (`isIphoneDevice()` + `navigator.share({ files: [pdfFile] })`) en `web/src/components/orders/LabelPrintModal.tsx`.

## docs/RESELLER_POS_AGENT_START.md

No drift detected.

> Reconciliado en esta sesión: estado actual plano de `api/src/commerce/` y `api/src/reseller-pos/` sin `packages/` (§3); separación en §6 entre endpoints implementados en `ResellerPosController` y los pendientes de MVP 3 (`POST /reseller/quotes`, `GET /reseller/commissions`); y promoción en §9 de cancelaciones (`cancelSale`) y crédito dual (`REVOLVING` / `NON_REVOLVING`, `PosSales.tsx`, `"Mi crédito"`) a decisiones confirmadas/implementadas.

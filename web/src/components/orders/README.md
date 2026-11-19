# Order UI Components (`web/src/components/orders`)

## Overview
UI modals, stage panels, printable views, and specialized jewelry form inputs supporting order intake, workshop execution, AirPrint Brother QL-810W label printing, QR delivery/return scanning, WhatsApp conversation tracking, and deleted-order auditing.

## Interface
- **Printing & Scanning**:
  - [`LabelPrintModal.tsx`](./LabelPrintModal.tsx): `LabelPrintModal` (`isOpen`, `onClose`, `order`) — thermal label renderer (`QR` or `BARCODE`), WhatsApp label trigger (`PITAYACORE`/`FLOW` API vs `LINKS`), and platform-specific AirPrint/iframe printing.
  - [`RepairPrintView.tsx`](./RepairPrintView.tsx): `RepairPrintView` (`isOpen`, `onClose`, `order`) — full printable workshop ticket via `window.print()`.
  - [`QRScannerModal.tsx`](./QRScannerModal.tsx): `QRScannerModal` (`isOpen`, `onClose`, `onOrderUpdated?`) — camera/manual QR lookup, QR delivery settlement, and client return flow.
- **WhatsApp, Photos & Audits**:
  - [`ClientWhatsAppModal.tsx`](./ClientWhatsAppModal.tsx): `ClientWhatsAppModal` (`isOpen`, `onClose`, `client`, `orderCode?`, `orderId?`) — client chat drawer with real `NotificationLog` delivery indicators and creation-notice resend.
  - [`CameraCaptureModal.tsx`](./CameraCaptureModal.tsx): default export `CameraCaptureModal` (`isOpen`, `onClose`, `onCapture`, `title?`) — WebRTC camera capture returning base64 image payloads for the desktop/Chrome photo control.
  - [`DeletedOrdersModal.tsx`](./DeletedOrdersModal.tsx): `DeletedOrdersModal` (`isOpen`, `onClose`) — admin audit modal listing soft-deleted orders via `OrdersService.getDeletedOrders()`.
- **Order Board, Workflow Panels & Form Controls**:
  - [`OrdersTable.tsx`](./OrdersTable.tsx), [`EditOrderModal.tsx`](./EditOrderModal.tsx), [`PaymentModal.tsx`](./PaymentModal.tsx), [`ClientHistoryModal.tsx`](./ClientHistoryModal.tsx)
  - [`DesignStageCard.tsx`](./DesignStageCard.tsx), [`RepairPanel.tsx`](./RepairPanel.tsx), [`ManufacturePanel.tsx`](./ManufacturePanel.tsx)
  - [`PieceSelect.tsx`](./PieceSelect.tsx) (`STANDARD_PIECES`, `PieceSelect`), [`RingSizeInput.tsx`](./RingSizeInput.tsx) (default `RingSizeInput`), [`SelectWithOther.tsx`](./SelectWithOther.tsx) (`SelectWithOther`)

## Invariants
- **Critical Apple AirPrint guarantees (`LabelPrintModal.tsx`)**:
  - NEVER call `window.print()` on the LuxuryOS page on iPad/iPhone (`isAppleMobileDevice()`).
  - Always render the label off-screen with `html2canvas` and generate a **`62 mm`** wide PDF via `jsPDF` (`format: [62, pageHeightMm]`).
  - Omit auto-printing in `useEffect` whenever `isAppleMobileDevice()` is true (`if (!isOpen || !order || isAppleMobileDevice()) return;`), and never replace the flow with CSS `@page` or `window.location.assign()`.
  - On **iPad**, execute `window.open('', '_blank')` synchronously from the **Imprimir** button click handler before awaiting PDF generation.
  - On **iPhone** (`isIphoneDevice()`), pre-generate the `62 mm` `File` (`buildIphonePdfFile`) and invoke `navigator.share({ files: [pdfFile] })` on **Imprimir** (falling back to blob download if Web Share with files is unsupported).
  - Preserve hidden-`iframe` printing on desktop Windows/Chrome.
- **Honest WhatsApp delivery indicators (`ClientWhatsAppModal.tsx`)**:
  - Map status via `getDeliveryIndicator(status, providerMessageId)`: `'DELIVERED'` -> `done_all`, `'SENT'` -> `done`, `'ACCEPTED'` -> `schedule`, `'FAILED'` / `'LOGGED'` -> red `error`, `'WA_LINK'` -> `open_in_new`.
  - Expose **"Reenviar mensaje de alta de la orden"** (`OrdersService.resendCreationWhatsApp(orderId)`) only when `orderId` is provided and phone digits are valid.
- **Role/cost visibility (`EditOrderModal.tsx`, `OrdersTable.tsx`)**: Hide cost fields from `JOYERO`/`VENDEDOR` roles and restrict manual `DELIVERED` transitions for counter staff (`OrdersTable` enforces QR delivery).

## Side Effects
- Browser hardware/APIs: `navigator.mediaDevices.getUserMedia` (`CameraCaptureModal`, `QRScannerModal`), `navigator.share` / `URL.createObjectURL` / hidden print `iframe` (`LabelPrintModal`), Socket.IO polling (`ClientWhatsAppModal`).
- HTTP calls to `/settings`, `/kanban/orders*`, and `/chat/whatsapp/*` endpoints.

## Verification
- Run: `npm --prefix web test` (specifically enforces `tests/label-print-airprint.test.cjs` and UI source guard suites)
- Before publishing label edits, also run: `$env:VITE_API_URL='https://luxury-api.pitayacode.io'; npm --prefix web run build`

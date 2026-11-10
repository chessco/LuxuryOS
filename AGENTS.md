# Reglas y Arquitectura de LuxuryOS

## Notificaciones de WhatsApp y Códigos QR

### 1. Extracción y Limpieza de URLs de Imagen (`cleanContent`)
- **Regla Crítica:** En el proveedor de WhatsApp (`api/src/queue/providers/whatsapp.provider.ts`), las URLs de imágenes/códigos QR (`api.qrserver.com`, etc.) **NUNCA** deben permanecer en el texto del mensaje (`content`).
- **Comportamiento requerido:**
  - Extraer la URL de la imagen: `const imageUrl = imgMatch ? imgMatch[0] : undefined;`
  - Limpiar el texto:
    ```typescript
    const cleanContent = imageUrl
      ? content.replace(imageUrl, '').replace(/\n{3,}/g, '\n\n').trim()
      : content;
    ```
  - Enviar `cleanContent` como caption y `imageUrl` / `mediaUrl` en el payload.
- **Razón (Evitar regresión commit 487d53c):** Si la URL de la imagen se deja en el cuerpo del mensaje, WhatsApp no la envía como imagen multimedia nativa, sino que genera una tarjeta de enlace/previsualización web de texto.

### 2. Contenido del Código QR
- El código QR en las órdenes (`api/src/orders/orders.service.ts`) debe codificar directamente la URL pública de seguimiento (`trackingUrl` o `https://track.luxuryos.com/track/{trackingNumber}`).
- De esta manera, cualquier cliente o empleado que escanee el QR con la cámara de su teléfono es redirigido de inmediato a la pantalla de seguimiento en vivo de la orden.

### 3. Servicio Gateway de WhatsApp (`pitayacore-api` en Hetzner)
- El endpoint `/api/whatsapp/send` en `pitayacore-api` debe soportar `body.imageUrl` / `body.mediaUrl` llamando a `this.whatsappProvider.sendMedia(...)`.
- **Bug de WhatsApp Web / `whatsapp-web.js`:** En `whatsapp-web.js@1.34.7` (en `src/util/Injected/Utils.js`), se debe asegurar que se elimine `delete message.__x_id;` antes de instanciar el modelo del mensaje, de lo contrario WhatsApp Web falla con el error interno:
  `"Data passed to getter must include an id property (it's how we memoize) but got undefined"`.

## Formularios de órdenes: fotografía y asignación

### 4. Fotografía de la pieza (Chrome, iPhone e iPad)
- En `web/src/pages/Orders.tsx`, cada pieza debe conservar **dos acciones visibles**:
  - **Cámara**: abre `CameraCaptureModal` en Chrome/escritorio y el selector nativo con `capture="environment"` en iPhone/iPad.
  - **Subir archivo**: abre un segundo `<input type="file" accept="image/*">` sin `capture`, para elegir una imagen existente.
- No ocultar el input de galería sin un botón que lo active. La etiqueta “Cámara o archivo” debe corresponder a controles funcionales.
- Ambos caminos deben comprimir la imagen con `compressImageFile`, guardar `imageUrl` en la pieza y mostrar la previsualización; la validación de alta debe rechazar una pieza sin fotografía.
- Antes de desplegar, comprobar en Chrome de escritorio, Safari iPhone y Safari iPad: abrir cámara, seleccionar archivo, cancelar el selector y reemplazar/eliminar la previsualización.

### 5. Joyero obligatorio en órdenes de taller
- Reparación, Fabricación y Láser requieren `assignedTo`/`assignedJeweler` antes de crear la orden.
- La validación debe existir en `NewOrderDrawer` y en `api/src/orders/orders.service.ts`; nunca depender sólo del frontend.
- Al pulsar guardar sin Joyero, mostrar un mensaje visible y desplazar/enfocar el campo `assigned-jeweler`; no dejar el botón sin respuesta.
- Diseño mantiene su flujo separado de asignación de diseñador y las ventas no requieren Joyero.

## Impresión de etiquetas Brother QL-810W en iPad

### Regla crítica de AirPrint
- No alterar el flujo Apple/AirPrint de `web/src/components/orders/LabelPrintModal.tsx` sin autorización explícita del usuario.
- En iPad/iPhone está prohibido imprimir la página de LuxuryOS mediante `window.print()`.
- La etiqueta debe renderizarse con `html2canvas` y generarse como PDF con `jsPDF`.
- El PDF debe medir exactamente 62 mm de ancho y conservar escala de impresión de 100%.
- `window.open()` debe ejecutarse directamente desde el botón **Imprimir**, dentro del gesto del usuario.
- La impresión automática del `useEffect` debe omitirse en dispositivos Apple móviles.
- No sustituir este flujo por CSS `@page`, un portal HTML o `window.location.assign()`.
- El flujo de Windows/Chrome mediante iframe debe conservarse.

### Verificación obligatoria
Antes de aceptar o publicar cambios relacionados con etiquetas, ejecutar desde `web`:

```bash
npm test
npm run build
```

La prueba `web/tests/label-print-airprint.test.cjs` debe continuar pasando. Si una tarea exige cambiar cualquiera de estas garantías, el agente debe detenerse y solicitar autorización explícita.

## Documento de inicio del POS de revendedores

Para cualquier tarea relacionada con el POS de revendedores, leer también:

`docs/RESELLER_POS_AGENT_START.md`

Ese documento define la arquitectura, límites de datos, estructura objetivo, fases del MVP y criterios de aceptación del nuevo módulo.

## Conservación del stack de LuxuryOS

Todo desarrollo nuevo debe mantener el stack existente: NestJS + TypeScript + Prisma + MySQL 8 en backend, y Vite + React + TypeScript en frontend. Next.js pertenece al proyecto externo ProBuyer, no a LuxuryOS. No introducir Next.js, otro framework backend, PostgreSQL ni plataformas comerciales externas para módulos de LuxuryOS sin autorización explícita.

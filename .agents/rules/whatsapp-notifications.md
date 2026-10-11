# Regla: Envío de Imágenes y QR en Notificaciones de WhatsApp

## Contexto y Riesgo de Regresión
En WhatsApp, si una URL de imagen permanece dentro del cuerpo del texto, la plataforma genera una tarjeta de enlace web simple (previsualización de texto) en lugar de enviar la imagen como una foto multimedia nativa con su caption.

## Reglas Obligatorias:
1. **Limpieza de URL en Mensajes (`cleanContent`):**
   - En `api/src/queue/providers/whatsapp.provider.ts`, toda URL de imagen detectada con `imgMatch` debe ser eliminada del texto del mensaje antes de enviarlo:
     ```typescript
     const imageUrl = imgMatch ? imgMatch[0] : undefined;
     const cleanContent = imageUrl
       ? content.replace(imageUrl, '').replace(/\n{3,}/g, '\n\n').trim()
       : content;
     ```
   - La URL debe viajar únicamente en los campos `imageUrl` y `mediaUrl` del payload hacia el gateway de WhatsApp.
   - **NUNCA** eliminar la limpieza de `content` (regresión ocurrida en el commit `487d53c`).

2. **Codificación de Códigos QR:**
   - Todo código QR generado para órdenes debe codificar la URL de seguimiento web (`track.luxuryos.com/...`) para permitir escaneo directo desde la cámara del smartphone.

3. **Gateway PitayaCore WhatsApp (`pitayacore-api`):**
   - Si `body.imageUrl` o `body.mediaUrl` está presente, se debe invocar `sendMedia()` con el `caption: body.content`.
   - Recordar que en `whatsapp-web.js@1.34.7`, en `Utils.js` se requiere `delete message.__x_id;` para evitar el error de memoización de WhatsApp Web.

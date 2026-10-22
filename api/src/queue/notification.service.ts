import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IWhatsAppProvider,
  FlowWhatsAppProvider,
  PitayaCoreWhatsAppProvider,
} from './providers/whatsapp.provider';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private settingsService: SettingsService,
  ) {}

  private formatPhoneNumber(phone: string): string {
    if (!phone) return phone;
    // Limpiamos cualquier espacio o guión
    const cleaned = phone.replace(/\D/g, '');
    // Si tiene exactamente 10 dígitos, asumimos que es de México y agregamos el 52
    if (cleaned.length === 10) {
      return `52${cleaned}`;
    }
    return cleaned;
  }

  async notifyTicketCreated(
    tenantId: string,
    ticketId: string,
    phone: string,
    name: string,
    code: string,
    qrToken: string,
  ) {
    const atelierName = await this.settingsService.getSetting(
      tenantId,
      'business_name',
      'CARED',
    );
    const trackingUrl = `https://luxuryos.pitayacode.io/q/${qrToken}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(trackingUrl)}`;

    const message = `👋 ¡Hola ${name}!

Tu turno en *${atelierName}* es: *${code}*

🌐 *Ver seguimiento de tu turno en tiempo real:*
${trackingUrl}

${qrImageUrl}

Te notificaremos cuando sea tu momento de pasar. ✨`;

    return this.sendCustomMessage(tenantId, phone, message);
  }

  async notifyNearTurn(
    tenantId: string,
    ticketId: string,
    phone: string,
    name: string,
  ) {
    const atelierName = await this.settingsService.getSetting(
      tenantId,
      'business_name',
      'CARED',
    );
    const message = `👋 ¡Hola ${name}!

Tu turno en *${atelierName}* está muy cerca de ser llamado. Por favor acércate al mostrador. ✨`;

    return this.sendCustomMessage(tenantId, phone, message);
  }

  async notifyNowTurn(
    tenantId: string,
    ticketId: string,
    phone: string,
    name: string,
    code: string,
  ) {
    const atelierName = await this.settingsService.getSetting(
      tenantId,
      'business_name',
      'CARED',
    );
    const message = `🔔 ¡Es tu turno, ${name}!

Turno: *${code}*

Por favor pasa al módulo de atención en *${atelierName}*. ✨`;

    return this.sendCustomMessage(tenantId, phone, message);
  }

  async sendCustomMessage(
    tenantId: string,
    recipient: string,
    content: string,
  ): Promise<{ success: boolean; url?: string }> {
    recipient = this.formatPhoneNumber(recipient);
    if (!recipient) return { success: false };

    // Dynamic Provider Check — default to PITAYACORE
    const providerType = await this.settingsService.getSetting(
      tenantId,
      'whatsapp_provider',
      'PITAYACORE',
    );

    if (providerType === 'LINKS') {
      const encodedText = encodeURIComponent(content);
      const whatsappUrl = `https://wa.me/${recipient}?text=${encodedText}`;
      console.log(
        `[WhatsApp Links Provider] Generated WA Link for ${recipient}: ${whatsappUrl}`,
      );

      const dedupeKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await this.prisma.notificationLog
        .create({
          data: {
            tenantId,
            ticketId: null as any,
            channel: 'WHATSAPP',
            templateKey: 'CUSTOM_TEXT',
            messageContent: content,
            to: recipient,
            dedupeKey,
            providerMessageId: 'WA_LINK',
            status: 'SENT',
          },
        })
        .catch((err) => console.error('Failed to log notification', err));

      return { success: true, url: whatsappUrl };
    }

    let provider: IWhatsAppProvider | null = null;

    if (providerType === 'PITAYACORE') {
      const pitayaUrl = await this.settingsService.getSetting(
        tenantId,
        'pitayacore_api_url',
        'https://pitayacore-api.pitayacode.io/api',
      );
      const pitayaKey = await this.settingsService.getSetting(
        tenantId,
        'pitayacore_api_key',
        'pitaya_internal_secret_2026',
      );
      const pitayaTenant = await this.settingsService.getSetting(
        tenantId,
        'pitayacore_tenant_id',
        '87e0dd95-fd29-4e63-a219-18478c58e4c8',
      );

      provider = new PitayaCoreWhatsAppProvider(
        pitayaUrl,
        pitayaKey,
        pitayaTenant,
      );
    } else if (providerType === 'FLOW') {
      const flowUrl = await this.settingsService.getSetting(
        tenantId,
        'flow_api_url',
        'https://flow-api.pitayacode.io',
      );
      const flowKey = await this.settingsService.getSetting(
        tenantId,
        'flow_internal_key',
        'pitaya_internal_secret_2026',
      );

      provider = new FlowWhatsAppProvider(flowUrl, flowKey);
    }

    // Flow solo se usa si alguien lo selecciona manualmente en Configuración (FLOW).
    // Un proveedor desconocido no debe caer a Flow por defecto.
    if (!provider) {
      console.warn(
        `[WhatsApp] Proveedor desconocido "${providerType}"; no se envía el mensaje`,
      );
    }

    let messageId: string | null = null;
    try {
      messageId = provider
        ? await provider.sendMessage({
            recipient,
            template: 'free_text',
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: content }],
              },
            ],
          })
        : null;
    } catch (err) {
      console.error('[WhatsApp Send Error]', err);
    }

    // Sin fallback a otro proveedor: Flow envía desde otro número de WhatsApp y el
    // cliente recibiría el mensaje del número equivocado. Si falla, queda como LOGGED.
    if (!messageId) {
      console.warn(
        `[WhatsApp ${providerType}] No se pudo enviar a ${recipient}; el mensaje queda como LOGGED`,
      );
    }

    // Always log message to NotificationLog table for chat history
    const dedupeKey = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await this.prisma.notificationLog
      .create({
        data: {
          tenantId,
          ticketId: null as any,
          channel: 'WHATSAPP',
          templateKey: 'CUSTOM_TEXT',
          messageContent: content,
          to: recipient,
          dedupeKey,
          providerMessageId: (messageId || 'SENT').substring(0, 180),
          status: messageId ? 'SENT' : 'LOGGED',
        },
      })
      .catch((err) => console.error('Failed to log notification', err));

    return { success: !!messageId };
  }

  /**
   * Estado de la conexión de WhatsApp según el último envío: si el más reciente
   * (últimas 24 h) quedó como LOGGED, el canal está caído y se avisa en la campanita.
   */
  async getWhatsAppHealth(tenantId: string): Promise<{
    connected: boolean;
    failedCount: number;
    lastFailureAt: Date | null;
  }> {
    const providerType = await this.settingsService.getSetting(
      tenantId,
      'whatsapp_provider',
      'PITAYACORE',
    );
    // LINKS solo genera enlaces wa.me, no depende de una sesión conectada.
    if (providerType === 'LINKS') {
      return { connected: true, failedCount: 0, lastFailureAt: null };
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = { tenantId, channel: 'WHATSAPP', createdAt: { gte: since } };

    const last = await this.prisma.notificationLog.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });
    if (!last || last.status !== 'LOGGED') {
      return { connected: true, failedCount: 0, lastFailureAt: null };
    }

    const [failedCount, lastFailure] = await Promise.all([
      this.prisma.notificationLog.count({
        where: { ...where, status: 'LOGGED' },
      }),
      this.prisma.notificationLog.findFirst({
        where: { ...where, status: 'LOGGED' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      connected: false,
      failedCount,
      lastFailureAt: lastFailure?.createdAt ?? null,
    };
  }
}

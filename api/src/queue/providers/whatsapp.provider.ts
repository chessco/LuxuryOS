export interface WhatsAppOptions {
    recipient: string;
    template: string;
    components: any[];
}

export interface IWhatsAppProvider {
    sendMessage(options: WhatsAppOptions): Promise<string | null>;
}

export class MetaWhatsAppProvider implements IWhatsAppProvider {
    private apiUrl: string;
    private accessToken: string;
    private phoneNumberId: string;

    constructor(phoneNumberId: string, accessToken: string) {
        this.apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        this.accessToken = accessToken;
        this.phoneNumberId = phoneNumberId;
    }

    async sendMessage(options: WhatsAppOptions): Promise<string | null> {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: options.recipient,
                    type: 'template',
                    template: {
                        name: options.template,
                        language: { code: 'es_MX' }, // or from config
                        components: options.components,
                    },
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                console.error('[Meta WhatsApp] Error sending message:', data);
                return null;
            }

            return data.messages?.[0]?.id || 'SUCCESS';
        } catch (error) {
            console.error('[Meta WhatsApp] Exception:', error);
            return null;
        }
    }
}

export class FlowWhatsAppProvider implements IWhatsAppProvider {
    constructor(private apiUrl: string, private apiKey: string) {}

    async sendMessage(options: WhatsAppOptions): Promise<string | null> {
        // Map templates to human readable messages for Flow
        let content = '';
        if (options.template.includes('now')) {
            const name = options.components[0]?.parameters[0]?.text || 'Cliente';
            const code = options.components[0]?.parameters[1]?.text || '---';
            content = `🔔 ¡Hola ${name}! Es tu turno. Por favor, acércate a la ventanilla con tu código: *${code}*. ¡Te esperamos! ✨`;
        } else if (options.template.includes('near')) {
            const name = options.components[0]?.parameters[0]?.text || 'Cliente';
            content = `📢 ¡Hola ${name}! Tu turno está cerca. Por favor, mantente atento, serás llamado en unos momentos. 🙏`;
        } else {
            content = `Aviso de Turno: ${options.template}`;
        }

        try {
            const response = await fetch(`${this.apiUrl}/whatsapp/internal/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: 'edd1ac37-5ff9-4e46-bc7f-fff3c414d718', // Default Flow Tenant
                    to: options.recipient,
                    content: content,
                    key: this.apiKey
                })
            });

            const data = await response.json();
            return data.providerId || 'SUCCESS';
        } catch (error) {
            console.error('[Flow WhatsApp] Exception:', error);
            return null;
        }
    }
}

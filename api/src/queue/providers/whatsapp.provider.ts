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
        if (options.template === 'free_text') {
            content = options.components[0]?.parameters[0]?.text || '';
        } else if (options.template.includes('now')) {
            const name = options.components[0]?.parameters[0]?.text || 'Cliente';
            const code = options.components[0]?.parameters[1]?.text || '---';
            content = `🔔 ¡Hola ${name}! Es tu turno. Por favor, acércate al mostrador con tu código: *${code}*. ¡Te esperamos! ✨`;
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

export class PitayaCoreWhatsAppProvider implements IWhatsAppProvider {
    constructor(
        private apiUrl: string,
        private apiKey: string,
        private tenantId: string
    ) {}

    async sendMessage(options: WhatsAppOptions): Promise<string | null> {
        let content = '';
        if (options.template === 'free_text') {
            content = options.components[0]?.parameters[0]?.text || '';
        } else if (options.template.includes('now')) {
            const name = options.components[0]?.parameters[0]?.text || 'Cliente';
            const code = options.components[0]?.parameters[1]?.text || '---';
            content = `🔔 ¡Hola ${name}! Es tu turno. Por favor, acércate al mostrador con tu código: *${code}*. ¡Te esperamos! ✨`;
        } else if (options.template.includes('near')) {
            const name = options.components[0]?.parameters[0]?.text || 'Cliente';
            content = `📢 ¡Hola ${name}! Tu turno está cerca. Por favor, mantente atento, serás llamado en unos momentos. 🙏`;
        } else {
            content = `Aviso de Turno: ${options.template}`;
        }

        let rawDigits = (options.recipient || '').replace(/\D/g, '');
        let recipient = rawDigits;
        if (rawDigits.length === 10) {
            recipient = `521${rawDigits}`;
        } else if (rawDigits.length === 12 && rawDigits.startsWith('52') && !rawDigits.startsWith('521')) {
            recipient = `521${rawDigits.substring(2)}`;
        }

        let baseUrl = (this.apiUrl || 'https://pitayacore-api.pitayacode.io/api').replace(/\/+$/, '');
        let targetUrl = baseUrl.endsWith('/api') ? `${baseUrl}/whatsapp/send` : `${baseUrl}/api/whatsapp/send`;

        console.log(`[PitayaCore WA] Requesting ${targetUrl} for ${recipient}`);

        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey || 'pitaya_internal_secret_2026',
                    'x-tenant-id': this.tenantId || '87e0dd95-fd29-4e63-a219-18478c58e4c8'
                },
                body: JSON.stringify({
                    to: recipient,
                    content: content
                })
            });

            const text = await response.text();
            console.log(`[PitayaCore WA] Response status ${response.status}:`, text);

            let data: any = {};
            try { data = JSON.parse(text); } catch(e){}

            // Retry with 52 if 521 fails, or vice versa
            if (!response.ok || data.success === false) {
                const altRecipient = recipient.startsWith('521')
                    ? `52${recipient.substring(3)}`
                    : `521${recipient.replace(/^52/, '')}`;

                console.log(`[PitayaCore WA Retry] Primary failed (${data.error || 'error'}), retrying with ${altRecipient}...`);

                const retryResponse = await fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey || 'pitaya_internal_secret_2026',
                        'x-tenant-id': this.tenantId || '87e0dd95-fd29-4e63-a219-18478c58e4c8'
                    },
                    body: JSON.stringify({
                        to: altRecipient,
                        content: content
                    })
                });

                const retryText = await retryResponse.text();
                console.log(`[PitayaCore WA Retry] Response status ${retryResponse.status}:`, retryText);
                try { data = JSON.parse(retryText); } catch(e){}

                if (!retryResponse.ok || data.success === false) {
                    return null;
                }
            }

            return data.id || data.providerId || data.messageId || 'SUCCESS';
        } catch (error) {
            console.error('[PitayaCore WA] Exception:', error);
            return null;
        }
    }
}

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

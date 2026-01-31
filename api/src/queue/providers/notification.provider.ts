export interface NotificationOptions {
    recipient: string;
    template: string;
    data: Record<string, any>;
}

export interface INotificationProvider {
    send(options: NotificationOptions): Promise<boolean>;
}

export class MockWhatsAppProvider implements INotificationProvider {
    async send(options: NotificationOptions): Promise<boolean> {
        console.log(`[Mock WhatsApp] Sending ${options.template} to ${options.recipient}`, options.data);
        return true;
    }
}

export class MockEmailProvider implements INotificationProvider {
    async send(options: NotificationOptions): Promise<boolean> {
        console.log(`[Mock Email] Sending ${options.template} to ${options.recipient}`, options.data);
        return true;
    }
}

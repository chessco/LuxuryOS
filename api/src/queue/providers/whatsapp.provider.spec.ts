import { PitayaCoreWhatsAppProvider } from './whatsapp.provider';

const QR_URL =
  'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://track.luxuryos.com/track/LX-001';

describe('PitayaCoreWhatsAppProvider', () => {
  let fetchMock: jest.Mock;
  let provider: PitayaCoreWhatsAppProvider;

  const okResponse = (body: any = { success: true, id: 'msg-1' }) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  });

  const sentPayload = (call = 0) =>
    JSON.parse(fetchMock.mock.calls[call][1].body);

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue(okResponse());
    (global as any).fetch = fetchMock;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    provider = new PitayaCoreWhatsAppProvider(
      'https://core.example.com/api',
      'key',
      'tenant',
    );
  });

  afterEach(() => jest.restoreAllMocks());

  const send = (text: string, recipient = '5512345678') =>
    provider.sendMessage({
      recipient,
      template: 'free_text',
      components: [{ parameters: [{ text }] }],
    });

  it('quita la URL del QR del texto y la envia como imageUrl/mediaUrl', async () => {
    const result = await send(
      `Tu orden esta lista\n\n\n\n${QR_URL}\n\nGracias`,
    );

    expect(result).toBe('msg-1');
    const payload = sentPayload();
    expect(payload.imageUrl).toBe(QR_URL);
    expect(payload.mediaUrl).toBe(QR_URL);
    expect(payload.content).not.toContain('qrserver.com');
    expect(payload.content).not.toMatch(/\n{3,}/);
    expect(payload.content).toContain('Tu orden esta lista');
  });

  it('no agrega imageUrl cuando el mensaje no trae imagen', async () => {
    await send('Hola, tu pieza esta en proceso');

    const payload = sentPayload();
    expect(payload.content).toBe('Hola, tu pieza esta en proceso');
    expect(payload.imageUrl).toBeUndefined();
    expect(payload.mediaUrl).toBeUndefined();
  });

  it('normaliza numeros de 10 digitos a 521 y usa /api/whatsapp/send', async () => {
    await send('hola', '55 1234 5678');

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://core.example.com/api/whatsapp/send',
    );
    expect(sentPayload().to).toBe('5215512345678');
  });

  it('reintenta con el prefijo alterno conservando la imagen limpia', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({ success: false, error: 'bad number' }),
      })
      .mockResolvedValueOnce(okResponse());

    const result = await send(`Hola\n${QR_URL}`);

    expect(result).toBe('msg-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentPayload(0).to).toBe('5215512345678');
    expect(sentPayload(1).to).toBe('525512345678');
    expect(sentPayload(1).imageUrl).toBe(QR_URL);
    expect(sentPayload(1).content).not.toContain('qrserver.com');
  });

  it('devuelve null si ambos intentos fallan', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ success: false }),
    });

    expect(await send('Hola')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

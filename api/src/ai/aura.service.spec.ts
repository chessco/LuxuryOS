import { AuraService } from './aura.service';
import { verifyAuraToken } from './aura-token';

const SECRET = 'test-secret-test-secret-test-secret-123';
const admin = {
  tenantId: 'tenant-1',
  userId: 'u1',
  role: 'TENANT_ADMIN',
  email: 'admin@cared.test',
};
const vendedor = {
  tenantId: 'tenant-1',
  userId: 'u2',
  role: 'VENDEDOR',
  email: 'ventas@cared.test',
};

const toolDefs = [
  { name: 'buscar_orden', description: 'x', parameters: { type: 'object' } },
];

describe('AuraService', () => {
  const envBackup = { ...process.env };
  let fetchMock: jest.Mock;
  let chatBodies: any[];
  let chatResponses: any[];
  let service: AuraService;

  beforeEach(() => {
    process.env.PITAYACORE_API_KEY = 'fake-key-for-tests';
    process.env.PITAYACORE_API_URL = 'https://pitayacore.example.test/api';
    process.env.AURA_TOOLS_ENABLED = 'true';
    process.env.AURA_TOOLS_SECRET = SECRET;
    process.env.AURA_TOOLS_CALLBACK_URL =
      'https://luxury.example.test/ai/tools/execute';

    chatBodies = [];
    chatResponses = [{ content: 'Respuesta con datos', conversationId: 'c1' }];
    fetchMock = jest.fn(async (url: string, init?: any) => {
      if (String(url).endsWith('/agents/aura') && !init?.method) {
        return {
          ok: true,
          status: 200,
          text: async () => '{"id":"agent-1"}',
          json: async () => ({ id: 'agent-1' }),
        };
      }
      chatBodies.push(JSON.parse(init.body));
      const next =
        chatResponses.length > 1 ? chatResponses.shift() : chatResponses[0];
      return {
        ok: true,
        status: 201,
        text: async () => JSON.stringify(next),
        json: async () => next,
      };
    });
    (global as any).fetch = fetchMock;

    const settings: any = {
      getSetting: jest.fn(
        async (_t: string, _k: string, d?: string) => d || '',
      ),
    };
    const tools: any = {
      getDefinitions: jest.fn((ctx: any) =>
        ctx.role === 'TENANT_ADMIN' ? toolDefs : [],
      ),
    };
    service = new AuraService(settings, tools);
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('envía tools y un token firmado verificable cuando las herramientas están activas para un administrador', async () => {
    const result = await service.chat(admin, '¿Cómo va REP-54?');

    expect(result).toMatchObject({
      role: 'assistant',
      content: 'Respuesta con datos',
      conversationId: 'c1',
    });
    const body = chatBodies[0];
    expect(body.tools).toEqual(toolDefs);
    expect(body.toolCallback.url).toBe(
      'https://luxury.example.test/ai/tools/execute',
    );
    expect(verifyAuraToken(body.toolCallback.token, SECRET)).toMatchObject({
      tenantId: 'tenant-1',
      role: 'TENANT_ADMIN',
    });
  });

  it('no envía tools ni token a roles que no son administradores', async () => {
    await service.chat(vendedor, 'Hola');
    expect(chatBodies[0]).toEqual({ message: 'Hola' });
  });

  it('no envía tools si AURA_TOOLS_ENABLED no es true', async () => {
    process.env.AURA_TOOLS_ENABLED = 'false';
    await service.chat(admin, 'Hola');
    expect(chatBodies[0]).toEqual({ message: 'Hola' });
  });

  it('no envía tools si el secreto es demasiado corto', async () => {
    process.env.AURA_TOOLS_SECRET = 'corto';
    await service.chat(admin, 'Hola');
    expect(chatBodies[0]).toEqual({ message: 'Hola' });
  });

  it('reintenta sin tools cuando pitayacore devuelve el mensaje del usuario (no pudo usar las herramientas)', async () => {
    chatResponses = [
      { content: '¿Cómo va REP-54?' },
      {
        content: 'No tengo acceso a datos en tiempo real.',
        conversationId: 'c2',
      },
    ];

    const result = await service.chat(admin, '¿Cómo va REP-54?');

    expect(chatBodies).toHaveLength(2);
    expect(chatBodies[0].tools).toBeDefined();
    expect(chatBodies[1]).toEqual({ message: '¿Cómo va REP-54?' });
    expect(result.content).toBe('No tengo acceso a datos en tiempo real.');
  });

  it('no reintenta cuando la respuesta es normal', async () => {
    await service.chat(admin, 'Hola');
    expect(chatBodies).toHaveLength(1);
  });
});

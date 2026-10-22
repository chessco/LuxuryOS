import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';

describe('AuthService.validateUser', () => {
  const prisma: any = {
    user: { findFirst: jest.fn(), findMany: jest.fn() },
  };
  const service = new AuthService(prisma, {} as any);
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secreto123', 4);
  });

  beforeEach(() => jest.resetAllMocks());

  it('permite entrar con el nombre de usuario aunque no se parezca al email', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'joyero@cared.mx',
      username: 'juancarlos',
      passwordHash,
    });

    const result = await service.validateUser('  JuanCarlos ', 'secreto123');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { username: 'juancarlos' },
    });
    expect(result).toMatchObject({ id: 'u1', username: 'juancarlos' });
    expect(result.passwordHash).toBeUndefined();
  });

  it('con email completo busca por email', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u2',
      email: 'joyero@cared.mx',
      passwordHash,
    });

    await service.validateUser('joyero@cared.mx', 'secreto123');

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'joyero@cared.mx' },
    });
  });

  it('mantiene el acceso con el prefijo del email si no hay usuario con ese nombre', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u3', email: 'hugo@cared.mx', passwordHash },
    ]);

    const result = await service.validateUser('hugo', 'secreto123');

    expect(result).toMatchObject({ id: 'u3' });
  });

  it('rechaza una contraseña incorrecta', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      username: 'juancarlos',
      passwordHash,
    });

    expect(await service.validateUser('juancarlos', 'otra')).toBeNull();
  });
});

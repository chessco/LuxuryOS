import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { verifyAuraToken } from './aura-token';
import { AuraToolsService } from './aura-tools.service';

/**
 * Callback que pitayacore invoca cuando el LLM pide una herramienta. No usa JWT de usuario: se autentica
 * con el token firmado y de corta vida que LuxuryOS entregó en la petición de chat (lleva tenant y rol).
 */
@Controller('ai/tools')
export class AuraToolsController {
  constructor(private readonly tools: AuraToolsService) {}

  @Post('execute')
  @HttpCode(200)
  async execute(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { name?: string; arguments?: unknown },
  ) {
    const secret = process.env.AURA_TOOLS_SECRET || '';
    const token = (authorization || '').replace(/^Bearer\s+/i, '');
    const ctx = secret.length >= 32 ? verifyAuraToken(token, secret) : null;
    if (!ctx) throw new UnauthorizedException('Token inválido o vencido');

    const name = typeof body?.name === 'string' ? body.name : '';
    let args: Record<string, any> = {};
    if (typeof body?.arguments === 'string') {
      try {
        args = JSON.parse(body.arguments);
      } catch {
        return { result: { error: 'Argumentos inválidos.' } };
      }
    } else if (body?.arguments && typeof body.arguments === 'object') {
      args = body.arguments as Record<string, any>;
    }

    return { result: await this.tools.execute(ctx, name, args) };
  }
}

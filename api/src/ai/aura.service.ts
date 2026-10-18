import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';
import { AuraToolContext, signAuraToken } from './aura-token';
import { AuraToolsService } from './aura-tools.service';

export const AURA_AGENT_SLUG = 'aura';
export const AURA_AGENT_NAME = 'Asistente Aura';

const DEFAULT_PITAYACORE_URL = 'https://pitayacore-api.pitayacode.io/api';
// Tenant "Cared" en pitayacore (el mismo que usa el proveedor de WhatsApp)
const DEFAULT_PITAYACORE_TENANT = '87e0dd95-fd29-4e63-a219-18478c58e4c8';

const AURA_PROMPT = `Eres Aura, la asistente inteligente de Cared, un atelier de joyería de lujo que opera sobre LuxuryOS.
Ayudas al equipo (administradores, vendedores y joyeros) con la gestión del atelier: reparaciones, fabricación, diseño, láser, cotizaciones, apartados, clientes, ventas e inventario de gemas y metales.
Tono: elegante, cálido y profesional. Responde siempre en español, de forma clara y concisa.
Si dispones de herramientas de consulta, úsalas para obtener datos reales de órdenes, taller y ventas antes de responder.
Si no tienes datos reales para responder, dilo con honestidad y propón qué información se necesita; nunca inventes cifras, precios ni estados de órdenes.`;

const NO_TOOLS_NOTICE =
  'Nota del sistema: en este momento NO puedes consultar datos de LuxuryOS. Si la pregunta requiere datos de órdenes, taller, clientes o ventas, responde únicamente que no puedes consultarlos ahora y sugiere revisar la pantalla de Pedidos. Nunca inventes datos, nombres, fechas ni cifras.';

interface PitayaCoreConfig {
  baseUrl: string;
  apiKey: string;
  tenantId: string;
}

/**
 * Asistente Aura: todo el consumo de IA se canaliza por pitayacore, que enruta
 * al LLM (llm.pitayacode.io) identificando al agente como `pitayacore/aura`
 * para el control de consumo de tokens por agente y tenant.
 */
@Injectable()
export class AuraService {
  private readonly logger = new Logger(AuraService.name);
  private readonly provisioned = new Set<string>();

  constructor(
    private readonly settings: SettingsService,
    private readonly tools: AuraToolsService,
  ) {}

  private async getConfig(tenantId: string): Promise<PitayaCoreConfig> {
    const envUrl = process.env.PITAYACORE_API_URL || DEFAULT_PITAYACORE_URL;
    const [tenantUrl, tenantKey, pitayaTenant] = await Promise.all([
      this.settings.getSetting(tenantId, 'pitayacore_api_url', envUrl),
      this.settings.getSetting(tenantId, 'pitayacore_api_key'),
      this.settings.getSetting(
        tenantId,
        'pitayacore_tenant_id',
        DEFAULT_PITAYACORE_TENANT,
      ),
    ]);
    // La clave del entorno es compartida entre tenants: solo se envía al destino del entorno,
    // nunca a una URL que un tenant pueda haber configurado (evita exfiltrar la clave).
    const apiKey = tenantKey || process.env.PITAYACORE_API_KEY;
    const url = tenantKey ? tenantUrl : envUrl;
    if (!apiKey) {
      this.logger.error(
        'Falta pitayacore_api_key (setting) o PITAYACORE_API_KEY (env)',
      );
      throw new ServiceUnavailableException(
        'El asistente Aura no está configurado.',
      );
    }
    const trimmed = url.replace(/\/+$/, '');
    return {
      baseUrl: trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`,
      apiKey,
      tenantId: pitayaTenant,
    };
  }

  private headers(
    cfg: PitayaCoreConfig,
    operatorEmail?: string,
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': cfg.apiKey,
      'x-tenant-id': cfg.tenantId,
    };
    if (operatorEmail) headers['x-operator-email'] = operatorEmail;
    return headers;
  }

  /** Crea el agente Aura en el tenant Cared de pitayacore si todavía no existe. */
  private async ensureAgent(cfg: PitayaCoreConfig): Promise<void> {
    if (this.provisioned.has(cfg.tenantId)) return;
    try {
      const existing = await fetch(`${cfg.baseUrl}/agents/${AURA_AGENT_SLUG}`, {
        headers: this.headers(cfg),
      });
      const body = existing.ok ? await existing.text() : '';
      if (existing.ok && body && body !== 'null') {
        this.provisioned.add(cfg.tenantId);
        return;
      }
      const created = await fetch(`${cfg.baseUrl}/agents`, {
        method: 'POST',
        headers: this.headers(cfg),
        body: JSON.stringify({
          name: AURA_AGENT_NAME,
          slug: AURA_AGENT_SLUG,
          prompt: AURA_PROMPT,
        }),
      });
      if (created.ok) {
        this.provisioned.add(cfg.tenantId);
        this.logger.log(
          `Agente ${AURA_AGENT_SLUG} creado en pitayacore (tenant ${cfg.tenantId})`,
        );
      } else {
        this.logger.warn(
          `No se pudo crear el agente ${AURA_AGENT_SLUG}: HTTP ${created.status}`,
        );
      }
    } catch (error: any) {
      this.logger.warn(
        `No se pudo verificar el agente ${AURA_AGENT_SLUG}: ${error.message}`,
      );
    }
  }

  /**
   * Herramientas de consulta que Aura puede pedir (solo lectura). Se envían a pitayacore únicamente si
   * AURA_TOOLS_ENABLED=true y hay secreto de firma y URL de callback; si pitayacore aún no soporta
   * tools, ignora los campos extra y Aura responde como antes.
   */
  private buildToolsPayload(ctx: AuraToolContext) {
    if (process.env.AURA_TOOLS_ENABLED !== 'true') return {};
    const secret = process.env.AURA_TOOLS_SECRET || '';
    const url = process.env.AURA_TOOLS_CALLBACK_URL || '';
    if (secret.length < 32 || !url) {
      this.logger.warn(
        'AURA_TOOLS_ENABLED=true pero falta AURA_TOOLS_SECRET (mín. 32 caracteres) o AURA_TOOLS_CALLBACK_URL',
      );
      return {};
    }
    // Solo administradores reciben herramientas; para el resto no se envía nada (ni token)
    const tools = this.tools.getDefinitions(ctx);
    if (tools.length === 0) return {};
    return {
      tools,
      toolCallback: { url, token: signAuraToken(ctx, secret) },
    };
  }

  async chat(ctx: AuraToolContext, message: string) {
    const cfg = await this.getConfig(ctx.tenantId);
    await this.ensureAgent(cfg);

    const toolsPayload = this.buildToolsPayload(ctx);
    let data = await this.postChat(cfg, ctx, { message, ...toolsPayload });

    // Si pitayacore no puede enrutar con herramientas (p. ej. el host del callback no está en su allowlist),
    // devuelve el mensaje del usuario como respuesta. En ese caso se reintenta una vez sin herramientas.
    if (
      'tools' in toolsPayload &&
      String(data.content || '').trim() === message.trim()
    ) {
      this.logger.warn(
        'pitayacore no pudo usar las herramientas (¿TOOL_CALLBACK_HOSTS no incluye el host del callback?); reintentando sin ellas',
      );
      // Sin herramientas el LLM podría inventar datos: se le indica explícitamente que no puede consultarlos.
      data = await this.postChat(cfg, ctx, {
        message: `${NO_TOOLS_NOTICE}\n\nPregunta del usuario: ${message}`,
      });
    }

    return {
      role: 'assistant' as const,
      content: data.content || '',
      conversationId: data.conversationId,
    };
  }

  private async postChat(
    cfg: PitayaCoreConfig,
    ctx: AuraToolContext,
    body: Record<string, unknown>,
  ): Promise<any> {
    let response: Response;
    try {
      response = await fetch(`${cfg.baseUrl}/agents/${AURA_AGENT_SLUG}/chat`, {
        method: 'POST',
        headers: this.headers(cfg, ctx.email),
        body: JSON.stringify(body),
      });
    } catch (error: any) {
      this.logger.error(`pitayacore no disponible: ${error.message}`);
      throw new BadGatewayException(
        'El asistente Aura no está disponible en este momento.',
      );
    }

    if (!response.ok) {
      this.logger.error(
        `pitayacore respondió HTTP ${response.status}: ${await response.text()}`,
      );
      throw new BadGatewayException(
        'El asistente Aura no pudo responder. Intenta de nuevo.',
      );
    }

    return response.json().catch(() => ({}));
  }
}

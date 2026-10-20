/**
 * Utility for RF-03: Semáforo de fechas de entrega
 *
 * Rules:
 * Timezone: 'America/Hermosillo' (configurable per atelier)
 * REPAIR:
 *   - Verde: Más de 1 día para vencer (diffDays > 1)
 *   - Amarillo: Falta 1 día o menos (0 <= diffDays <= 1)
 *   - Rojo: Fecha vencida (diffDays < 0)
 *
 * MANUFACTURE / LASER / DESIGN:
 *   - Verde: Más de 2 días para vencer (diffDays > 2)
 *   - Amarillo: Faltan 2 días o menos (0 <= diffDays <= 2)
 *   - Rojo: Fecha vencida (diffDays < 0)
 *
 * Special rule:
 * El día de vencimiento permanecerá amarillo hasta finalizar la fecha comprometida (23:59:59);
 * después cambiará a rojo.
 *
 * Las órdenes entregadas o devueltas conservan historial de cumplimiento, pero dejan de
 * generar alertas operativas.
 */

export type TrafficLightColor = 'RED' | 'YELLOW' | 'GREEN' | 'NEUTRAL' | 'NONE';

export interface TrafficLightInfo {
    color: TrafficLightColor;
    diffDays: number | null;
    label: string;
    description: string;
    isOverdue: boolean;
    isDueToday: boolean;
    isCompleted: boolean;
    historicalCompliance?: 'ON_TIME' | 'LATE' | null;
}

export const ATELIER_TIMEZONE = 'America/Hermosillo';

/**
 * Parses any date-like string or Date object into a YYYY-MM-DD string in the given timezone.
 */
export function getDateStringInTimezone(dateInput: string | Date | null | undefined, timeZone = ATELIER_TIMEZONE): string | null {
    if (!dateInput) return null;
    try {
        let d: Date;
        if (typeof dateInput === 'string') {
            const trimmed = dateInput.trim();
            // If already YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                return trimmed;
            }
            // If DD/MM/YYYY
            const parts = trimmed.split('/');
            if (parts.length === 3) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                return `${year}-${month}-${day}`;
            }
            d = new Date(trimmed);
        } else {
            d = dateInput;
        }

        if (isNaN(d.getTime())) return null;

        return new Intl.DateTimeFormat('en-CA', {
            timeZone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(d);
    } catch {
        return null;
    }
}

/**
 * Calculates calendar day difference between target date and today in the given timezone.
 * Returns negative if target date is in the past, 0 if today, positive if in the future.
 */
export function getDiffCalendarDays(targetDateStr: string, timeZone = ATELIER_TIMEZONE): number | null {
    const todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());

    if (!targetDateStr) return null;

    const [tYear, tMonth, tDay] = targetDateStr.split('-').map(Number);
    const [nowYear, nowMonth, nowDay] = todayStr.split('-').map(Number);

    if (!tYear || !tMonth || !tDay) return null;

    const targetDate = new Date(Date.UTC(tYear, tMonth - 1, tDay));
    const todayDate = new Date(Date.UTC(nowYear, nowMonth - 1, nowDay));

    const diffMs = targetDate.getTime() - todayDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Computes the Traffic Light for an order.
 */
export function getTrafficLight(order: any, timeZone = ATELIER_TIMEZONE): TrafficLightInfo {
    const rawStatus = String(order?.status || order?.stage || '').toUpperCase();
    const isDelivered = rawStatus === 'DELIVERED' || rawStatus === 'ENTREGADO' || rawStatus === 'ENTREGADO_POSTVENTA';
    const isReturnedToClient = Boolean(order?.specifications?.isReturnedToClient || order?.specifications?.isReturnedNotDone);

    // Delivered or returned orders stop generating active operational alerts
    if (isDelivered || isReturnedToClient) {
        // Historical compliance check
        const promisedStr = getDateStringInTimezone(order?.promisedAt || order?.promisedDate, timeZone);
        const deliveredStr = getDateStringInTimezone(order?.deliveredAt || order?.updatedAt, timeZone);

        let compliance: 'ON_TIME' | 'LATE' | null = null;
        if (promisedStr && deliveredStr) {
            compliance = deliveredStr <= promisedStr ? 'ON_TIME' : 'LATE';
        }

        return {
            color: 'NEUTRAL',
            diffDays: null,
            label: isReturnedToClient ? 'Devuelto' : (compliance === 'ON_TIME' ? 'Cumplido a tiempo' : (compliance === 'LATE' ? 'Fuera de plazo' : 'Entregado')),
            description: isReturnedToClient ? 'Devuelto — No realizado' : 'Orden entregada (sin alerta activa)',
            isOverdue: false,
            isDueToday: false,
            isCompleted: true,
            historicalCompliance: compliance,
        };
    }

    const promisedStr = getDateStringInTimezone(order?.promisedAt || order?.promisedDate, timeZone);
    if (!promisedStr) {
        return {
            color: 'NONE',
            diffDays: null,
            label: 'Sin fecha',
            description: 'No tiene fecha de entrega comprometida',
            isOverdue: false,
            isDueToday: false,
            isCompleted: false,
        };
    }

    const diffDays = getDiffCalendarDays(promisedStr, timeZone);
    if (diffDays === null) {
        return {
            color: 'NONE',
            diffDays: null,
            label: 'Sin fecha',
            description: 'Fecha inválida',
            isOverdue: false,
            isDueToday: false,
            isCompleted: false,
        };
    }

    const orderType = String(order?.type || 'STANDARD').toUpperCase();
    const isRepair = orderType === 'REPAIR';

    const isDueToday = diffDays === 0;
    const isOverdue = diffDays < 0;

    let color: TrafficLightColor = 'GREEN';
    let label = '';
    let description = '';

    if (isOverdue) {
        color = 'RED';
        const pastDays = Math.abs(diffDays);
        label = `Vencido (${pastDays}d)`;
        description = pastDays === 1 ? 'Venció ayer' : `Vencido hace ${pastDays} días`;
    } else if (isDueToday) {
        color = 'YELLOW';
        label = 'Vence Hoy';
        description = 'Último día de entrega comprometida';
    } else {
        // Future days
        if (isRepair) {
            // REPAIR: > 1 día -> Verde, <= 1 día -> Amarillo
            if (diffDays <= 1) {
                color = 'YELLOW';
                label = 'Vence Mañana';
                description = 'Falta 1 día para vencer';
            } else {
                color = 'GREEN';
                label = `En tiempo (${diffDays}d)`;
                description = `Faltan ${diffDays} días`;
            }
        } else {
            // MANUFACTURE, LASER, DESIGN: > 2 días -> Verde, <= 2 días -> Amarillo
            if (diffDays <= 2) {
                color = 'YELLOW';
                label = diffDays === 1 ? 'Vence Mañana' : 'Vence en 2d';
                description = `Faltan ${diffDays} días para vencer`;
            } else {
                color = 'GREEN';
                label = `En tiempo (${diffDays}d)`;
                description = `Faltan ${diffDays} días`;
            }
        }
    }

    return {
        color,
        diffDays,
        label,
        description,
        isOverdue,
        isDueToday,
        isCompleted: false,
    };
}

/**
 * Returns an integer score representing operational urgency:
 * 0: RED (Overdue - highest urgency)
 * 1: YELLOW (Expiring soon)
 * 2: GREEN (On time)
 * 3: NONE / NEUTRAL (Completed or unscheduled)
 */
export function getUrgencyScore(order: any, timeZone = ATELIER_TIMEZONE): number {
    const info = getTrafficLight(order, timeZone);
    if (info.color === 'RED') {
        // Within RED, earlier overdue dates (more negative diffDays) come first
        return (info.diffDays ?? -1); // e.g. -5 is smaller than -1
    }
    if (info.color === 'YELLOW') {
        return 100 + (info.diffDays ?? 0); // 100, 101, 102
    }
    if (info.color === 'GREEN') {
        return 200 + (info.diffDays ?? 10);
    }
    return 1000;
}

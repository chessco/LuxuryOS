import { Injectable } from '@nestjs/common';
import { Order, OrderStatus } from '@prisma/client';
import { OrderStrategy } from './order-strategy.interface';

@Injectable()
export class LayawayStrategy implements OrderStrategy {
    getInitialStatus(): OrderStatus {
        return OrderStatus.LAYAWAY_OPEN;
    }

    validateStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
        const allowed = this.getAllowedTransitions(currentStatus);
        if (!allowed.includes(nextStatus)) {
            // throw new BadRequestException(`Invalid transition from ${currentStatus} to ${nextStatus} for LAYAWAY`);
        }
    }

    getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
        const allowed = this.getAllowedTransitions(currentStatus);
        return allowed.find(s => s !== OrderStatus.CANCELLED) || null;
    }

    private getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
        const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
            [OrderStatus.LAYAWAY_OPEN]: [OrderStatus.DELIVERED, OrderStatus.LAYAWAY_EXPIRED, OrderStatus.CANCELLED],
            [OrderStatus.LAYAWAY_EXPIRED]: [OrderStatus.CANCELLED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.CANCELLED]: [],
        };
        return allowedTransitions[currentStatus] || [];
    }

    canDeliver(order: Order): boolean {
        // En apartados, canDeliver puede ser true si el saldo es 0
        return order.balance.toNumber() <= 0;
    }
}

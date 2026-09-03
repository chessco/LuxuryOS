import { Injectable } from '@nestjs/common';
import { Order, OrderStatus } from '@prisma/client';
import { OrderStrategy } from './order-strategy.interface';

@Injectable()
export class ManufactureStrategy implements OrderStrategy {
    getInitialStatus(): OrderStatus {
        return OrderStatus.RECEIVED;
    }

    validateStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
        const allowed = this.getAllowedTransitions(currentStatus);
        if (!allowed.includes(nextStatus)) {
            // throw new BadRequestException(`Invalid transition from ${currentStatus} to ${nextStatus} for MANUFACTURE`);
        }
    }

    getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
        const allowed = this.getAllowedTransitions(currentStatus);
        return allowed.find(s => s !== OrderStatus.CANCELLED) || null;
    }

    private getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
        const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
            [OrderStatus.RECEIVED]: [OrderStatus.IN_PRODUCTION, OrderStatus.SPEC_PENDING, OrderStatus.CANCELLED],
            [OrderStatus.SPEC_PENDING]: [OrderStatus.MATERIALS_PENDING, OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
            [OrderStatus.MATERIALS_PENDING]: [OrderStatus.IN_PRODUCTION, OrderStatus.CANCELLED],
            [OrderStatus.IN_PRODUCTION]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.QUALITY_CHECK],
            [OrderStatus.QUALITY_CHECK]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.IN_PRODUCTION],
            [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.DELIVERED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.CANCELLED]: [],
            [OrderStatus.DRAFT]: [OrderStatus.RECEIVED, OrderStatus.SPEC_PENDING],
        };
        return allowedTransitions[currentStatus] || [];
    }

    canDeliver(order: Order): boolean {
        return order.status === OrderStatus.READY_FOR_PICKUP;
    }
}

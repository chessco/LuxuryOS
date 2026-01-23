import { Injectable, BadRequestException } from '@nestjs/common';
import { Order, OrderStatus } from '@prisma/client';
import { OrderStrategy } from './order-strategy.interface';

@Injectable()
export class RepairStrategy implements OrderStrategy {
    getInitialStatus(): OrderStatus {
        return OrderStatus.RECEIVED;
    }

    validateStatusTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
        const allowed = this.getAllowedTransitions(currentStatus);
        if (!allowed.includes(nextStatus)) {
            // throw new BadRequestException(`Invalid transition from ${currentStatus} to ${nextStatus} for REPAIR`);
        }
    }

    getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
        const allowed = this.getAllowedTransitions(currentStatus);
        // Returns the first logical progress status (not CANCELLED)
        return allowed.find(s => s !== OrderStatus.CANCELLED) || null;
    }

    private getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
        const allowedTransitions: Partial<Record<OrderStatus, OrderStatus[]>> = {
            [OrderStatus.RECEIVED]: [OrderStatus.DIAGNOSIS_PENDING, OrderStatus.CANCELLED],
            [OrderStatus.DIAGNOSIS_PENDING]: [OrderStatus.QUOTE_SENT, OrderStatus.CANCELLED],
            [OrderStatus.QUOTE_SENT]: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
            [OrderStatus.APPROVED]: [OrderStatus.IN_REPAIR, OrderStatus.WAITING_PARTS],
            [OrderStatus.WAITING_PARTS]: [OrderStatus.IN_REPAIR],
            [OrderStatus.IN_REPAIR]: [OrderStatus.REPAIR_COMPLETED],
            [OrderStatus.REPAIR_COMPLETED]: [OrderStatus.DELIVERED],
            [OrderStatus.DELIVERED]: [],
            [OrderStatus.CANCELLED]: [],
            [OrderStatus.DRAFT]: [OrderStatus.RECEIVED],
        };
        return allowedTransitions[currentStatus] || [];
    }

    canDeliver(order: Order): boolean {
        // Example rule: Balance must be 0 (handled by core too, but strategy can enforce stricter rules)
        return true;
    }
}
